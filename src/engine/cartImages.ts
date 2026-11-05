/**
 * A small side-store mapping cart productId -> image URL, persisted in
 * localStorage.
 *
 * The Coveo CartItem type only carries productId/name/price/quantity, so the
 * cart UI historically resolved images by looking products up in the current
 * search results. That fails for items added outside the current results (e.g.
 * from Conversational Product Discovery, a bundle, or a different category).
 * Recording the image at add-time fixes that for every entry point.
 */
const KEY = 'demo-rc-cart-images';

function load(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function save(map: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Records the image URL for a product id (no-op if url is falsy). */
export function rememberCartImage(productId: string, url: string | undefined): void {
  if (!productId || !url) return;
  const map = load();
  if (map[productId] === url) return;
  map[productId] = url;
  save(map);
}

/** Returns the remembered image URL for a product id, if any. */
export function getCartImage(productId: string): string | undefined {
  return load()[productId];
}

/** Returns the full productId -> image map. */
export function getCartImages(): Record<string, string> {
  return load();
}
