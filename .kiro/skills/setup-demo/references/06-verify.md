# Phase 6 — Verify & launch

Goal: confirm the storefront works end to end, surface by surface. A build
passing is necessary but NOT sufficient — check each enabled feature actually
returns data.

## Steps

1. **Build**: `npm run build`. Fix any errors before continuing.
2. **Config sanity**: confirm `demo.config.json` has, for each ENABLED feature,
   the values that feature needs (see the per-feature checklist below). If a
   required value is empty, post a bridge question or ask the user.
3. **Run**: `npm run dev`. Open the storefront (NOT `/setup`). Because
   `demo.config.json` is now complete, the app boots into the storefront, not
   the wizard.
4. **Smoke-test each enabled surface:**
   - **Search (always)**: home page shows products; a search returns results;
     a product page opens.
   - **Recommendations**: the home rail shows products (or is empty if the model
     hasn't trained — note this, don't treat as failure).
   - **Ask Coveo AI** (`/ask`): a question streams an answer with citations.
   - **Try CPD!** (`/discover`): a query returns product cards.
   - **Support** (`/support`): the funnel runs; the articles step returns
     tagged articles from the support hub; clicking one opens the quick-view
     overlay; creating a case reaches Salesforce Web-to-Case.
5. Set a final `status.json`:
   `{ "phase": "Done", "message": "Setup complete", "progress": 100 }`.

## Per-feature required-config checklist

- search: `coveo.organizationId`, `coveo.accessToken`, `coveo.commerce.trackingId`,
  `coveo.commerce.searchHub`, and a working storefront association.
- recommendations: `coveo.recommendations.homeSlotId`.
- askCoveoAI: `coveo.searchAgent.agentId`, `.searchHub`, `.token`.
- tryCPD: `coveo.cpd.token`.
- support: `coveo.support.searchHub`, `.caseAssistId`, `.fields.*`, and
  `salesforce.webToCase.orgId` + `.fieldIds.*`.

## Hand-off

Summarize for the user:
- which features are live vs. pending (e.g. ML models still training),
- where their config lives (`demo.config.json`, git-ignored — remind them to
  keep tokens safe and never commit it),
- how to re-open the wizard (`/setup`) to change values,
- that the storefront runs with `npm run dev`.

Setup is complete.
