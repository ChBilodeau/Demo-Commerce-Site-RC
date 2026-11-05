/*
 * verify-coveo.mjs — confirm the demo's Coveo content is actually queryable.
 *
 * Runs read-only Commerce API queries against the user's org and reports what
 * came back. A passing build does NOT prove the catalog is live; this does.
 *
 * Config is read from demo.config.json at the repo root (written by the setup
 * wizard). You can override any value with an env var, which is handy before
 * the wizard has been filled in:
 *   COVEO_ORG_ID        overrides coveo.organizationId
 *   COVEO_ACCESS_TOKEN  overrides coveo.accessToken (search/API key or token)
 *   COVEO_TRACKING_ID   overrides coveo.commerce.trackingId
 *   COVEO_SEARCH_HUB    overrides coveo.commerce.searchHub
 *
 * This script only READS. It is safe to run any time.
 *
 * Usage (from repo root):
 *   node .kiro/skills/setup-demo/scripts/verify-coveo.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadConfig() {
  // Walk up from cwd looking for demo.config.json so the script works from
  // the repo root or the skill folder.
  const candidates = [
    resolve(process.cwd(), 'demo.config.json'),
    resolve(process.cwd(), '../../../../demo.config.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      // try next
    }
  }
  return null;
}

const cfg = loadConfig() || {};
const coveo = cfg.coveo || {};
const commerce = coveo.commerce || {};
const support = coveo.support || {};
const features = cfg.features || {};

const ORG = process.env.COVEO_ORG_ID || coveo.organizationId;
const TOKEN = process.env.COVEO_ACCESS_TOKEN || coveo.accessToken;
const TRACKING_ID = process.env.COVEO_TRACKING_ID || commerce.trackingId;
const SEARCH_HUB = process.env.COVEO_SEARCH_HUB || commerce.searchHub;
const REGION = coveo.region || 'us';
const LOCALE = commerce.locale || { language: 'en', country: 'US', currency: 'USD' };

const missing = [];
if (!ORG) missing.push('organizationId');
if (!TOKEN) missing.push('accessToken');
if (!TRACKING_ID) missing.push('commerce.trackingId');
if (missing.length) {
  console.error('Cannot verify — missing required config: ' + missing.join(', '));
  console.error('Fill these in the setup wizard (demo.config.json) or pass env vars.');
  process.exit(1);
}

// Commerce API host is org-scoped: <org>.org[.<region>].coveo.com
const ORG_HOST =
  REGION === 'us'
    ? `${ORG}.org.coveo.com`
    : `${ORG}.org.${REGION}.coveo.com`;

const commerceUrl = `https://${ORG_HOST}/rest/organizations/${ORG}/commerce/v2/search`;

function clientId() {
  // Stable-ish id for analytics association; value itself doesn't matter here.
  return '00000000-0000-4000-8000-000000000001';
}

async function commerceSearch({ query = '', hub }) {
  const body = {
    trackingId: TRACKING_ID,
    language: LOCALE.language || 'en',
    country: LOCALE.country || 'US',
    currency: LOCALE.currency || 'USD',
    clientId: clientId(),
    context: { view: { url: cfg.storefront?.baseUrl || 'https://demo.local/' } },
    query,
  };
  if (hub) body.context.capture = true;

  const res = await fetch(commerceUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  return { ok: res.ok, status: res.status, data, text };
}

let hadError = false;

// 1) Commerce catalog — the always-on surface.
console.log(`\n→ Commerce search  (org ${ORG}, region ${REGION})`);
{
  const r = await commerceSearch({ query: '' });
  if (!r.ok) {
    hadError = true;
    console.error(`  FAIL  HTTP ${r.status}`);
    console.error('  ' + (r.text || '').slice(0, 400));
  } else {
    const products = r.data.products || r.data.items || [];
    const total =
      r.data.pagination?.totalEntries ??
      r.data.totalNumberOfResults ??
      products.length;
    if (!products.length) {
      console.warn('  WARN  query succeeded but returned 0 products.');
      console.warn('        Check the catalog push + storefront association.');
    } else {
      console.log(`  OK    ${products.length} products returned (total ~${total}).`);
      const sample = products.slice(0, 3).map((p) => p.ec_name || p.name || p.permanentid || '?');
      console.log('        e.g. ' + sample.join(', '));
    }
  }
}

// 2) Support hub — only if the user enabled Support.
if (features.support && support.searchHub) {
  console.log(`\n→ Support content  (searchHub ${support.searchHub})`);
  const SEARCH_HOST =
    REGION === 'us'
      ? `${ORG}.org.coveo.com`
      : `${ORG}.org.${REGION}.coveo.com`;
  const searchUrl = `https://${SEARCH_HOST}/rest/search/v2?organizationId=${ORG}`;
  const supportToken = support.caseAssistToken || TOKEN;
  const res = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supportToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: '', searchHub: support.searchHub, numberOfResults: 5 }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    hadError = true;
    console.error(`  FAIL  HTTP ${res.status}`);
    console.error('  ' + text.slice(0, 400));
  } else {
    const total = data.totalCount ?? data.totalCountFiltered ?? (data.results || []).length;
    if (!total) {
      console.warn('  WARN  support hub returned 0 results — check the source + hub.');
    } else {
      console.log(`  OK    ~${total} support items indexed.`);
    }
  }
} else if (features.support) {
  console.warn('\n→ Support enabled but coveo.support.searchHub is empty — skipping.');
}

console.log('');
if (hadError) {
  console.error('Verification finished WITH errors. See FAIL lines above.');
  process.exit(1);
}
console.log('Verification finished. Review any WARN lines above.');
