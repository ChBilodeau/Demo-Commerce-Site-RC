/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COVEO_ACCESS_TOKEN: string;
  /** Optional override for the storefront base URL used in analytics + PLP URLs. */
  readonly VITE_STOREFRONT_BASE_URL?: string;
  /** Coveo Case Assist configuration GUID (Service → Case Assist). */
  readonly VITE_COVEO_CASE_ASSIST_ID?: string;
  /** Optional dedicated token for Case Assist; falls back to VITE_COVEO_ACCESS_TOKEN. */
  readonly VITE_COVEO_CASE_ASSIST_TOKEN?: string;
  /** Comma-separated classification fields, e.g. "sfcasetype:Type,sfcasereason:Reason". */
  readonly VITE_COVEO_CASE_ASSIST_FIELDS?: string;
  /** Set to "true" to log Case Assist state (field names, responses) to the console. */
  readonly VITE_COVEO_CASE_ASSIST_DEBUG?: string;
  /** Salesforce Web-to-Case orgid for real case creation. */
  readonly VITE_SF_WEBTOCASE_ORGID?: string;
  /** Web-to-Case field id (00N...) for the Vehicle Category picklist. */
  readonly VITE_SF_FIELD_VEHICLE_CATEGORY?: string;
  /** Web-to-Case field id (00N...) for the Problem Type picklist. */
  readonly VITE_SF_FIELD_PROBLEM_TYPE?: string;
  /** Web-to-Case field id (00N...) for the Viewed Help Articles checkbox. */
  readonly VITE_SF_FIELD_VIEWED_ARTICLES?: string;
  /** Token (API key) allowed to call the Coveo Search Agent (Ask Coveo AI). */
  readonly VITE_COVEO_AGENT_TOKEN?: string;
  /** Coveo platform token (EXECUTE_AGENT_QUERY) for Conversational Product Discovery. */
  readonly VITE_COVEO_CPD_TOKEN?: string;
  /** Set to "true" to log CPD stream events to the console. */
  readonly VITE_COVEO_CPD_DEBUG?: string;
  /** Set to "true" to log recommendation slot responses to the console. */
  readonly VITE_RECS_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
