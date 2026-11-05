# Downloadable RC Demo — Setup Architecture (Phase 1 design)

This document is the contract for turning the RC storefront into a
self-provisioning, downloadable demo driven by a Kiro skill plus a browser
setup wizard. Review this before any code is written.

## Goals

- A user clones the public repo, runs it, and a **setup wizard** collects their
  org-specific values.
- A **Kiro skill** then drives the setup: automating what it can (CLI/API) and
  guiding the user through console-only steps, verifying each stage.
- Everything org-specific is templated — no hardcoded org id, hubs, pipelines,
  storefront, slot ids, field ids, or Cloudinary cloud.
- The wizard and the skill can communicate **both ways** (the skill can post a
  question to the wizard; the user answers in the browser; the skill reads it).

## The three artifacts and how they relate

```
 ┌─────────────────┐     writes/reads      ┌──────────────────────┐
 │  Setup wizard   │ ───────────────────►  │  demo.config.json    │  ◄── the app reads this
 │  (/setup page   │ ◄───────────────────  │  (source of truth)   │
 │   in the app)   │                       └──────────────────────┘
 │                 │     two-way bridge     ┌──────────────────────┐
 │                 │ ◄──────────────────►  │  .kiro/setup-bridge  │  ◄── skill <-> wizard messages
 └─────────────────┘                       └──────────────────────┘
          ▲                                           ▲
          │ user fills in / answers                   │ reads answers, posts questions
          │                                           │
      ┌───────┐                                  ┌──────────┐
      │ user  │                                  │  Kiro    │
      └───────┘                                  │  skill   │
                                                 └──────────┘
```

### 1. `demo.config.json` — the source of truth (git-ignored)

One JSON file every org-specific value lives in. The app reads it at runtime
(dev server), and the skill reads/writes it. A committed `demo.config.example.json`
documents the shape. Proposed schema (v1):

```jsonc
{
  "version": 1,
  "coveo": {
    "organizationId": "",           // e.g. mycompanyxyz
    "region": "us",                 // us | eu | au | ca
    "accessToken": "",              // public anonymous search/commerce key (VITE_*)
    "commerce": {
      "trackingId": "",             // storefront association tracking id
      "searchHub": "",              // commerce search hub (e.g. "My Commerce")
      "catalogId": "",              // resolved from the storefront association
      "sourceId": "",               // the push source id (set after creation)
      "locale": { "language": "en", "country": "US", "currency": "USD" }
    },
    "searchAgent": {                // Ask Coveo AI (optional feature)
      "enabled": false,
      "agentId": "",
      "searchHub": "",              // e.g. "My Commerce"
      "token": ""                   // non-expiring API key
    },
    "cpd": {                        // Try CPD! (optional feature)
      "enabled": false,
      "token": ""
    },
    "support": {                    // Technical Support (optional feature)
      "enabled": false,
      "searchHub": "",              // e.g. "MySupport"
      "caseAssistId": "",
      "caseAssistToken": "",
      "fields": {                   // Coveo field names from the SF source mapping
        "vehicleCategory": "sfvehicle_category__c",
        "problemType": "sfproblem_type__c"
      }
    },
    "recommendations": {
      "homeSlotId": ""              // CMH recommendation slot id (optional)
    }
  },
  "salesforce": {
    "orgAlias": "",                 // the `sf` CLI target-org alias
    "orgId": "",
    "webToCase": {
      "orgId": "",                  // 18-char Web-to-Case org id
      "fieldIds": {                 // the 00N... custom field ids
        "vehicleCategory": "",
        "problemType": "",
        "viewedArticles": ""
      }
    }
  },
  "images": {
    "provider": "cloudinary",
    "cloudName": "",                // the user's Cloudinary cloud
    "baseTransform": "f_auto,q_auto,w_600"
  },
  "features": {                     // which demo surfaces are turned on
    "search": true,
    "recommendations": false,
    "askCoveoAI": false,
    "tryCPD": false,
    "support": false
  }
}
```

