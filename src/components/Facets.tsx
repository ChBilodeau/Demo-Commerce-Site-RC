import { useEffect, useState } from 'react';
import type {
  FacetGenerator,
  RegularFacet,
  NumericFacet,
  CategoryFacet,
  RegularFacetValue,
  NumericFacetValue,
} from '@coveo/headless/commerce';
import { LOCALE } from '../engine/commerceEngine';
import { searchFacetGenerator } from '../engine/searchController';

const priceFormatter = new Intl.NumberFormat(`${LOCALE.language}-${LOCALE.country}`, {
  style: 'currency',
  currency: LOCALE.currency,
  maximumFractionDigits: 0,
});

// ─── Regular (string) facet, e.g. Brand, Color ──────────────────────────────
function RegularFacetBlock({ facet }: { facet: RegularFacet }) {
  const [, force] = useState(0);
  // Subscribe once per facet id. `facet` is a fresh controller object on every
  // parent render, so depend on the stable facetId — not the object identity —
  // to avoid tearing down/re-adding the subscription on every render.
  useEffect(
    () => facet.subscribe(() => force((n) => n + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facet.state.facetId],
  );

  const state = facet.state;
  if (state.values.length === 0) return null;

  return (
    <FacetShell displayName={state.displayName ?? state.field}>
      <ul className="facet-values">
        {state.values.map((value: RegularFacetValue) => (
          <li key={value.value}>
            <label className="facet-value">
              <input
                type="checkbox"
                checked={value.state === 'selected'}
                onChange={() => facet.toggleSelect(value)}
              />
              <span className="facet-value-label">{value.value}</span>
              <span className="facet-value-count">{value.numberOfResults}</span>
            </label>
          </li>
        ))}
      </ul>
      <FacetShowMore facet={facet} state={state} />
    </FacetShell>
  );
}

// ─── Numeric range facet, e.g. Price ────────────────────────────────────────
function NumericFacetBlock({ facet }: { facet: NumericFacet }) {
  const [, force] = useState(0);
  useEffect(
    () => facet.subscribe(() => force((n) => n + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facet.state.facetId],
  );

  const state = facet.state;
  if (state.values.length === 0) return null;

  const isPrice = /price/i.test(state.field);
  const fmt = (n: number) => (isPrice ? priceFormatter.format(n) : String(n));

  return (
    <FacetShell displayName={state.displayName ?? state.field}>
      <ul className="facet-values">
        {state.values.map((value: NumericFacetValue) => (
          <li key={`${value.start}-${value.end}`}>
            <label className="facet-value">
              <input
                type="checkbox"
                checked={value.state === 'selected'}
                onChange={() => facet.toggleSelect(value)}
              />
              <span className="facet-value-label">
                {fmt(value.start)} – {fmt(value.end)}
              </span>
              <span className="facet-value-count">{value.numberOfResults}</span>
            </label>
          </li>
        ))}
      </ul>
    </FacetShell>
  );
}

// ─── Category (hierarchical) facet, e.g. Category ───────────────────────────
function CategoryFacetBlock({ facet }: { facet: CategoryFacet }) {
  const [, force] = useState(0);
  useEffect(
    () => facet.subscribe(() => force((n) => n + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facet.state.facetId],
  );

  const state = facet.state;
  if (state.values.length === 0 && !state.hasActiveValues) return null;

  return (
    <FacetShell displayName={state.displayName ?? state.field}>
      {state.hasActiveValues && (
        <button
          type="button"
          className="facet-clear"
          onClick={() => facet.deselectAll()}
        >
          ← All categories
        </button>
      )}
      <ul className="facet-values">
        {state.values.map((value) => (
          <li key={value.value}>
            <button
              type="button"
              className="facet-value facet-value-btn"
              onClick={() => facet.toggleSelect(value)}
            >
              <span className="facet-value-label">{value.value}</span>
              <span className="facet-value-count">{value.numberOfResults}</span>
            </button>
          </li>
        ))}
      </ul>
    </FacetShell>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────────
function FacetShell({
  displayName,
  children,
}: {
  displayName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="facet">
      <h3 className="facet-title">{displayName}</h3>
      {children}
    </div>
  );
}

function FacetShowMore({
  facet,
  state,
}: {
  facet: RegularFacet;
  state: RegularFacet['state'];
}) {
  const canShowMore = state.canShowMoreValues;
  const canShowLess = state.canShowLessValues;
  if (!canShowMore && !canShowLess) return null;
  return (
    <div className="facet-showmore">
      {canShowMore && (
        <button type="button" onClick={() => facet.showMoreValues()}>
          Show more
        </button>
      )}
      {canShowLess && (
        <button type="button" onClick={() => facet.showLessValues()}>
          Show less
        </button>
      )}
    </div>
  );
}

export function Facets({
  facetGenerator = searchFacetGenerator,
}: {
  facetGenerator?: FacetGenerator;
}) {
  // Re-render whenever the generator's facet list changes. We don't read the
  // IDs directly — we pull the live controllers from `facetGenerator.facets`
  // below — but subscribing keeps this component in sync as facets appear,
  // disappear, or reorder.
  const [, setFacetIds] = useState(facetGenerator.state);
  useEffect(
    () => facetGenerator.subscribe(() => setFacetIds(facetGenerator.state)),
    [facetGenerator],
  );

  const facets = facetGenerator.facets;
  if (facets.length === 0) return null;

  return (
    <aside className="facets" aria-label="Product filters">
      <div className="facets-header">
        <span className="facets-title">Filters</span>
        <button
          type="button"
          className="facets-clear-all"
          onClick={() => facetGenerator.deselectAll()}
        >
          Clear all
        </button>
      </div>
      {facets.map((facet) => {
        switch (facet.type) {
          case 'regular':
            return <RegularFacetBlock key={facet.state.facetId} facet={facet} />;
          case 'numericalRange':
            return <NumericFacetBlock key={facet.state.facetId} facet={facet} />;
          case 'hierarchical':
            return <CategoryFacetBlock key={facet.state.facetId} facet={facet} />;
          default:
            // dateRange / location not used by this storefront yet
            return null;
        }
      })}
    </aside>
  );
}
