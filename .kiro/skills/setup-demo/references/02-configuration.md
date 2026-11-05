# Phase 2 — Collect configuration (the wizard)

Goal: get all the user's org values into `demo.config.json` via the browser
setup wizard, then read them back.

## Steps

1. Start the dev server if it isn't running: `npm run dev`. Note the printed
   local URL (the port may vary if 5174 is taken).
2. Tell the user to open that URL. With no `demo.config.json` yet, the app boots
   into **setup mode** and shows the wizard automatically (otherwise they can go
   to `/setup`).
3. Explain the wizard: fill in the Coveo core section and flip on only the
   **features** they want for this run (Search is always on; Recommendations,
   Ask Coveo AI, Try CPD!, Support are optional). Enabling a feature reveals its
   fields. The Images section has the Cloudinary steps + the ChatGPT image
   prompt.
4. Some values aren't known yet (e.g. the Coveo source id, the catalog id, the
   Salesforce Web-to-Case field ids, the support field names). That's fine —
   those get filled in during the Coveo/Salesforce phases. Have the user enter
   what they know now (org id, access token, tracking id, hubs, feature flags,
   Cloudinary cloud, Salesforce org alias) and click **Save configuration**.
5. Read `demo.config.json` from the repo root. Confirm the required core values
   are present: `coveo.organizationId`, `coveo.accessToken`,
   `coveo.commerce.trackingId`. If any are missing, post a question via the
   bridge (`messages.json`) or ask in chat, then re-read after they re-save.
6. Write an initial `status.json` so the wizard shows progress, e.g.
   `{ "phase": "Configuration", "message": "Config received", "progress": 15 }`.

## Using the bridge for a mid-run value

When you need a single value you don't have (e.g. the source id after you create
it), you can either write it into `demo.config.json` directly (you created it,
so you know it) or ask the user to confirm something via a bridge question. Save
derived values (source id, catalog id, field ids) back into `demo.config.json`
yourself so the app picks them up.

## Done when

- `demo.config.json` exists with the required core Coveo values and the chosen
  feature flags.

Continue to `references/03-coveo.md`.
