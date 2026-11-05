---
name: setup-demo
description: Guide and automate first-time setup of this Coveo commerce demo (Fallen Angels RC). Use when the user clones this repo, runs it for the first time, asks to set it up, configure it, connect their Coveo/Salesforce org, or when the storefront shows the setup wizard. Drives the whole flow — prerequisites, the browser setup wizard, Coveo source/fields/catalog, Salesforce seeding, and verification.
metadata:
  version: "1.0.0"
---

# Set up the Commerce Site RC demo

You are guiding a first-time user through setting up this downloadable demo
against THEIR own Coveo + Salesforce orgs. Automate everything you safely can
via CLI/API; for console-only steps, give exact instructions and verify after.

## Golden rules

- **Never invent org values.** Every org-specific value comes from the user,
  via the setup wizard (`demo.config.json`) or by asking. Don't guess ids,
  hubs, tokens, or field names.
- **Confirm before destructive or account-changing actions** (installing
  software, pushing to a Coveo source, writing to Salesforce). Explain what
  will happen, then do it.
- **Verify each stage** before moving on. A command exiting 0 is not proof the
  thing works — check the actual result (counts, a live query, a file).
- **Prefer the wizard for data entry.** Point the user to the running wizard to
  type values; read them back from `demo.config.json`. Use the bridge to post
  questions when you need something mid-run (see "The setup bridge").
- Work in phases; tell the user where they are and what's next.

## The setup bridge (how you talk to the browser wizard)

The dev server exposes a file-backed bridge. You interact with it through files
at the repo root:

- `demo.config.json` — the user's config (the wizard writes it; you read it).
- `.kiro/setup-bridge/status.json` — write `{ "phase", "message", "progress" }`
  here to show live progress in the wizard.
- `.kiro/setup-bridge/messages.json` — write an array of
  `{ "id", "question", "help" }` to ask the user something in the wizard.
- `.kiro/setup-bridge/answers.json` — the wizard appends
  `{ "id", "value", "at" }`; read it to get the user's answers.

Always create `.kiro/setup-bridge/` if missing before writing to it. Poll
`answers.json` after posting a question.

## Flow overview

Follow these in order. The detailed, copy-ready steps for each are in the
`references/` files — open the referenced file when you reach that phase.

1. **Prerequisites** — detect and (with confirmation) install required CLIs.
   See `references/01-prerequisites.md`.
2. **Collect configuration** — make sure the dev server is running, send the
   user to the wizard, and read back `demo.config.json`.
   See `references/02-configuration.md`.
3. **Coveo setup** — create the commerce push source, create + map fields, push
   the catalog; guide catalog-config + storefront-association (console).
   See `references/03-coveo.md`.
4. **Salesforce setup** — org + Knowledge check, custom fields (guided), seed
   Knowledge + Cases (automated via `sf`).
   See `references/04-salesforce.md`.
5. **Per-feature wiring** — enable only the features the user turned on
   (recommendations, Ask Coveo AI, Try CPD!, Support) and guide the
   console-only pieces (ML models, agents, behaviors).
   See `references/05-features.md`.
6. **Verify & launch** — run the build, start the storefront, smoke-test each
   enabled surface. See `references/06-verify.md`.

## Automated vs. guided — set expectations up front

Tell the user this at the start so nothing is a surprise:

**You (the skill) automate:** CLI detection/install, creating the Coveo source,
creating + mapping fields, pushing the catalog, seeding Salesforce Knowledge +
Cases, writing config, running the build.

**You guide (user does it in a console, you give exact steps + verify):**
creating the Salesforce org + enabling Lightning Knowledge, creating the
Web-to-Case custom fields, creating the Coveo catalog config + storefront
association, CMH listing pages, training ML / recommendation models, creating
the Search Agent + answer-language behaviors, and the CPD agent.

## Start here

1. Greet the user, state the automated-vs-guided split above.
2. Open `references/01-prerequisites.md` and run the prerequisite checks.
3. Proceed phase by phase, updating `status.json` as you go, and asking via the
   bridge or chat when you need a value you don't have.

Helper scripts you can run (deterministic steps) live in `scripts/`:
- `scripts/check-prereqs.sh` — report which required tools are installed.
- `scripts/coveo-create-source.mjs` — create a Coveo push source (guided by env).
- `scripts/verify-coveo.mjs` — confirm the commerce + support content is queryable.

Read a script before running it, and confirm with the user first for anything
that writes to their org.