Every value hardcoded today maps to a key above. The app builds its `VITE_*`
values and all engine config (org id, hubs, slot ids, field names, Cloudinary
cloud) from this file. `features` lets a user run a minimal demo (search only)
or the full thing.

### 2. The setup wizard (`/setup` route in the app)

- Renders a form grouped by the schema sections (Coveo, Salesforce, Images,
  Features), with help text, the ChatGPT image prompt, and the Cloudinary steps
  inline (your #6).
- "Save" writes `demo.config.json` (see "How the browser writes a file" below).
- Shows setup **status/progress** and any **questions the skill posts** (the
  two-way part).
- The app boots into **setup mode** when `demo.config.json` is missing or
  incomplete, so a freshly cloned repo opens on the wizard instead of crashing
  on a missing token.

### 3. The two-way bridge (`.kiro/setup-bridge/`)

Browser JS cannot write arbitrary files or call Kiro directly, and Kiro cannot
push to an open browser. The bridge is a **small local HTTP endpoint added to
the Vite dev server** (a tiny dev-only middleware/plugin) that both sides use:

- `POST /__setup/config`  → the wizard saves `demo.config.json` to disk.
- `GET  /__setup/config`  → the wizard/app loads it.
- `GET  /__setup/messages`→ the wizard polls for questions the skill posted.
- `POST /__setup/answer`  → the wizard sends the user's answer back.

The skill reads/writes the same files the middleware serves
(`demo.config.json`, `.kiro/setup-bridge/messages.json`,
`.kiro/setup-bridge/answers.json`). So the flow for a skill-posted question is:

1. Skill writes a question to `messages.json`.
2. Wizard polls `GET /__setup/messages`, shows it, user answers.
3. Wizard `POST /__setup/answer` → middleware appends to `answers.json`.
4. Skill reads `answers.json` and continues.

This keeps the browser sandbox-safe (it only talks to the local dev server) and
gives the skill a plain-file interface it already knows how to use.

> Why a Vite middleware and not a separate server: the demo already runs on
> Vite; adding a dev-only plugin avoids a second process and any new runtime
> dependency. It's dev-only (never shipped in a production build).

## Automated vs. guided (the honest split)

The skill will clearly label each step. Draft split:

**Automated by the skill (CLI/API, with the user's confirmation):**
- Detect/install prerequisites (node, sf CLI, git) via the OS package manager.
- Create the Coveo push source; create + map fields; push the catalog.
- Seed Salesforce (Knowledge + Cases + custom fields) via `sf` CLI.
- Write `demo.config.json` / `.env.local`; run `npm install` + build.

**Guided (console-only, skill gives exact steps + verifies after):**
- Create the Salesforce org + enable Lightning Knowledge; `sf org login`.
- Create the Web-to-Case custom fields (and capture their 00N ids).
- Create the catalog config + storefront association in Coveo.
- CMH listing pages.
- Train ML / recommendation models.
- Search Agent creation + answer-language behaviors; CPD agent.
- Cloudinary account + image generation (ChatGPT prompt provided).

## Open design decisions for your sign-off

1. **Bridge mechanism** — the Vite dev-middleware + shared files approach above.
   It's the least-friction way to get the two-way browser↔skill channel without
   a second server or breaking the browser sandbox. OK with this?
2. **Config lives at repo root as `demo.config.json`** (git-ignored), with
   `demo.config.example.json` committed. OK?
3. **Feature flags** drive which surfaces render, so a user can do "search only"
   first and enable the rest later. OK?

## Phases (unchanged from agreement)

1. This design (config contract + bridge). ← you are here
2. Template the codebase onto `demo.config.json`.
3. Setup wizard page + setup-mode boot + the Vite bridge middleware.
4. The Kiro skill (automation runbook using the bridge).
5. Docs + Salesforce asset packaging + LICENSE + org-specific scrub.
