import { LOCALE } from '../engine/commerceEngine';

/** Currency formatter bound to the storefront's locale/currency (e.g. CAD). */
export const priceFormatter = new Intl.NumberFormat(
  `${LOCALE.language}-${LOCALE.country}`,
  { style: 'currency', currency: LOCALE.currency },
);

export function formatPrice(price: number | null | undefined): string {
  return price == null ? '' : priceFormatter.format(price);
}
