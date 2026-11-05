# Repo workflow: Demo-Commerce-Site-RC

This is the **public, distributable demo** version of the Fallen Angels RC
storefront. It lives in the GitHub repo `ChBilodeau/Demo-Commerce-Site-RC`
(branch `main`).

## Two-repo rule (IMPORTANT)

There are two related repos:
- `Commerce-Site-RC` — the owner's working RC site (real org values in a local
  `.env.local`, never committed).
- `Demo-Commerce-Site-RC` — THIS repo: a fully templated, public demo with NO
  real org values. Everything org-specific comes from `demo.config.json` that
  each user fills in.

When a bug is fixed or a feature improved, it generally needs to land in BOTH
repos: implement in the working site, then port the same change here (templated,
no hardcoded values). Flag to the owner when a change should be mirrored.

## This repo must contain NO real credentials or org values

- No real Coveo org id, tokens, source/catalog ids, hubs, pipelines, slot ids,
  Salesforce org id, or Web-to-Case field ids anywhere in tracked files.
- All such values are templated via `demo.config.json` (git-ignored) with a
  committed `demo.config.example.json` showing the shape.
- Before every commit, run `git status` and confirm no `.env*` (except
  `.env.example`) and no `demo.config.json` is staged.
- If a real value is ever committed, stop and tell the owner; it stays in
  history and must be scrubbed/rotated.

## Versioning / release

Same discipline as the working site: build must pass, update `CHANGELOG.md`,
bump the version with Semantic Versioning, commit with a clear prefix
(`feat:`/`fix:`/`docs:`/`chore:`), tag `vX.Y.Z`, and push commit + tag. This
demo is built in phases — checkpoint (commit + push) at the end of each phase.

## Git safety

- Never force-push or rewrite pushed history unless explicitly asked.
- Never change global git config.
- Stage specific files by name; avoid `git add -A`.
