# Changelog — Demo-Commerce-Site-RC

The distributable, self-provisioning demo version of the Fallen Angels RC
storefront. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/).

Built in phases (see `docs/demo-setup-design.md`):
1. Config contract + bridge design
2. Template the codebase onto `demo.config.json`
3. Setup wizard page + setup-mode boot + Vite bridge
4. The Kiro setup skill
5. Docs + Salesforce asset packaging + LICENSE + scrub

## [Unreleased]

## [1.0.0] - 2026-11-05

First public release: a turnkey, self-provisioning demo of the Fallen Angels RC
storefront that carries no real org values. Clone it, run the setup wizard (or
the Kiro `/setup-demo` skill), and point it at your own Coveo + Salesforce orgs.

### Added
- Phase 1: project scaffold copied from the working RC site (no real org
  values) and the setup architecture design doc
  (`docs/demo-setup-design.md`).
- Phase 2: central config system. `src/config/demoConfig.ts` reads
  `demo.config.json` (git-ignored; `demo.config.example.json` documents the
  shape) and every engine/UI value — Coveo org id, tokens, tracking id, search
  hubs, recommendation slot id, support field names, Cloudinary cloud, brand
  images, feature flags — is now read from it. No org-specific value is
  hardcoded anywhere (verified). Feature flags gate each surface. Cart storage
  keys and brand image URLs are templated; the brand background texture and
  favicon were made generic.
- Phase 3: setup wizard + two-way bridge. The app boots into "setup mode" when
  `demo.config.json` is missing (or at `/setup`), rendering a browser wizard
  (`src/setup/`) that collects every config value, shows the Cloudinary steps +
  ChatGPT image prompt, and saves the config. A dev-only Vite plugin
  (`vite-setup-bridge.ts`) adds `/__setup/*` endpoints backed by files so the
  wizard and the Kiro skill communicate both ways (skill posts
  questions/status; user answers in the browser). Verified end-to-end.
- Phase 4: the Kiro setup skill (`.kiro/skills/setup-demo/`). `SKILL.md` drives
  the whole first-time setup — it states the automated-vs-guided split, explains
  the file-backed setup bridge, and sequences six phases, each with a
  copy-ready reference in `references/` (prerequisites, configuration, Coveo,
  Salesforce, per-feature wiring, verify & launch). Ships three helper scripts
  in `scripts/`: `check-prereqs.sh` (reports installed CLIs),
  `coveo-create-source.mjs` (creates the Coveo catalog push source from env),
  and `verify-coveo.mjs` (read-only Commerce/support queries that confirm the
  content is actually queryable). Auto-discovered by Kiro and runnable via the
  `/setup-demo` slash command.
- Phase 5: distribution polish. A full `README.md` and a step-by-step
  `SETUP.md` (mirrors the skill phases for manual setup), and an MIT `LICENSE`
  (the repo is public).

### Changed
- Phase 5: the catalog/analytics scripts under `scripts/` and the Salesforce
  seed assets under `salesforce/` now read org-specific values from environment
  variables (`STOREFRONT_BASE`, `CLOUDINARY_CLOUD`, `COVEO_ORG_ID`,
  `COVEO_TRACKING_ID`, …) with safe placeholder defaults, instead of hardcoding
  them. Source-code comments that named internal hubs/URLs now point at the
  corresponding `demo.config.json` value. Salesforce run commands use a
  `<your-org-alias>` placeholder. `package.json` name/description/version
  updated for the demo.

### Removed
- Phase 5: `.env.example` — the app reads `demo.config.json`, not `.env`, so the
  file was dead weight and referenced an internal base URL. `.gitignore` no
  longer whitelists it.

### Security
- Phase 5: full scrub of the tracked tree — verified no real Coveo org id,
  Salesforce org id, Web-to-Case field ids, agent/page ids, tracking id, search
  hub name, Cloudinary cloud name, or API tokens remain anywhere in the repo.
  `demo.config.json`, `.env.local`, and `.kiro/setup-bridge/` stay git-ignored.

[Unreleased]: https://github.com/ChBilodeau/Demo-Commerce-Site-RC/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ChBilodeau/Demo-Commerce-Site-RC/releases/tag/v1.0.0
