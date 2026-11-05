/**
 * Client for Coveo Conversational Product Discovery (CPD) — the "discovery
 * agent" that returns a streamed, adaptive A2UI canvas (product carousels,
 * comparison tables, next-action chips, narrative text).
 *
 * Endpoint (unstable preview, confirmed from a real hosted-page network call):
 *   POST https://platform.cloud.coveo.com/rest/organizations/<org>/commerce/unstable/agentic/converse
 *   Authorization: Bearer <platform token with COVEO_ML / EXECUTE_AGENT_QUERY>
 *   Content-Type: application/json   →   response: text/event-stream (AG-UI)
 *
 * The stream is AG-UI. The UI arrives in ACTIVITY_SNAPSHOT events of
 * activityType "a2ui-surface": a list of `operations` that
 *   - beginRendering: start a surface (surfaceId + root component id)
 *   - surfaceUpdate:  declare components (each with a type, props, dataBinding)
 *   - dataModelUpdate: fill a surface's data model (key/valueMap/valueString)
 * Components reference their data by a `dataBinding` JSON-pointer-ish path.
 * A snapshot with `replace:true` supersedes the previous one for that surface
 * (skeleton → final). We keep the latest non-skeleton surface per surfaceId.
 *
 * NOTE: `unstable` means the contract may change. Renderers degrade gracefully
 * on unknown component types.
 */

const ORG_ID = '__COVEO_ORG_ID__';
const ENDPOINT = `https://platform.cloud.coveo.com/rest/organizations/${ORG_ID}/commerce/unstable/agentic/converse`;
const CPD_TOKEN = import.meta.env.VITE_COVEO_CPD_TOKEN as string | undefined;

const LOCALE = { language: 'en', country: 'CA', currency: 'CAD' } as const;
const TRACKING_ID = 'chbi-shop';
const DEBUG = (import.meta.env.VITE_COVEO_CPD_DEBUG as string | undefined) === 'true';

export const isCpdConfigured = Boolean(CPD_TOKEN);

function getClientId(): string {
  const KEY = 'chbi-cpd-client-id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '22222222-2222-2222-2222-222222222222';
  }
}

/**
 * NOTE on CPD cart attribution:
 * We previously emitted an `ec.productClick` here carrying the CPD turn's runId
 * as `responseId`. That is INVALID: the Commerce analytics pipeline validates a
 * click's responseId against a real commerce search/listing/recommendation
 * response UUID, and the CPD agentic stream does not expose one (its runId /
 * threadId are not commerce search events). Those clicks were rejected en masse
 * ("Click without associated search"), so the function was removed. CPD
 * cart-adds now fire only the cart event — no fabricated click.
 *
 * If/when the CPD stream exposes a valid commerce responseId, re-introduce a
 * productClick using THAT id to restore last-click attribution for CPD.
 */

// ─── A2UI data-model decoding ────────────────────────────────────────────────
// The CPD data model is a nested structure of { key, valueString | valueMap }.
// We decode it into plain JS objects/arrays so renderers can consume it. Arrays
// are represented by valueMaps whose keys are "0","1",... — we detect that.

type A2uiNode = {
  key?: string;
  valueString?: string;
  valueNumber?: number;
  valueBool?: boolean;
  valueMap?: A2uiNode[];
};

function decodeNode(node: A2uiNode): unknown {
  if (node.valueString !== undefined) return node.valueString;
  if (node.valueNumber !== undefined) return node.valueNumber;
  if (node.valueBool !== undefined) return node.valueBool;
  if (node.valueMap) {
    const keys = node.valueMap.map((c) => c.key ?? '');
    const isArray =
      keys.length > 0 && keys.every((k, i) => k === String(i));
    if (isArray) {
      return node.valueMap.map((c) => decodeNode(c));
    }
    const obj: Record<string, unknown> = {};
    for (const child of node.valueMap) {
      if (child.key !== undefined) obj[child.key] = decodeNode(child);
    }
    return obj;
  }
  return null;
}

/** Decodes a `dataModelUpdate.contents` array into a { key: value } object. */
function decodeContents(contents: A2uiNode[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of contents) {
    if (c.key !== undefined) out[c.key] = decodeNode(c);
  }
  return out;
}

// ─── Public canvas model the UI renders ──────────────────────────────────────

