/**
 * Guided self-service support funnel configuration (single source of truth).
 *
 * The support flow is a four-step funnel:
 *   1. Category       → what kind of product (Cars & Trucks, Drones, …)
 *   2. Problem type   → what's going on (Setup, Something broken, …)
 *   3. Help articles  → Case Assist document suggestions seeded by steps 1–2
 *   4. Create a case  → only if articles didn't help; the earlier choices are
 *                       pre-filled and carried onto the Salesforce Case.
 *
 * Categories and problem types are defined here so the step buttons, the
 * article search seeding, and the Web-to-Case submit all agree. The picklist
 * `value` strings MUST match the Salesforce picklist values exactly, because
 * Web-to-Case submits the value as-is and rejects unknown picklist entries.
 */

export interface SupportCategory {
  /** Stable slug used in the URL (e.g. ?category=drones). */
  id: string;
  /** Button label AND the exact Salesforce `Vehicle_Category__c` picklist value. */
  label: string;
  /** Emoji/icon shown on the button. */
  icon: string;
  /** Extra search terms that help surface the right articles for this category. */
  searchHint: string;
}

export interface SupportProblem {
  /** Stable slug used in the URL (e.g. ?problem=broken). */
  id: string;
  /** Button label AND the exact Salesforce `Problem_Type__c` picklist value. */
  label: string;
  /** Short helper line under the button. */
  blurb: string;
  /** Extra search terms that help surface the right articles for this problem. */
  searchHint: string;
}

/** Step 1 — vehicle categories. `label` matches the SF Vehicle Category picklist. */
export const SUPPORT_CATEGORIES: SupportCategory[] = [
  { id: 'cars-trucks', label: 'Cars & Trucks', icon: '🚗', searchHint: 'rc car truck buggy crawler' },
  { id: 'airplanes', label: 'Airplanes', icon: '✈️', searchHint: 'rc airplane plane wing' },
  { id: 'helicopters', label: 'Helicopters', icon: '🚁', searchHint: 'rc helicopter heli swashplate' },
  { id: 'boats', label: 'Boats', icon: '🚤', searchHint: 'rc boat hull water' },
  { id: 'drones', label: 'Drones', icon: '🛸', searchHint: 'drone quad fpv' },
  { id: 'other', label: 'Other', icon: '🔧', searchHint: 'battery charger parts accessory' },
];

/** Step 2 — problem types. `label` matches the SF Problem Type picklist. */
export const SUPPORT_PROBLEMS: SupportProblem[] = [
  {
    id: 'setup',
    label: 'Setup & Getting Started',
    blurb: 'Help setting up or using your vehicle',
    searchHint: 'setup install getting started how to configure binding calibration',
  },
  {
    id: 'broken',
    label: 'Something Is Broken',
    blurb: 'A part failed, broke, or stopped working',
    searchHint: 'broken not working failure repair replace stripped',
  },
  {
    id: 'performance',
    label: 'Performance & Tuning',
    blurb: 'Tuning, handling, speed, or runtime',
    searchHint: 'performance tuning handling speed overheating adjust',
  },
  {
    id: 'parts',
    label: 'Parts & Compatibility',
    blurb: 'Finding parts or checking what fits',
    searchHint: 'parts compatibility spare which fits upgrade',
  },
  {
    id: 'warranty',
    label: 'Returns & Warranty',
    blurb: 'Returns, warranty claims, or missing items',
    searchHint: 'return warranty claim refund missing defective',
  },
  {
    id: 'other',
    label: 'Something Else',
    blurb: 'A question that does not fit the above',
    searchHint: 'question help general',
  },
];

export function getCategory(id: string | null | undefined): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.id === id);
}
export function getProblem(id: string | null | undefined): SupportProblem | undefined {
  return SUPPORT_PROBLEMS.find((p) => p.id === id);
}

/**
 * Builds the seed text used to fetch help-article suggestions for the chosen
 * category + problem. Fed into Case Assist's description input so document
 * suggestions and classification react to the funnel choices.
 */
export function buildHelpSeed(
  category: SupportCategory | undefined,
  problem: SupportProblem | undefined,
  extra = '',
): string {
  return [category?.searchHint, problem?.searchHint, extra]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Salesforce Web-to-Case custom field IDs for the funnel fields. */
export const SF_FUNNEL_FIELDS = {
  vehicleCategory: import.meta.env.VITE_SF_FIELD_VEHICLE_CATEGORY as string | undefined,
  problemType: import.meta.env.VITE_SF_FIELD_PROBLEM_TYPE as string | undefined,
  viewedArticles: import.meta.env.VITE_SF_FIELD_VIEWED_ARTICLES as string | undefined,
} as const;
