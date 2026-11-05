# Phase 5 — Per-feature wiring

Only configure the features the user turned on in `demo.config.json` →
`features`. Each optional feature needs some console-only Coveo work that you
guide. Skip any feature that's off.

## Recommendations (`features.recommendations`)

- GUIDED: in the Coveo Merchandising Hub, create a recommendation slot (e.g. a
  "popular bought/viewed" strategy) for the home page.
- Capture the slot id into `demo.config.json` →
  `coveo.recommendations.homeSlotId`.
- The rail stays empty until the recommendation/PR model has trained on enough
  behavior events — tell the user this is expected on a fresh org.

## Ask Coveo AI — Search Agent (`features.askCoveoAI`)

- GUIDED: create a Coveo Search Agent, grounded on the commerce content, on a
  search hub the user chooses (e.g. the commerce hub). Capture the **agent id**
  and the **search hub** into `demo.config.json` → `coveo.searchAgent.*`.
- Token: use a NON-EXPIRING API key (an "Anonymous search" key with
  Execute agent queries). A short-lived JWT search token will expire and cause
  401s. Save it to `coveo.searchAgent.token`.
- Multilingual answers (optional, GUIDED): if the user wants answers in the
  query's language, add agent behaviors (console) that force the answer language
  and translate the English KB — note that answers default to English without
  them, and the request `locale` alone does NOT control answer language.

## Try CPD! (`features.tryCPD`)

- GUIDED: ensure Conversational Product Discovery is enabled for the org and an
  agent/experience is configured.
- Token: an "Anonymous search" API key with Execute agent queries (non-expiring).
  Save it to `coveo.cpd.token`.

## Technical Support (`features.support`)

- Requires Phase 4 (Salesforce) to be complete.
- GUIDED: the support search hub (`coveo.support.searchHub`) and a Case Assist
  configuration (`coveo.support.caseAssistId`). Capture both.
- The support article search runs on the Search API on that hub; the case
  classification uses Case Assist; the case is created via Web-to-Case using the
  ids captured in Phase 4.

## After wiring each feature

Update `status.json` so the wizard reflects progress, and double-check the
corresponding values are present in `demo.config.json`. Remind the user that
ML-dependent surfaces (recommendations, agent answers) may be empty until models
train on their org's data — this is expected, not a setup error.

Continue to `references/06-verify.md`.
