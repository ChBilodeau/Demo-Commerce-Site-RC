import { useMemo, useRef, useState } from 'react';
import {
  askAgent,
  type Citation,
  type ConversationState,
} from '../engine/searchAgent';
import { Markdown } from './Markdown';

// Pool of product-grounded starter questions. These are answerable from the RC
// catalog (the agent grounds on products, so prefer "what/which product"
// phrasing over abstract concept comparisons). We show a random few each load.
const SUGGESTION_POOL = [
  'What are the best beginner RC cars?',
  'Which drones are good for aerial photography?',
  'Show me RC cars good for drifting',
  'What fast brushless short course trucks do you have?',
  'Recommend a beginner-friendly RC rock crawler',
  'Which RC boats do you carry?',
  'What indoor helicopters are available?',
  'I want an FPV drone — what are my options?',
  'What RC cars do you have under $300?',
  'Which drones come with a camera?',
];

/** Returns `count` distinct items chosen at random from `pool`. */
function pickRandom<T>(pool: readonly T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

interface Turn {
  role: 'user' | 'agent';
  text: string;
  citations?: Citation[];
  streaming?: boolean;
  noAnswer?: boolean;
}

// A Coveo Search Agent conversation is capped at 15 total turns (1 initial +
// up to 14 follow-ups) and stays active for 48h. See:
// https://docs.coveo.com/en/q2qg1117/leverage-machine-learning/manage-coveo-search-agents
const MAX_TURNS = 15;

export function AskCoveoAI() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Whether the agent still accepts a follow-up. Starts true (first question is
  // always allowed); the agent's `header` event can turn it off, and we also
  // close it once the turn cap is reached.
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const convoRef = useRef<ConversationState>({});
  const threadRef = useRef<HTMLDivElement | null>(null);
  // Randomize the starter suggestions once per mount.
  const suggestions = useMemo(() => pickRandom(SUGGESTION_POOL, 3), []);

  // Count of user questions asked in the current conversation.
  const askedCount = turns.filter((t) => t.role === 'user').length;
  const turnLimitReached = askedCount >= MAX_TURNS;
  // The composer is only usable for a brand-new question or an allowed
  // follow-up that hasn't hit the cap.
  const canAsk = (askedCount === 0 || followUpEnabled) && !turnLimitReached;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    });
  };

  const startNewConversation = () => {
    if (busy) return;
    convoRef.current = {};
    setTurns([]);
    setInput('');
    setFollowUpEnabled(true);
  };

  const send = async (explicit?: string) => {
    const message = (explicit ?? input).trim();
    if (!message || busy || !canAsk) return;

    // Is this a genuine follow-up? Only when the current transcript already has
    // a completed agent answer AND we hold the conversation state for it. This
    // guards against a stale convoRef making the FIRST question of a fresh
    // conversation route to /follow-up.
    const hasPriorAnswer = turns.some((t) => t.role === 'agent' && !t.streaming);
    const prevState: ConversationState =
      hasPriorAnswer && convoRef.current.conversationId && convoRef.current.conversationToken
        ? convoRef.current
        : {};

    setInput('');
    setBusy(true);
    // Append the user turn + a placeholder streaming agent turn.
    setTurns((t) => [
      ...t,
      { role: 'user', text: message },
      { role: 'agent', text: '', streaming: true },
    ]);
    scrollToBottom();

    const updateAgent = (patch: Partial<Turn>) =>
      setTurns((t) => {
        const next = [...t];
        // The last turn is always the agent placeholder.
        const i = next.length - 1;
        next[i] = { ...next[i], ...patch };
        return next;
      });

    convoRef.current = await askAgent(message, prevState, {
      onText: (full) => {
        updateAgent({ text: full });
        scrollToBottom();
      },
      onCitations: (citations) => updateAgent({ citations }),
      onDone: (answered) => {
        updateAgent({
          streaming: false,
          noAnswer: !answered,
        });
        setBusy(false);
        scrollToBottom();
      },
      onError: (msg) => {
        updateAgent({ streaming: false, text: `⚠️ ${msg}` });
        setBusy(false);
      },
    });

    // The agent reports whether follow-ups are allowed via the header event.
    // Default to true if the agent didn't say (treat absence as "allowed").
    setFollowUpEnabled(convoRef.current.followUpEnabled !== false);
  };

  // The index of the last turn (used to anchor the inline follow-up composer
  // directly beneath the most recent answer).
  const lastIndex = turns.length - 1;

  const renderComposer = (variant: 'hero' | 'followup') => (
    <div className={`chat-composer chat-composer--${variant}`}>
      <input
        type="text"
        className="chat-input"
        placeholder={
          !canAsk
            ? 'Start a new conversation to ask again'
            : variant === 'followup'
              ? 'Ask a follow-up…'
              : 'Ask about products…'
        }
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
        disabled={busy || !canAsk}
        aria-label={variant === 'followup' ? 'Ask a follow-up' : 'Ask Coveo AI'}
        autoFocus={variant === 'followup'}
      />
      <button
        type="button"
        className="chat-send"
        onClick={() => send()}
        disabled={busy || !input.trim() || !canAsk}
      >
        {busy ? '…' : variant === 'followup' ? 'Ask' : 'Send'}
      </button>
    </div>
  );

  return (
    <div className="ask-ai">
      <div className="ask-ai-header">
        <div className="ask-ai-heading">
          <h1 className="ask-ai-title">Ask Coveo AI</h1>
          {turns.length > 0 && (
            <button
              type="button"
              className="chat-new-convo"
              onClick={startNewConversation}
              disabled={busy}
            >
              ＋ New conversation
            </button>
          )}
        </div>
        <p className="ask-ai-sub">
          Ask a question in natural language and get an AI-generated answer, grounded in our catalog.
        </p>
      </div>

      {/* First question: hero search bar on top. */}
      {turns.length === 0 && renderComposer('hero')}

      <div className="chat">
        <div className="chat-thread" ref={threadRef}>
          {turns.length === 0 && (
            <div className="chat-empty">
              <p>Try asking:</p>
              <div className="chat-suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chat-suggestion"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => {
            const bubble =
              turn.role === 'user' ? (
                <div key={i} className="chat-msg chat-msg-user">
                  {turn.text}
                </div>
              ) : (
                <div key={i} className="chat-msg chat-msg-agent">
                  {turn.streaming && turn.text === '' ? (
                    <span className="chat-typing">Thinking…</span>
                  ) : turn.noAnswer && turn.text === '' ? (
                    <span className="chat-noanswer">
                      I couldn’t find an answer for that in the catalog.
                    </span>
                  ) : (
                    <div className="chat-answer">
                      <Markdown text={turn.text} />
                    </div>
                  )}
                </div>
              );

            // Anchor the inline follow-up composer directly below the most
            // recent agent answer once it has finished streaming.
            const showInlineComposer =
              i === lastIndex && turn.role === 'agent' && !turn.streaming;

            if (!showInlineComposer) return bubble;

            return (
              <div key={i} className="chat-turn-with-composer">
                {bubble}
                {!canAsk ? (
                  <p className="chat-followup-notice">
                    {turnLimitReached
                      ? 'This conversation reached its limit. Start a new conversation to keep asking.'
                      : 'This answer doesn’t support follow-up questions. Start a new conversation to ask something else.'}
                  </p>
                ) : (
                  renderComposer('followup')
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
