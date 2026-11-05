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
