# Phase 1 — Prerequisites

Goal: make sure the tools the setup needs are installed and authenticated.

## Required tools

| Tool | Why | Check |
| --- | --- | --- |
| Node.js 20+ | runs the app + the setup scripts | `node --version` |
| npm | installs dependencies | `npm --version` |
| git | clone / version control | `git --version` |
| Salesforce CLI (`sf`) | seeds Knowledge + Cases, reads org info | `sf --version` |
| A package manager for installs | Homebrew (macOS), apt/dnf (Linux), winget (Windows) | `brew --version` etc. |

## Steps

1. Run `scripts/check-prereqs.sh` and report what's present/missing.
2. For anything missing, offer to install it **with the user's confirmation**:
   - macOS: `brew install node` / `brew install --cask sf` (or
     `npm install -g @salesforce/cli`).
   - Linux: use the distro package manager or the official installers.
   - Windows: `winget install OpenJS.NodeJS` / `winget install Salesforce.CLI`.
   Do not install silently — show the command, explain it, then run it only if
   the user agrees. Some installs need sudo/admin; the user may need to run
   those themselves.
3. **Salesforce auth** (needed later, but set it up now so it's ready):
   - Run `sf org login web` — this opens a browser for the user to log in. You
     cannot automate the browser step; trigger it and wait for them to finish.
   - After login, run `sf org list` and confirm their org appears. Capture the
     org **alias** and **username**; you'll save the alias into
     `demo.config.json` (`salesforce.orgAlias`).
4. **Coveo access**: the user needs (a) their Coveo **organization id** and
   (b) a token. Two tokens matter:
   - a **public anonymous search/commerce API key** (for the storefront), and
   - a **privileged API key** for setup (create source, create fields, push
     catalog). The privileged key is used only by the setup scripts and is
     NOT stored in `demo.config.json`; pass it as an environment variable when
     running a script. Tell the user to create it in the Coveo Admin Console
     (Organization → API Keys) with source push + field edit privileges.
5. Install project dependencies: `npm install` (confirm, then run).

## Done when

- `node`, `npm`, `git`, `sf` all report versions.
- `sf org list` shows the user's authenticated org.
- `npm install` has completed.

Then continue to `references/02-configuration.md`.