export interface CanvasComponent {
  /** The A2UI component type, e.g. "ProductCarousel", "NextActionsBar". */
  type: string;
  /** The component's declared props (minus dataBinding wiring). */
  props: Record<string, unknown>;
  /** Resolved data for the component (from the surface's data model). */
  data: Record<string, unknown>;
  /** Whether this surface is still a loading skeleton. */
  loading: boolean;
  /**
   * Lookup of every surface's decoded data by surfaceId. Components like
   * BundleDisplay reference other surfaces (via `surfaceRef`) to pull in their
   * products, so renderers need access to the full surface map.
   */
  surfaces: Record<string, Record<string, unknown>>;
}

export interface CpdConversation {
  conversationSessionId?: string;
  conversationToken?: string;
  /**
   * The current turn's runId. Used as the `responseId` on a productClick event
   * when a shopper adds a CPD product to the cart, so Coveo attributes the
   * resulting purchase to Conversational Product Discovery (last-click model).
   */
  runId?: string;
}

export interface CpdHandlers {
  /** Narrative/decision-support text, accumulated. */
  onText?: (fullText: string) => void;
  /** The current set of rendered canvas components (ordered). */
  onCanvas?: (components: CanvasComponent[]) => void;
  /** Agent reasoning text (optional "thinking" display), accumulated. */
  onReasoning?: (fullText: string) => void;
  /** Finished; `answered` true if the run produced a usable response. */
  onDone?: (answered: boolean) => void;
  onError?: (message: string) => void;
}

interface SurfaceState {
  surfaceId: string;
  rootId: string;
  isSkeleton: boolean;
  // componentId -> { type, props, dataBinding }
  components: Map<string, { type: string; props: Record<string, unknown>; bindings: Record<string, string> }>;
  // decoded data model for this surface
  data: Record<string, unknown>;
  order: number;
}

