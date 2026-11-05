/**
 * Recommendation slot configuration.
 *
 * Each carousel on the storefront maps to a recommendation SLOT configured
 * server-side in the Coveo Merchandising Hub (CMH → Recommendations manager).
 * Creating a slot there produces a `slotId` (a GUID) — paste it below.
 *
 * Until a real slotId is filled in, the matching carousel renders nothing
 * (the component hides itself when the slot returns no products), so the app
 * stays clean before the slots exist.
 *
 * Suggested CMH strategies for each:
 *   - Recently viewed  -> "Recently viewed" / viewed strategy (personalized per visitor)
 *   - Most viewed      -> "Popular - viewed" strategy
 *   - Most purchased   -> "Popular - bought" strategy
 */
export interface SlotConfig {
  /** The slotId GUID from the CMH. Empty string = not configured yet. */
  slotId: string;
  /** Fallback heading if the slot's own `headline` is empty. */
  fallbackTitle: string;
}

export const HOME_SLOTS: SlotConfig[] = [
  // Cleared — add new recommendation slots here (slotId from the CMH).
];

/**
 * The recommendation rail shown on the right side of the home page.
 * Uses the "Home Recs" slot from the CMH (id below). The slot's own headline
 * ("What people like!") is used when present; fallbackTitle is a backup.
 */
export const HOME_RAIL: SlotConfig = {
  slotId: '74a5cd5b-30da-4e52-a4d4-95ebe8f16860',
  fallbackTitle: 'Recommended for you',
};
