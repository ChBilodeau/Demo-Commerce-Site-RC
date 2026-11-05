# Demo — Commerce Site RC

A downloadable, self-provisioning demo of a Coveo-powered commerce storefront
(the "Fallen Angels RC" hobby store), with search, recommendations, a
conversational Ask-AI, Conversational Product Discovery, and a guided Technical
Support experience backed by Salesforce Knowledge + Cases.

> **Status: under construction.** This repo is being built in phases into a
> turnkey demo. It is a templated copy of a working storefront — it contains
> **no real org values**; you provide yours via a setup wizard and a Kiro skill
> that drives the configuration. See `docs/demo-setup-design.md` for the plan.

## What you'll be able to do (goal)

1. Clone this repo and run it.
2. A **setup wizard** collects your Coveo org, Salesforce org, chosen search
   hubs / pipelines / storefront names, tokens, and image settings.
3. A **Kiro skill** then provisions as much as possible automatically (Coveo
   source + fields + catalog push, Salesforce seeding, config/env, build) and
   guides you through the console-only steps (org setup, catalog config, ML
   model training, agents).

## Prerequisites (will be finalized in a later phase)

- Node.js 20+
- The Salesforce CLI (`sf`) and a Salesforce org with Lightning Knowledge
- A Coveo organization and an API/platform token for setup
- A Cloudinary account (or another image host) for product images

Detailed, step-by-step setup docs are coming as the build progresses.
