import { useEffect, useState } from 'react';
import {
  type Sort,
  type SortCriterion,
  buildRelevanceSortCriterion,
  buildFieldsSortCriterion,
  SortBy,
  SortDirection,
} from '@coveo/headless/commerce';

// The sort options we expose. Price sorts work against ec_price even though the
// server only advertises "relevance" in availableSorts.
const OPTIONS: { label: string; criterion: SortCriterion }[] = [
  { label: 'Relevance', criterion: buildRelevanceSortCriterion() },
  {
    label: 'Price: low to high',
    criterion: buildFieldsSortCriterion([
      { name: 'ec_price', direction: SortDirection.Ascending },
    ]),
  },
  {
    label: 'Price: high to low',
    criterion: buildFieldsSortCriterion([
      { name: 'ec_price', direction: SortDirection.Descending },
    ]),
  },
];

export function SortControl({ sort }: { sort: Sort }) {
  const [, setState] = useState(sort.state);
  useEffect(() => sort.subscribe(() => setState(sort.state)), [sort]);

  // Find the index of the currently applied option (default to Relevance).
  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => sort.isSortedBy(o.criterion)),
  );

  return (
    <label className="sort-control">
      <span className="sort-control-label">Sort</span>
      <select
        className="sort-control-select"
        value={activeIndex}
        onChange={(e) => sort.sortBy(OPTIONS[Number(e.target.value)].criterion)}
      >
        {OPTIONS.map((o, i) => (
          <option key={o.label} value={i}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Re-export so other modules don't each import from headless.
export { SortBy };
