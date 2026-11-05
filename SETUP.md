# Setting up the Commerce Site RC demo

This is the step-by-step guide to wiring the demo against **your own** Coveo and
Salesforce orgs. The fastest path is to open the repo in [Kiro](https://kiro.dev)
and run **`/setup-demo`** — the skill automates and guides the same steps below.
This document is the manual version (and the reference for what the skill does).

Everything org-specific is stored in **`demo.config.json`** at the repo root
(git-ignored). The committed `demo.config.example.json` documents its shape.

Legend: **[auto]** the Kiro skill can do this for you · **[guided]** console-only,
you do it (the skill gives exact steps and verifies).

---

## Phase 1 — Prerequisites

| Tool | Why | Check |
| --- | --- | --- |
| Node.js 20+ | runs the app + setup scripts | `node --version` |
| npm | installs dependencies | `npm --version` |
| git | clone / version control | `git --version` |
| Salesforce CLI (`sf`) | seeds Knowledge + Cases (Support only) | `sf --version` |

You also need, from Coveo:
- your **organization id**,
- a public **anonymous search/commerce API key** (storefront), and
- a privileged **setup API key** (source push + field edit) — used only by the
  setup scripts, passed as an environment variable, **never** stored in config.

Install project dependencies:

```bash
npm install
```

For the Support feature, authenticate the Salesforce CLI now:

```bash
sf org login web     # opens a browser
sf org list          # confirm your org appears; note its alias
```

---

## Phase 2 — Collect configuration (the wizard)

```bash
npm run dev
```

With no `demo.config.json`, the app boots into **setup mode** and shows the
wizard (otherwise visit `/setup`). Fill in the Coveo core section, flip on only
the features you want (Search is always on; Recommendations, Ask Coveo AI,
Try CPD!, Support are optional), complete the Images section (Cloudinary cloud +
the provided ChatGPT image prompt), and click **Save configuration**.

Enter what you know now — org id, access token, tracking id, search hubs,
feature flags, Cloudinary cloud, Salesforce org alias. Values you don't have yet
(source id, catalog id, Web-to-Case field ids, support field names) get filled
in during the later phases. Prefer editing JSON? Copy
`demo.config.example.json` to `demo.config.json` and edit it directly.

Required core values: `coveo.organizationId`, `coveo.accessToken`,
`coveo.commerce.trackingId`.

---

## Phase 3 — Coveo setup

**3a. Create the commerce push source** **[auto]**

```bash
COVEO_ORG_ID=<org> COVEO_REGION=us COVEO_SETUP_KEY=<privileged-key> \
  node .kiro/skills/setup-demo/scripts/coveo-create-source.mjs
```

Save the printed source id into `demo.config.json` →
`coveo.commerce.sourceId`. (Or create a Catalog/Push source in the Admin
Console: Content → Sources → Add → Catalog.)

**3b. Generate and push the catalog** **[auto]**

The catalog generators read your storefront base URL and Cloudinary cloud from
the environment so nothing org-specific is hardcoded:

```bash
export STOREFRONT_BASE="https://your-store.example.com"
export CLOUDINARY_CLOUD="your-cloud-name"

python3 scripts/generate-rc-catalog.py rc-catalog.json
python3 scripts/generate-rc-parts.py rc-parts.json
python3 scripts/add-part-variants.py rc-parts.json       # parts need a self-variant
python3 scripts/set-cloudinary-images.py rc-catalog.json # point images at your cloud
```

Push to the source (confirm first — this writes to the org):

```bash
COVEO_ORG_ID=<org> COVEO_SOURCE_ID=<source> COVEO_PUSH_KEY=<push-key> \
  python3 scripts/push-and-prune.py rc-catalog.json
```

Upload product images to Cloudinary (optional, if you host your own):

```bash
CLOUDINARY_CLOUD=<cloud> CLOUDINARY_API_KEY=<key> CLOUDINARY_API_SECRET=<secret> \
  python3 scripts/upload-to-cloudinary.py <folder-of-images>
```

**3c. Catalog config + storefront association** **[guided]**

The Commerce API picks the pipeline + catalog server-side via the storefront
association tied to your tracking id. In the Admin Console:

1. Commerce → Catalogs: create a catalog config pointing at the source, with the
   product/variant id fields.
2. Commerce → Storefront associations: create an association for your
   **tracking id** with the matching **locale**, pointing at the catalog + a
   query pipeline.

**Verify** **[auto]** — confirm products are actually queryable:

```bash
node .kiro/skills/setup-demo/scripts/verify-coveo.mjs
```

> Common pitfall: `412 NO_CATALOG_MATCHES_REQUEST` means the locale in
> `demo.config.json` doesn't match the association's locale, or the association
> isn't set up yet.

---

## Phase 4 — Salesforce setup (Support only)

Skip this phase if `features.support` is `false`.

**4a. Org + Knowledge** **[guided]** — enable Lightning Knowledge (Setup →
Knowledge Settings), make the running user a Knowledge User, and ensure a
rich-text **Article Body** field exists.

**4b. Custom fields** **[guided]** — in Setup → Object Manager, create on
**Case**:
- `Vehicle_Category__c` (picklist): Cars & Trucks, Airplanes, Helicopters,
  Boats, Drones, Other
- `Problem_Type__c` (picklist): Setup & Getting Started, Something Is Broken,
  Performance & Tuning, Parts & Compatibility, Returns & Warranty, Something Else
- `Viewed_Help_Articles__c` (checkbox)

and the same two picklists plus `Description__c` / `Solution__c` rich-text areas
on **Knowledge** (`Knowledge__kav`). The picklist values must match the funnel
labels exactly or Web-to-Case silently drops the field.

Save the three Web-to-Case field ids (`00N...`) into
`salesforce.webToCase.fieldIds.*` and the Web-to-Case org id into
`salesforce.webToCase.orgId` (both on the Setup → Web-to-Case generator page).

**4c. Seed Knowledge + Cases** **[auto]**

```bash
python3 salesforce/generate-support-corpus.py
for f in salesforce/support-corpus/articles-*.apex; do
  sf apex run --target-org <your-org-alias> --file "$f"
done
for f in salesforce/support-corpus/cases-*.apex; do
  sf apex run --target-org <your-org-alias> --file "$f"
done
```

Verify counts:

```bash
sf data query --target-org <your-org-alias> \
  --query "SELECT COUNT(Id) FROM Knowledge__kav WHERE PublishStatus='Online'"
```

> **Storage caution:** Developer Edition orgs have ~5 MB of data storage. Keep
> the corpus modest (~100 articles + ~120 cases). On `STORAGE_LIMIT_EXCEEDED`,
> reduce the set.

**4d. Index into Coveo** **[guided]** — rebuild your Salesforce Coveo source so
the articles + the two picklists index into the support hub. Capture the Coveo
field names (often `sfvehicle_category__c` / `sfproblem_type__c`) into
`coveo.support.fields.*`.

---

## Phase 5 — Per-feature wiring

Only configure features you enabled. Each needs some console work **[guided]**.

- **Recommendations** — create a home-page recommendation slot in the
  Merchandising Hub; save the slot id to `coveo.recommendations.homeSlotId`. The
  rail stays empty until the model trains on behavior events (expected on a
  fresh org).
- **Ask Coveo AI** — create a Search Agent grounded on the commerce content;
  save `coveo.searchAgent.agentId`, `.searchHub`, and a **non-expiring** API key
  to `.token` (JWT search tokens expire and cause 401s).
- **Try CPD!** — ensure Conversational Product Discovery is enabled; save a
  non-expiring "Execute agent queries" API key to `coveo.cpd.token`.
- **Technical Support** — needs Phase 4; save `coveo.support.searchHub` and
  `coveo.support.caseAssistId`.

To seed behavior events for ML-driven surfaces (optional):

```bash
COVEO_ORG_ID=<org> COVEO_TRACKING_ID=<tracking> COVEO_CURRENCY=USD \
  STOREFRONT_BASE="https://your-store.example.com" \
  node scripts/send-ua-visits.mjs <analytics-push-token> 1500
```

---

## Phase 6 — Verify & launch

```bash
npm run build     # must pass
npm run dev       # boots the storefront now that config is complete
```

Smoke-test each enabled surface:

- **Search** (home): products load; a search returns results; a PDP opens.
- **Recommendations**: the home rail shows products (empty is OK until the model
  trains).
- **Ask Coveo AI** (`/ask`): a question streams an answer with citations.
- **Try CPD!** (`/discover`): a query returns product cards.
- **Support** (`/support`): the funnel runs; the articles step returns tagged
  articles; a quick-view overlay opens; submitting a case reaches Web-to-Case.

You can re-open the wizard anytime at `/setup` to change values. Keep
`demo.config.json` out of version control (it's git-ignored) and never commit
real tokens.
