import type { CanvasComponent, CpdConversation } from './cpdAgent';

/**
 * Module-level store for the Try CPD! conversation.
 *
 * WHY: the CPD conversation (the streamed turns + the agent conversation handle)
 * used to live in the TryCPD component's local state, so navigating to a product
 * page unmounted it and the whole conversation was lost. By holding it here —
 * the same pattern as cartController / searchController — the conversation
 * survives navigation, so returning to /discover restores exactly what the user
 * was looking at (e.g. the "Best speeding boats" results).
 *
 * This is deliberately a tiny observable store (snapshot + subscribe) rather than
 * a state library, to match the rest of the app and avoid a new dependency.
 */

export interface CpdTurn {
  role: 'user' | 'agent';
  text?: string;
  reasoning?: string;
  canvas?: CanvasComponent[];
  streaming?: boolean;
  noAnswer?: boolean;
  /** The CPD turn's runId — used as responseId for cart attribution. */
  runId?: string;
}

interface CpdState {
  turns: CpdTurn[];
  input: string;
}

let state: CpdState = { turns: [], input: '' };
// The agent conversation handle (runId/threadId/etc.) — persisted alongside.
let conversation: CpdConversation = {};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const cpdStore = {
  /** Current snapshot (stable reference until a mutation). */
  getState(): CpdState {
    return state;
  },
  /** The persisted agent conversation handle. */
  getConversation(): CpdConversation {
    return conversation;
  },
  setConversation(next: CpdConversation) {
    conversation = next;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setInput(input: string) {
    state = { ...state, input };
    emit();
  },
  setTurns(updater: (prev: CpdTurn[]) => CpdTurn[]) {
    state = { ...state, turns: updater(state.turns) };
    emit();
  },
  /** Clear everything (used by a future "new conversation" control). */
  reset() {
    state = { turns: [], input: '' };
    conversation = {};
    emit();
  },
};
