/*
 * send-ua-visits.mjs
 * -----------------------------------------------------------------------------
 * Generates realistic, well-formed Coveo Commerce Event Protocol (EP) usage
 * analytics to bootstrap the Product Recommendation (PR) model so the home-page
 * recommendations start returning results.
 *
 * WHY / WHAT COVEO EXPECTS (from the docs):
 *   - A PR model needs >= 10,000 view and/or purchase events to serve relevant
 *     recommendations. (docs.coveo.com "Create and manage a PR model")
 *   - The EP commerce events we send are: ec.productView (primary PR signal),
 *     ec.purchase (strong signal), and ec.cartAction (funnel). We do NOT send
 *     ec.productClick: a click's responseId must match a real commerce search
 *     response UUID, and synthetic clicks are rejected ("Click without
 *     associated search"). Views/cart/purchase need no search association.
 *   - Events POST to the Event API as a JSON ARRAY. productId MUST match the
 *     catalog's product identifier exactly (we read real IDs from ua-products.json).
 *
 * EACH "VISIT":
 *   - Unique clientId (UUID) = a distinct anonymous user/session.
 *   - Browses within ONE category (coherent co-views teach the model real
 *     product relationships, not uniform noise).
 *   - 3-8 productView events, popularity-weighted.
 *   - ~30% add to cart, ~12% purchase. Occasional productClick.
 *   - Timestamps backdated across the last ~21 days so it looks like organic
 *     accumulated traffic rather than one spike.
 *
 * USAGE:
 *   node scripts/send-ua-visits.mjs <ANALYTICS_PUSH_TOKEN> [visits]
 *   e.g. node scripts/send-ua-visits.mjs xxXXXX 1500
 *
 * The token needs the "Analytics data: Push" privilege (the Anonymous Case
 * Assist key works). Default visits = 1500 (~9-10k views, clears the threshold).
 * -----------------------------------------------------------------------------
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORG = '__COVEO_ORG_ID__';
const TRACKING_ID = 'chbi-shop';
const CURRENCY = 'CAD';
const BASE_URL = 'https://chbi-shop.example.com';
const EVENT_URL = `https://${ORG}.analytics.org.coveo.com/rest/organizations/${ORG}/events/v1`;

const TOKEN = process.argv[2];
const VISITS = Number.parseInt(process.argv[3] ?? '1500', 10);
const DRY_RUN = process.argv.includes('--dry-run');
// Purchase-heavy mode: most visits convert and buy 1-3 items. Use this to feed
// "popularBought" style strategies, which require Purchase events and have no
// fallback to views.
const PURCHASE_HEAVY = process.argv.includes('--purchase-heavy');

if (!TOKEN) {
  console.error('Usage: node scripts/send-ua-visits.mjs <ANALYTICS_PUSH_TOKEN> [visits] [--dry-run]');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(join(__dirname, 'ua-products.json'), 'utf8'));
if (!products.length) {
  console.error('No products in scripts/ua-products.json');
  process.exit(1);
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Group products by top-level category so a visit browses coherently. ──────
const byCategory = new Map();
for (const p of products) {
  const top = (p.category || 'Other').split(/[;|]/)[0].trim() || 'Other';
  if (!byCategory.has(top)) byCategory.set(top, []);
  byCategory.get(top).push(p);
}
const categories = [...byCategory.keys()];

// ── Popularity weighting: give each category a Zipf-like weight so some ──────
// products get viewed far more than others (real popularity signal). ─────────
function weightedPick(arr) {
  // Favor the front of the (shuffled-per-visit) list.
  const r = Math.random() ** 2; // bias toward 0 -> front items
  return arr[Math.floor(r * arr.length)];
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const DAY = 86_400_000;
const NOW = Date.now();

function meta(type, clientId, ts, location, referrer) {
  return {
    type,
    ts,
    location,
    referrer,
    config: { trackingId: TRACKING_ID },
    source: ['custom.ua-seeder@1.0.0'],
    userAgent: UA,
    clientId,
  };
}

// Build all events for a single visit. Returns an array of EP events.
function buildVisit() {
  const clientId = randomUUID();
  const category = categories[randInt(0, categories.length - 1)];
  const pool = shuffle(byCategory.get(category));
  // Session start time, backdated across the last 21 days.
  let ts = NOW - randInt(0, 21) * DAY - randInt(0, DAY);
  const slug = category.toLowerCase().replace(/[^a-z]+/g, '-');
  const listingUrl = `${BASE_URL}/browse/${slug}`;
  const events = [];

  const viewCount = randInt(3, 8);
  const viewed = [];
  for (let i = 0; i < viewCount; i++) {
    const p = weightedPick(pool);
    viewed.push(p);
    ts += randInt(4000, 45000); // seconds between actions
    const pdpUrl = `${BASE_URL}/product/${encodeURIComponent(p.productId)}`;
    // NOTE: we deliberately do NOT emit ec.productClick here. A click's
    // responseId must match a real commerce search/listing/recommendation
    // response UUID; synthetic clicks with a random responseId are rejected by
    // the analytics pipeline ("Click without associated search"). The PR model
    // only needs views + purchases, which don't require a search association.
    events.push({
      ...wrap('ec.productView', clientId, ts + 500, pdpUrl, listingUrl),
      product: prod(p),
    });
  }

  // Cart-add + purchase rates. In purchase-heavy mode nearly every visit buys
  // 1-3 of the viewed items (feeds popularBought, which needs Purchase events
  // and has no fallback). In normal mode it's a realistic ~30% cart / ~12% buy.
  const cartChance = PURCHASE_HEAVY ? 0.9 : 0.3;
  const buyChance = PURCHASE_HEAVY ? 0.95 : 0.4;

  let cartItems = [];
  if (viewed.length && Math.random() < cartChance) {
    const n = PURCHASE_HEAVY ? randInt(1, Math.min(3, viewed.length)) : 1;
    // Pick popularity-weighted items so some products accumulate more buys.
    const picks = new Set();
    for (let k = 0; k < n; k++) picks.add(weightedPick(viewed));
    cartItems = [...picks];
    for (const item of cartItems) {
      ts += randInt(5000, 30000);
      const pdpUrl = `${BASE_URL}/product/${encodeURIComponent(item.productId)}`;
      events.push({
        ...wrap('ec.cartAction', clientId, ts, pdpUrl, listingUrl),
        action: 'add',
        product: prod(item),
        quantity: 1,
      });
    }
  }

  if (cartItems.length && Math.random() < buyChance) {
    ts += randInt(10000, 60000);
    const revenue = cartItems.reduce((s, p) => s + (p.price || 0), 0);
    events.push({
      ...wrap('ec.purchase', clientId, ts, `${BASE_URL}/cart`, listingUrl),
      products: cartItems.map((p) => ({ product: prod(p), quantity: 1 })),
      transaction: {
        id: `CHBI-${randInt(100000, 999999)}`,
        revenue: Math.round(revenue * 100) / 100,
      },
    });
  }

  return events;

  // helpers scoped to the visit
  function wrap(type, cid, t, location, referrer) {
    return { meta: meta(type, cid, t, location, referrer), currency: CURRENCY };
  }
}

function prod(p) {
  return { productId: p.productId, name: p.name, price: Number(p.price) || 0 };
}

// ── Generate all events. ─────────────────────────────────────────────────────
const all = [];
const tally = {};
for (let v = 0; v < VISITS; v++) {
  for (const e of buildVisit()) {
    all.push(e);
    tally[e.meta.type] = (tally[e.meta.type] || 0) + 1;
  }
}

console.log(`Generated ${all.length} events across ${VISITS} visits:`);
for (const [t, n] of Object.entries(tally)) console.log(`  ${t}: ${n}`);
console.log(
  `PR-relevant (productView + purchase): ${(tally['ec.productView'] || 0) + (tally['ec.purchase'] || 0)}`,
);

if (DRY_RUN) {
  console.log('\n--dry-run: not sending. Sample event:');
  console.log(JSON.stringify(all[0], null, 2));
  process.exit(0);
}

// ── Send in batches (JSON arrays), throttled. ────────────────────────────────
// The Event API caps a batch at 100 events, so we must stay at/under that.
const BATCH = 100;
let sent = 0;
let accepted = 0;
let failed = 0;

for (let i = 0; i < all.length; i += BATCH) {
  const chunk = all.slice(i, i + BATCH);
  try {
    const res = await fetch(EVENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      failed += chunk.length;
      const body = await res.text();
      console.error(`Batch ${i / BATCH} HTTP ${res.status}: ${body.slice(0, 300)}`);
    } else {
      const json = await res.json();
      const ok = (json.events || []).filter((e) => e.accepted).length;
      accepted += ok;
      failed += chunk.length - ok;
    }
  } catch (err) {
    failed += chunk.length;
    console.error(`Batch ${i / BATCH} error:`, err.message);
  }
  sent += chunk.length;
  if (sent % 1000 === 0 || sent === all.length) {
    console.log(`  sent ${sent}/${all.length} (accepted ${accepted}, failed ${failed})`);
  }
  await new Promise((r) => setTimeout(r, 120)); // gentle throttle
}

console.log(`\nDone. Sent ${sent}, accepted ${accepted}, failed ${failed}.`);
