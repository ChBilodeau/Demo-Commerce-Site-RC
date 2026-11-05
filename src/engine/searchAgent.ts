/**
 * Client for the Coveo Search Agent API (Conversational Search).
 *
 * The agent streams its response as Server-Sent Events following the AG-UI
 * protocol. We POST the user's message and parse the `data:` lines, accumulating
 * TEXT_MESSAGE_CHUNK deltas into the answer and collecting citations.
 *
 * NOTE: the exact request URL/body shape is confirmed from a real call captured
 * in the hosted page's network tab. Adjust REQUEST_PATH / buildBody if needed.
 */

const ORG_ID = '__COVEO_ORG_ID__';
const AGENT_ID = '3257aaec-9058-45d8-9fd7-ec60c6769852';
const AGENT_TOKEN = import.meta.env.VITE_COVEO_AGENT_TOKEN as string | undefined;

const DEBUG = false;

// Agent endpoints. The FIRST question in a conversation goes to `/answer`;
// every FOLLOW-UP goes to the sibling `/follow-up` endpoint, which continues the
// same conversation (same threadId) when given the conversationId +
// conversationToken from the first turn. Posting a follow-up to `/answer`
// instead silently starts a brand-new conversation (no memory of prior turns).
// Ref: https://docs.coveo.com/en/p4ag0001/apis/search-agent-api
const AGENT_BASE = `https://${ORG_ID}.org.coveo.com/api/v1/organizations/${ORG_ID}/agents/${AGENT_ID}`;
const ANSWER_PATH = '/answer';
const FOLLOW_UP_PATH = '/follow-up';

// The agent is scoped to this searchHub. This selects the query pipeline
// server-side (the "CHBI - Commerce" hub → CHBI - Commerce pipeline).
const SEARCH_HUB = 'CHBI - Commerce';

// NOTE: the request `locale` does NOT control the Search Agent's answer
// language — tested live (locale 'en' vs 'de-DE' gave identical English answers
// for a German question). Answer language is governed by custom behaviors on
// the agent (Admin Console). See the "Multilingual answers" notes in TODO.md.
const LOCALE = 'en';

// Answer language is handled server-side by a custom behavior on the agent
// (Admin Console), not by any request parameter — the Search Agent API has no
// answer-language field. The behavior instructs the agent to reply in the same
// language as the user's question. See README / the agent configuration notes.

// Stable per-browser client id for analytics (the agent request requires an
// analytics block, matching the hosted page's call).
function getClientId(): string {
  const KEY = 'chbi-agent-client-id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '11111111-1111-1111-1111-111111111111';
  }
}

export interface Citation {
  id?: string;
  title: string;
  uri?: string;
  clickUri?: string;
  permanentid?: string;
  text?: string;
  source?: string;
  /** Populated from the `ec_images` field we request (see citationsFieldToInclude). */
  fields?: {
    ec_images?: string[];
    [key: string]: unknown;
  };
}

/** First product image URL for a citation, if we asked for `ec_images`. */
export function citationImage(c: Citation): string | undefined {
  const imgs = c.fields?.ec_images;
  return Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : undefined;
}

export interface AgentStreamHandlers {
  /** Called with the full accumulated answer text each time it grows. */
  onText: (fullText: string) => void;
  /** Called once when citations arrive. */
  onCitations?: (citations: Citation[]) => void;
  /** Called when the run finishes. `answered` reflects completionReason. */
  onDone: (answered: boolean) => void;
  /** Called on stream/transport error. */
  onError: (message: string) => void;
}

export interface ConversationState {
  conversationId?: string;
  conversationToken?: string;
  followUpEnabled?: boolean;
  contentFormat?: string;
}

/**
 * Sends a message to the agent and streams the answer.
 * Pass `prev` (conversationId + token) to continue an existing conversation.
 * Returns the updated conversation state once the header event is received.
 */
