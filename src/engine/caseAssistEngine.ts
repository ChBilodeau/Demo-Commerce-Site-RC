import {
  buildCaseAssistEngine,
  buildCaseInput,
  buildCaseField,
  buildDocumentSuggestionList,
  type CaseAssistEngine,
  type CaseAssistEngineConfiguration,
  type CaseInput,
  type CaseField,
  type DocumentSuggestionList,
} from '@coveo/headless/case-assist';
import { demoConfig } from '../config/demoConfig';

/**
 * Coveo Case Assist wiring for the Technical Support experience.
 *
 * Case Assist powers two things while the shopper describes their problem:
 *   1. DOCUMENT SUGGESTIONS — relevant RC help articles (case deflection).
 *   2. CASE CLASSIFICATION — predicted Type / Reason values for the case.
 *
 * It does NOT create the Salesforce Case itself; the final "create case" submit
 * is wired separately (Salesforce Web-to-Case). See SupportPage.
 *
 * ── Configuration ────────────────────────────────────────────────────────────
 * Set these from the Coveo Admin Console once the Case Assist configuration and
 * the Case Classification model exist:
 *   - VITE_COVEO_CASE_ASSIST_ID  → the Case Assist configuration GUID
 *   - (token) reuses VITE_COVEO_ACCESS_TOKEN (needs the Case Assist privilege),
 *     or set VITE_COVEO_CASE_ASSIST_TOKEN to use a dedicated token.
 *
 * The classification fields below ("Type", "Reason") must match the fields the
 * CC model was configured to provide suggestions for.
 */

const ORGANIZATION_ID = demoConfig.coveo.organizationId;

const CASE_ASSIST_ID = demoConfig.coveo.support.caseAssistId || undefined;

const ACCESS_TOKEN =
  demoConfig.coveo.support.caseAssistToken || demoConfig.coveo.accessToken || '';

/** Locale passed to the CC model for contextually relevant suggestions. */
const LOCALE = `${demoConfig.coveo.commerce.locale.language}-${demoConfig.coveo.commerce.locale.country}`;

/** The searchHub identifies this interface in Coveo analytics. */
const SEARCH_HUB = demoConfig.coveo.support.searchHub;

/**
 * The Case fields the CC model predicts. These are Coveo index field names (how
 * the Salesforce source mapped Case Type / Reason), NOT the Salesforce API names.
 *
 * Configure with VITE_COVEO_CASE_ASSIST_FIELDS as a comma-separated list, e.g.
 *   VITE_COVEO_CASE_ASSIST_FIELDS=sfcasetype,sfcasereason
 * Optionally give each a label with `field:Label`, e.g.
 *   VITE_COVEO_CASE_ASSIST_FIELDS=sfcasetype:Type,sfcasereason:Reason
 *
 * The exact identifiers come from your Case Assist configuration's
 * "Fields to provide suggestions" setting in the Coveo Admin Console.
 */
function parseFieldsEnv(): { field: string; label: string }[] {
  // Classification fields default to the standard Case Type/Reason mapping.
  // (Kept configurable in code; the demo funnel drives category/problem itself.)
  const fallback = 'sfcasetype:Type,sfcasereason:Reason';
  return fallback.split(',').map((entry) => {
    const [field, label] = entry.split(':').map((s) => s.trim());
    return { field, label: label || field };
  });
}

const PARSED_FIELDS = parseFieldsEnv();

export const CLASSIFICATION_FIELDS = PARSED_FIELDS.map((f) => f.field);

/** Human labels for each classification field, keyed by the Coveo field name. */
export const CLASSIFICATION_LABELS: Record<string, string> = Object.fromEntries(
  PARSED_FIELDS.map((f) => [f.field, f.label]),
);

/** When true, logs the raw Case Assist classification/suggestion state. */
export const CASE_ASSIST_DEBUG = false;

/**
 * Maps a Coveo classification field name to the Salesforce Web-to-Case field
 * name used on submit. Web-to-Case expects Salesforce field names (e.g. `type`,
 * `reason`) or custom field IDs (`00N...`) — NOT Coveo index field names.
 *
 * The defaults map our two seeded fields to the standard Case picklists. Adjust
 * if your Coveo field names differ (keep the Salesforce side as `type`/`reason`
 * for the standard Case fields we populated).
 */
export const CLASSIFICATION_TO_SALESFORCE: Record<string, string> = {
  sfcasetype: 'type',
  sfcasereason: 'reason',
};

/** True when the support feature is enabled and Case Assist is configured. */
export const isCaseAssistConfigured =
  demoConfig.features.support && Boolean(CASE_ASSIST_ID);

export interface CaseAssistControllers {
  engine: CaseAssistEngine;
  subjectInput: CaseInput;
  descriptionInput: CaseInput;
  classificationFields: { field: string; controller: CaseField }[];
  documentSuggestions: DocumentSuggestionList;
}

let controllers: CaseAssistControllers | null = null;

/**
 * Lazily builds the Case Assist engine + controllers. Returns null when the
 * Case Assist ID is not configured yet (so the UI can show setup instructions
 * instead of making failing API calls).
 */
export function getCaseAssistControllers(): CaseAssistControllers | null {
  if (!isCaseAssistConfigured || !ACCESS_TOKEN) {
    return null;
  }
  if (controllers) {
    return controllers;
  }

  const configuration: CaseAssistEngineConfiguration = {
    organizationId: ORGANIZATION_ID,
    accessToken: ACCESS_TOKEN,
    caseAssistId: CASE_ASSIST_ID as string,
    locale: LOCALE,
    searchHub: SEARCH_HUB,
  };

  const engine = buildCaseAssistEngine({ configuration });

  controllers = {
    engine,
    subjectInput: buildCaseInput(engine, { options: { field: 'subject' } }),
    descriptionInput: buildCaseInput(engine, { options: { field: 'description' } }),
    classificationFields: CLASSIFICATION_FIELDS.map((field) => ({
      field,
      controller: buildCaseField(engine, { options: { field } }),
    })),
    documentSuggestions: buildDocumentSuggestionList(engine),
  };

  return controllers;
}
