import type { CartItem } from '@coveo/headless/commerce';

const STORAGE_KEY = 'demo-rc-cart';

/**
 * Loads the persisted cart items from localStorage. Returns an empty array if
 * nothing is stored or the stored value is unreadable (e.g. corrupted JSON,
 * or localStorage unavailable in private mode / SSR).
 */
export function loadCartItems(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed items.
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.productId === 'string' &&
        typeof i.name === 'string' &&
        typeof i.price === 'number' &&
        typeof i.quantity === 'number',
    );
  } catch {
    return [];
  }
}

/** Persists the current cart items to localStorage. */
export function saveCartItems(items: CartItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore write failures (quota, private mode, etc.).
  }
}
