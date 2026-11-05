# Demo — Commerce Site RC

A downloadable, self-provisioning demo of a Coveo-powered commerce storefront —
the fictional **Fallen Angels RC** hobby store (remote-control cars, planes,
boats, drones, and parts). It showcases, on one site:

- **Commerce search & browse** — product grid, facets, listing pages, PDPs.
- **Recommendations** — a home-page rail driven by a Coveo ML model.
- **Ask Coveo AI** — a conversational Search Agent with cited answers.
- **Try CPD!** — Conversational Product Discovery (agentic commerce).
- **Technical Support** — a guided case-deflection funnel backed by Salesforce
  Knowledge + Cases, with live article suggestions and Web-to-Case creation.

It is a **templated** copy of a working storefront: it ships with **no real org
values**. You provide your own Coveo and Salesforce orgs, and a setup wizard
plus a [Kiro](https://kiro.dev) skill walk you through wiring everything up.

> Unofficial demo / sample project, not an official Coveo product. See
> [`LICENSE`](./LICENSE).

## How setup works

There are two cooperating pieces:

1. **A browser setup wizard.** On first run — when there is no
   `demo.config.json` yet — the app boots into *setup mode* and renders a wizard
   (also reachable at `/setup`). You type in your Coveo org, Salesforce org,
   search hubs, tracking id, tokens, image settings, and flip on only the
   features you want. It writes `demo.config.json`, the single source of truth
   the whole app reads from.

2. **A Kiro setup skill** (`.kiro/skills/setup-demo/`). Open this repo in Kiro
   and run **`/setup-demo`** (or just ask Kiro to set the demo up). The skill
   drives the whole flow: it checks prerequisites, points you to the wizard,
   then **automates what it safely can** (create the Coveo source, create and
   map fields, push the catalog, seed Salesforce Knowledge + Cases, run the
   build) and **guides** you through the console-only steps (org setup, catalog
   config + storefront association, ML model training, agents).

The wizard and the skill talk to each other through a small file-backed
"bridge" so Kiro can post progress and ask you questions right in the browser
while it works.

See [`SETUP.md`](./SETUP.md) for the full step-by-step guide, and
[`docs/demo-setup-design.md`](./docs/demo-setup-design.md) for the architecture.

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/ChBilodeau/Demo-Commerce-Site-RC.git
cd Demo-Commerce-Site-RC
npm install

# 2. Start the dev server — with no demo.config.json it opens the setup wizard
npm run dev
```

Then either:

- **With Kiro (recommended):** open the folder in Kiro and run `/setup-demo`.
  Kiro guides you through everything and automates the provisioning.
- **By hand:** fill in the wizard, copy `demo.config.example.json` to
  `demo.config.json` if you prefer editing JSON, then follow [`SETUP.md`](./SETUP.md)
  to provision Coveo and Salesforce yourself.

Once `demo.config.json` is complete, `npm run dev` boots the storefront instead
of the wizard.

## Prerequisites

- **Node.js 20+** and **npm**
- **git**
- A **Coveo organization**, with:
  - a public anonymous **search/commerce API key** (for the storefront), and
  - a privileged **setup API key** (source push + field edit) used only by the
    setup scripts — never stored in `demo.config.json`.
- For the Support feature: the **Salesforce CLI (`sf`)** and a Salesforce org
  with Lightning Knowledge.
- For product images: a **Cloudinary** account (or another image host).

The `/setup-demo` skill detects these and offers to install the missing CLIs
with your confirmation.

## Configuration

Everything org-specific lives in **`demo.config.json`** at the repo root. It is
**git-ignored** — your tokens never get committed. The committed
[`demo.config.example.json`](./demo.config.example.json) documents the full
shape. The app reads it through `src/config/demoConfig.ts`; the
`features.*` flags gate which surfaces are active.

## Project layout

```
src/
  config/demoConfig.ts     config contract — the single source of truth
  engine/                  Coveo engines/agents (commerce, search agent, CPD, support)
  components/              storefront UI (grid, facets, PDP, support funnel, …)
  setup/                   the browser setup wizard (setup mode)
vite-setup-bridge.ts       dev-only Vite plugin: the wizard ↔ Kiro bridge
scripts/                   catalog generators + Coveo push + analytics seeding
salesforce/                Apex/CLI assets to seed Knowledge + Cases
.kiro/skills/setup-demo/   the Kiro setup skill (SKILL.md + references + scripts)
docs/demo-setup-design.md  architecture of the setup system
```

## Scripts

- `npm run dev` — start the dev server (setup wizard until configured).
- `npm run build` — type-check and build for production.
- `npm run preview` — preview the production build.
- `npm run typecheck` — type-check without emitting.

## Security

- Never commit `demo.config.json` or any real tokens (it is git-ignored).
- Only ever put **public, query-only** Coveo keys in values that reach the
  browser bundle. Keep the privileged setup key out of config — pass it to the
  setup scripts as an environment variable.
- The product catalog, brand names, and images are fictional / for
  demonstration only.
