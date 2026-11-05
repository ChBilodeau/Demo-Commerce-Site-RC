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
import { demoConfig } from '../config/demoConfig';

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
 * The recommendation rail shown on the right side of the home page. The slot id
 * comes from demo.config.json (coveo.recommendations.homeSlotId); when empty,
 * the rail renders nothing.
 */
export const HOME_RAIL: SlotConfig = {
  slotId: demoConfig.coveo.recommendations.homeSlotId,
  fallbackTitle: 'Recommended for you',
};
