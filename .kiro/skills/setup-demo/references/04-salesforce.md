# Phase 4 — Salesforce setup (only if Support is enabled)

Goal: a Salesforce org with Lightning Knowledge, the custom fields the demo
needs, and seeded Knowledge articles + Cases. Field creation is guided
(console); seeding is automated via the `sf` CLI.

Skip this whole phase if `demo.config.json` → `features.support` is false.

## 4a. Org + Knowledge (GUIDED)

1. Confirm the user has a Salesforce org authenticated via `sf` (from Phase 1).
   Re-check with `sf org list`.
2. Guide them to enable **Lightning Knowledge**: Setup → Knowledge Settings →
   enable, and make the running user a Knowledge User with Manage Articles.
3. Guide them to add a rich-text **Article Body** field on the Knowledge object
   if their org doesn't have one, since the seed articles populate it.

## 4b. Custom fields (GUIDED — capture the ids)

Two picklists are needed on BOTH the Case and the Knowledge object, plus a
checkbox on Case. Guide the user through Setup → Object Manager:

On **Case** (and note the Web-to-Case field ids `00N...`):
- `Vehicle_Category__c` — picklist: Cars & Trucks, Airplanes, Helicopters,
  Boats, Drones, Other.
- `Problem_Type__c` — picklist: Setup & Getting Started, Something Is Broken,
  Performance & Tuning, Parts & Compatibility, Returns & Warranty,
  Something Else.
- `Viewed_Help_Articles__c` — checkbox.

On **Knowledge** (`Knowledge__kav`):
- `Vehicle_Category__c` and `Problem_Type__c` — same picklist values as above.
- `Description__c` and `Solution__c` — rich text areas (the issue + the fix).

Save the three **Web-to-Case field ids** (the `00N...` values) into
`demo.config.json` → `salesforce.webToCase.fieldIds.*` and the Web-to-Case
**org id** into `salesforce.webToCase.orgId`. The user finds the field ids on
the Web-to-Case HTML generator page (Setup → Web-to-Case) or in the field's URL.

The picklist VALUES must match the funnel labels exactly (the wizard uses the
same strings), or Web-to-Case silently drops the field.

## 4c. Seed Knowledge + Cases (AUTOMATED)

The seed content lives under `salesforce/`:
- `salesforce/generate-support-corpus.py` generates aligned Knowledge articles
  (with Description/Solution + the two tags) and Cases that mirror them.
- The generated Apex is split into batches (anonymous Apex has a ~32k char
  limit and the org has limited data storage — keep the set modest, ~100
  articles + ~120 cases).

Steps (confirm before each write):
1. Run `python3 salesforce/generate-support-corpus.py`.
2. Run each article batch: `sf apex run --target-org <ALIAS> --file <batch>`.
3. Run each case batch the same way.
4. Verify counts:
   `sf data query --target-org <ALIAS> --query "SELECT COUNT(Id) FROM Knowledge__kav WHERE PublishStatus='Online'"`
   and the same for `Case`.

### Storage caution

Developer Edition orgs have very little data storage (~5 MB). Do NOT seed
hundreds of articles/cases. If an insert fails with `STORAGE_LIMIT_EXCEEDED`,
reduce the corpus size and/or clear old records first. Leave headroom for the
user's own cases.

## 4d. Index into Coveo

Guide the user to rebuild their Salesforce Coveo source so the articles + the
two picklist fields get indexed into the support search hub. Then capture the
resulting Coveo field names (often `sfvehicle_category__c` /
`sfproblem_type__c`) into `demo.config.json` → `coveo.support.fields.*`. Also
map the article body to the Coveo item **body** so the quick view renders.

## Done when

- Knowledge articles + Cases exist (verified counts), tagged with the two
  picklists.
- The Salesforce source has indexed them into the support hub.
- `demo.config.json` has the support field names + Web-to-Case ids.

Continue to `references/05-features.md`.
