/*
 * coveo-create-source.mjs — create a Catalog/Push source in the user's Coveo org.
 *
 * Reads config from environment variables (the privileged key is NEVER written
 * to demo.config.json):
 *   COVEO_ORG_ID      the organization id
 *   COVEO_REGION      us | eu | au | ca   (default: us)
 *   COVEO_SETUP_KEY   a privileged API key with source-create privilege
 *   COVEO_SOURCE_NAME display name for the source (default: "RC Demo Catalog")
 *
 * Prints the new source id on success. Save it into demo.config.json
 * (coveo.commerce.sourceId). This WRITES to the org — confirm with the user
 * before running.
 *
 * Usage:
 *   COVEO_ORG_ID=... COVEO_SETUP_KEY=... node coveo-create-source.mjs
 */

const ORG = process.env.COVEO_ORG_ID;
const REGION = process.env.COVEO_REGION || 'us';
const KEY = process.env.COVEO_SETUP_KEY;
const NAME = process.env.COVEO_SOURCE_NAME || 'RC Demo Catalog';

if (!ORG || !KEY) {
  console.error('Missing COVEO_ORG_ID and/or COVEO_SETUP_KEY env vars.');
  process.exit(1);
}

// Regional platform host for admin/config calls.
const HOST =
  REGION === 'us'
    ? 'platform.cloud.coveo.com'
    : `platform-${REGION}.cloud.coveo.com`;

const url = `https://${HOST}/rest/organizations/${ORG}/sources`;

const body = {
  sourceType: 'CATALOG',
  name: NAME,
  sourceVisibility: 'SHARED',
  pushEnabled: true,
  streamEnabled: true,
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Source creation failed: HTTP ${res.status}`);
  console.error(text.slice(0, 500));
  process.exit(1);
}

let data;
try {
  data = JSON.parse(text);
} catch {
  data = {};
}
const sourceId = data.id || data.sourceId || '(check the Admin Console)';
console.log(`Created source "${NAME}"`);
console.log(`SOURCE_ID=${sourceId}`);
console.log('Save this into demo.config.json -> coveo.commerce.sourceId');
