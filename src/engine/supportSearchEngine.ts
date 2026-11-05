import {
  buildSearchEngine,
  buildSearchBox,
  buildResultList,
  buildInteractiveResult,
  buildQuickview,
  getSampleSearchEngineConfiguration,
  type SearchEngine,
  type SearchBox,
  type ResultList,
  type Result,
} from '@coveo/headless';

/**
 * Coveo SEARCH API engine for the Technical Support experience.
 *
 * The support page runs on the Search API (not Case Assist) on its own search
 * hub `FASupport`, so it has dedicated analytics, pipeline, and relevance.
 *
 * Funnel behaviour (confirmed against the live index):
 *   - CATEGORY is a HARD filter — only articles for the chosen vehicle category
 *     are returned (`@sfvehicle_category__c=="<label>"`, injected as a constant
 *     query `cq`).
 *   - PROBLEM TYPE is a BOOST, not a filter — matching articles are ranked
 *     higher via a query ranking expression (`qre`). Because an empty-query
 *     search scores all docs flat, the UI also applies a stable client-side
 *     ordering so problem matches reliably float to the top (see SupportPage).
 *
 * The chosen category/problem live in module state and are read by
 * `preprocessRequest`, which rewrites every outgoing search request. This keeps
 * the filter/boost version-independent (no reliance on specific action names).
 *
 * Indexed field names (from the Salesforce source): `sfvehicle_category__c`,
 * `sfproblem_type__c`. Values match the funnel picklist labels exactly.
 */

const ORG_ID = '__COVEO_ORG_ID__';
const ACCESS_TOKEN = import.meta.env.VITE_COVEO_ACCESS_TOKEN as string;
const SEARCH_HUB = 'FASupport';

export const SUPPORT_FIELDS_TO_INCLUDE = [
  'sfvehicle_category__c',
  'sfproblem_type__c',
  'sfdescription__c',
  'sfsolution__c',
  'uri',
];

/** Current funnel selection the preprocessor applies to each request. */
let activeCategory: string | null = null;
let activeProblem: string | null = null;
// Natural-language text (e.g. a case description) to send as the Coveo `lq`
// "large query", which extracts keywords from long/conversational input instead
// of requiring an exact AND match. The search box `q` stays for short keywords.
let activeLargeQuery: string | null = null;

/** Set the category hard-filter + problem boost for subsequent searches. */
export function setSupportScope(category: string | null, problem: string | null) {
  activeCategory = category;
  activeProblem = problem;
}

/** Set (or clear) the large-query text used for natural-language input. */
export function setSupportLargeQuery(text: string | null) {
  activeLargeQuery = text && text.trim() ? text.trim() : null;
}

/** Escape double quotes inside a Coveo field expression value. */
function q(value: string): string {
  return value.replace(/"/g, '\\"');
}

let engine: SearchEngine | null = null;

export function getSupportSearchEngine(): SearchEngine {
  if (engine) return engine;

  // The real org config. getSampleSearchEngineConfiguration() is only used for
  // its shape defaults; we override org/token/hub with the RC org's values.
  const base = getSampleSearchEngineConfiguration();

  engine = buildSearchEngine({
    configuration: {
      ...base,
      organizationId: ORG_ID,
      accessToken: ACCESS_TOKEN,
      search: {
        searchHub: SEARCH_HUB,
      },
      // Inject the category filter + problem boost + fields on every request.
      preprocessRequest: (request, clientOrigin) => {
        if (clientOrigin !== 'searchApiFetch') return request;
        try {
          const body = JSON.parse(request.body as string);

          // Hard filter by category via constant query (cached, doesn't affect
          // relevance scoring of the query terms).
          if (activeCategory) {
            const catExpr = `@sfvehicle_category__c=="${q(activeCategory)}"`;
            body.cq = body.cq ? `(${body.cq}) AND (${catExpr})` : catExpr;
          }

          // Natural-language input goes in `lq` (large query) so long sentences
          // return keyword matches instead of 0 results from an exact AND match.
          if (activeLargeQuery) {
            body.lq = activeLargeQuery;
          } else {
            delete body.lq;
          }

          // Boost (not filter) the chosen problem type.
          if (activeProblem) {
            const boost = {
              expression: `@sfproblem_type__c=="${q(activeProblem)}"`,
              modifier: 1000,
              isConstant: true,
            };
            body.rankingFunctions = body.rankingFunctions ?? [];
            body.qre = Array.isArray(body.qre) ? [...body.qre, boost] : [boost];
          }

          // Always return the tag + content fields so the UI can render + order.
          const fields = new Set<string>([
            ...(Array.isArray(body.fieldsToInclude) ? body.fieldsToInclude : []),
            ...SUPPORT_FIELDS_TO_INCLUDE,
          ]);
          body.fieldsToInclude = Array.from(fields);

          request.body = JSON.stringify(body);
        } catch {
          // If anything goes wrong, fall through with the original request.
        }
        return request;
      },
    },
  });

  return engine;
}

export interface SupportSearchControllers {
  engine: SearchEngine;
  searchBox: SearchBox;
  resultList: ResultList;
}

let controllers: SupportSearchControllers | null = null;

export function getSupportSearchControllers(): SupportSearchControllers {
  if (controllers) return controllers;
  const e = getSupportSearchEngine();
  controllers = {
    engine: e,
    searchBox: buildSearchBox(e),
    resultList: buildResultList(e),
  };
  return controllers;
}

/** Build an interactive-result controller so clicks log Search analytics. */
export function buildSupportInteractiveResult(result: Result) {
  return buildInteractiveResult(getSupportSearchEngine(), { options: { result } });
}

/**
 * Build a Quickview controller for a result. `fetchResultContent()` populates
 * `state.content` with the article's indexed HTML (the same content shown in
 * the Coveo "Quick view" tab), which we render in an in-page overlay instead of
 * navigating to Salesforce.
 */
export function buildSupportQuickview(result: Result) {
  return buildQuickview(getSupportSearchEngine(), { options: { result } });
}

/** Read the indexed problem-type value off a result (for client-side ordering). */
export function resultProblemType(result: Result): string | undefined {
  const v = result.raw?.sfproblem_type__c;
  return typeof v === 'string' ? v : undefined;
}

/** Read the indexed category value off a result. */
export function resultCategory(result: Result): string | undefined {
  const v = result.raw?.sfvehicle_category__c;
  return typeof v === 'string' ? v : undefined;
}