export async function converse(
  message: string,
  prev: CpdConversation,
  handlers: CpdHandlers,
): Promise<CpdConversation> {
  if (!CPD_TOKEN) {
    handlers.onError?.(
      'Missing VITE_COVEO_CPD_TOKEN. Add a Coveo platform token (EXECUTE_AGENT_QUERY) to .env.local.',
    );
    return prev;
  }

  const convo: CpdConversation = { ...prev };
  let answer = '';
  let reasoning = '';
  const surfaces = new Map<string, SurfaceState>();
  let surfaceCounter = 0;

  const emitCanvas = () => {
    const comps: CanvasComponent[] = [];
    const ordered = [...surfaces.values()].sort((a, b) => a.order - b.order);
    // The agent emits skeleton surfaces (surfaceId contains "skeleton") as
    // placeholders, then renders the real content on a DIFFERENT surfaceId.
    // Once at least one real surface has arrived, drop all skeleton surfaces so
    // they don't linger as empty animated boxes.
    const hasRealSurface = ordered.some((s) => !s.surfaceId.includes('skeleton'));

    // Build a lookup of every surface's resolved data, so components that
    // reference other surfaces (BundleDisplay → ProductCard via surfaceRef) can
    // pull in their products.
    const surfaceData: Record<string, Record<string, unknown>> = {};
    for (const s of ordered) {
      surfaceData[s.surfaceId] = s.data;
    }

    for (const s of ordered) {
      if (s.surfaceId.includes('skeleton') && hasRealSurface) continue;
      // Individual bundle product-card surfaces are rendered INSIDE the
      // BundleDisplay (via surfaceRef), not as standalone top-level blocks.
      if (s.surfaceId.startsWith('bundle-surface-')) continue;
      const root = s.components.get(s.rootId);
      if (!root) continue;
      // Resolve bound data for the root component.
      const data: Record<string, unknown> = {};
      for (const [prop, pointer] of Object.entries(root.bindings)) {
        data[prop] = resolvePointer(s.data, pointer);
      }
      comps.push({
        type: root.type,
        props: root.props,
        data,
        loading: s.isSkeleton,
        surfaces: surfaceData,
      });
    }
    handlers.onCanvas?.(comps);
  };

  const body = {
    trackingId: TRACKING_ID,
    language: LOCALE.language,
    country: LOCALE.country,
    currency: LOCALE.currency,
    clientId: getClientId(),
    message,
    conversationSessionId: prev.conversationSessionId ?? crypto.randomUUID(),
    ...(prev.conversationToken ? { conversationToken: prev.conversationToken } : {}),
    context: { view: { url: window.location.href } },
  };

  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CPD_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    handlers.onError?.(`Network error: ${String(e)}`);
    return convo;
  }

  if (!resp.ok || !resp.body) {
    const detail = await resp.text().catch(() => '');
    handlers.onError?.(
      `CPD request failed: HTTP ${resp.status}. ${detail.slice(0, 200)}`,
    );
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
      return;
    }
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[cpd]', evt.type, (evt as { name?: string }).name ?? '', evt);
    }

    switch (evt.type) {
      case 'RUN_STARTED':
        convo.conversationSessionId =
          (evt.conversationSessionId as string) ?? (evt.threadId as string);
        convo.conversationToken = evt.conversationToken as string;
        // Capture the turn's runId as the attribution responseId for CPD.
        convo.runId = evt.runId as string;
        break;

      case 'REASONING_MESSAGE_CONTENT':
        reasoning += (evt.delta as string) ?? '';
        handlers.onReasoning?.(reasoning);
        break;

      case 'TEXT_MESSAGE_CONTENT':
        answer += (evt.delta as string) ?? '';
        handlers.onText?.(answer);
        break;

      case 'ACTIVITY_SNAPSHOT':
        if ((evt.activityType as string) === 'a2ui-surface') {
          applyA2uiOperations(evt);
          emitCanvas();
        }
        break;

      case 'RUN_FINISHED': {
        const result = evt.result as Record<string, unknown> | undefined;
        const reason = result?.completionReason as string | undefined;
        // CPD doesn't always send completionReason; treat presence of canvas or
        // text as "answered".
        const answered =
          reason === 'ANSWERED' || answer.length > 0 || surfaces.size > 0;
        handlers.onDone?.(answered);
        break;
      }

      case 'RUN_ERROR':
        handlers.onError?.((evt.message as string) ?? 'CPD run error');
        break;
    }
  };

  // Apply the A2UI operations list from one ACTIVITY_SNAPSHOT.
  const applyA2uiOperations = (evt: Record<string, unknown>) => {
    const content = evt.content as { operations?: Record<string, unknown>[] } | undefined;
    const ops = content?.operations ?? [];
    const replace = evt.replace === true;

    for (const op of ops) {
      if (op.beginRendering) {
        const br = op.beginRendering as { surfaceId: string; root: string };
        const skeleton = br.surfaceId.includes('skeleton');
        // For a replace snapshot targeting a non-skeleton surface, reset it.
        const existing = surfaces.get(br.surfaceId);
        if (!existing || replace) {
          surfaces.set(br.surfaceId, {
            surfaceId: br.surfaceId,
            rootId: br.root,
            isSkeleton: skeleton,
            components: new Map(),
            data: {},
            order: existing?.order ?? surfaceCounter++,
          });
        }
      }

      if (op.surfaceUpdate) {
        const su = op.surfaceUpdate as {
          surfaceId: string;
          components: { id: string; component: Record<string, unknown> }[];
        };
        const surface = surfaces.get(su.surfaceId);
        if (!surface) continue;
        for (const c of su.components) {
          // A component is { "<Type>": { ...props with possible {componentId,dataBinding} } }
          const [type, raw] = Object.entries(c.component)[0] as [
            string,
            Record<string, unknown>,
          ];
          const props: Record<string, unknown> = {};
          const bindings: Record<string, string> = {};
          for (const [k, v] of Object.entries(raw ?? {})) {
            if (v && typeof v === 'object' && 'dataBinding' in (v as object)) {
              bindings[k] = (v as { dataBinding: string }).dataBinding;
            } else if (v && typeof v === 'object' && 'literalString' in (v as object)) {
              props[k] = (v as { literalString: string }).literalString;
            } else {
              props[k] = v;
            }
          }
          surface.components.set(c.id, { type, props, bindings });
          if (type.toLowerCase().includes('skeleton') === false && !su.surfaceId.includes('skeleton')) {
            surface.isSkeleton = Boolean((raw as { isLoading?: boolean })?.isLoading);
          }
        }
      }

      if (op.dataModelUpdate) {
        const dm = op.dataModelUpdate as { surfaceId: string; contents: A2uiNode[] };
        const surface = surfaces.get(dm.surfaceId);
        if (!surface) continue;
        Object.assign(surface.data, decodeContents(dm.contents));
      }
    }
  };

  const processLine = (line: string) => {
    const trimmed = line.replace(/\r$/, '').trimStart();
    if (trimmed.startsWith('data:')) handleEvent(trimmed.slice(5).trim());
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
  if (buffer.length > 0) processLine(buffer);

  return convo;
}

/** Resolves a dataBinding pointer like "/actions" or "/products/0" against data. */
function resolvePointer(data: Record<string, unknown>, pointer: string): unknown {
  const parts = pointer.replace(/^\//, '').split('/').filter(Boolean);
  let cur: unknown = data;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