export async function askAgent(
  message: string,
  prev: ConversationState,
  handlers: AgentStreamHandlers,
): Promise<ConversationState> {
  if (!AGENT_TOKEN || AGENT_TOKEN === 'REPLACE_WITH_AGENT_TOKEN') {
    handlers.onError(
      'Missing VITE_COVEO_AGENT_TOKEN. Add a token with agent access to .env.local.',
    );
    return prev;
  }

  const convo: ConversationState = { ...prev };
  let answer = '';

  // A follow-up requires BOTH the conversationId and the conversationToken from
  // a prior turn. If we have them, continue the conversation via `/follow-up`;
  // otherwise this is the first question and goes to `/answer`.
  const isFollowUp = Boolean(prev.conversationId && prev.conversationToken);
  const requestPath = isFollowUp ? FOLLOW_UP_PATH : ANSWER_PATH;

  // Request body — matches the shape the hosted search page sends to the agent.
  const clientId = getClientId();
  const body: Record<string, unknown> = {
    q: message,
    locale: LOCALE,
    searchHub: SEARCH_HUB,
    tab: 'default',
    // Request the product image + id alongside each citation so the UI can show
    // a thumbnail (ec_images holds the Cloudinary URL).
    citationsFieldToInclude: ['filetype', 'ec_images', 'permanentid'],
    analytics: {
      clientId,
      clientTimestamp: new Date().toISOString(),
      actionCause: 'searchboxSubmit',
      capture: true,
      originContext: 'Search',
    },
    // The follow-up endpoint requires both of these (it returns 412 without the
    // token). They are omitted on the first `/answer` call.
    ...(isFollowUp
      ? {
          conversationId: prev.conversationId,
          conversationToken: prev.conversationToken,
        }
      : {}),
  };

  let resp: Response;
  try {
    resp = await fetch(`${AGENT_BASE}${requestPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AGENT_TOKEN}`,
        'Content-Type': 'application/json',
        // The endpoint rejects `text/event-stream` with 406; it accepts
        // application/json and streams the SSE body regardless.
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    handlers.onError(`Network error: ${String(e)}`);
    return convo;
  }

  if (!resp.ok || !resp.body) {
    handlers.onError(`Agent request failed: HTTP ${resp.status}`);
    return convo;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (jsonStr: string) => {
    if (!jsonStr) return;
    let evt: Record<string, unknown>;
    try {
      evt = JSON.parse(jsonStr);
    } catch {
      // eslint-disable-next-line no-console
      if (DEBUG) console.log('[agent] unparsed data payload:', jsonStr);
      return;
    }
    // eslint-disable-next-line no-console
    if (DEBUG) console.log('[agent] event:', evt.type, evt);
    switch (evt.type) {
      case 'RUN_STARTED':
        convo.conversationId = evt.threadId as string;
        break;
      case 'TEXT_MESSAGE_CHUNK':
        answer += (evt.delta as string) ?? '';
        handlers.onText(answer);
        break;
      case 'CUSTOM': {
        const name = evt.name as string;
        const value = evt.value as Record<string, unknown>;
        if (name === 'header') {
          // The conversationToken is issued ONCE on the first `/answer` turn and
          // stays valid for the whole conversation. The `/follow-up` response
          // re-emits a header WITHOUT a token, so only overwrite it when one is
          // actually present — otherwise we'd wipe the token and the next
          // follow-up would start a brand-new conversation.
          if (typeof value.conversationToken === 'string') {
            convo.conversationToken = value.conversationToken;
          }
          convo.followUpEnabled = value.followUpEnabled as boolean;
          if (typeof value.contentFormat === 'string') {
            convo.contentFormat = value.contentFormat;
          }
        } else if (name === 'citations') {
          handlers.onCitations?.((value.citations as Citation[]) ?? []);
        }
        break;
      }
      case 'RUN_FINISHED': {
        const result = evt.result as Record<string, unknown> | undefined;
        handlers.onDone(result?.completionReason === 'ANSWERED');
        break;
      }
      case 'RUN_ERROR':
        handlers.onError((evt.message as string) ?? 'Agent run error');
        break;
    }
  };

  // Parse the SSE stream line by line. We only care about `data:` lines (the
  // JSON event payloads). Processing per-line avoids depending on exact blank-
  // line framing (\n\n vs \r\n\r\n), which varies between servers.
  const processLine = (line: string) => {
    const trimmed = line.replace(/\r$/, '').trimStart();
    // eslint-disable-next-line no-console
    if (DEBUG) console.log('[agent line]', JSON.stringify(trimmed));
    if (trimmed.startsWith('data:')) {
      handleEvent(trimmed.slice(5).trim());
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      processLine(line);
    }
  }
  // Flush any trailing line left in the buffer.
  if (buffer.length > 0) processLine(buffer);

  return convo;
}
