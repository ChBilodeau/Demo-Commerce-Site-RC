import { useEffect, useState } from 'react';
import type { Pagination } from '@coveo/headless/commerce';

export function PaginationControl({ pagination }: { pagination: Pagination }) {
  const [state, setState] = useState(pagination.state);
  useEffect(() => pagination.subscribe(() => setState(pagination.state)), [pagination]);

  const { page, totalPages } = state;
  if (totalPages <= 1) return null;

  // Build a compact window of page numbers around the current page.
  const windowSize = 5;
  const start = Math.max(0, Math.min(page - 2, totalPages - windowSize));
  const end = Math.min(totalPages, start + windowSize);
  const pages = Array.from({ length: end - start }, (_, i) => start + i);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination-btn"
        disabled={page === 0}
        onClick={() => {
          pagination.previousPage();
          scrollTop();
        }}
      >
        ← Prev
      </button>

      {start > 0 && <span className="pagination-ellipsis">…</span>}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pagination-page ${p === page ? 'is-active' : ''}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => {
            pagination.selectPage(p);
            scrollTop();
          }}
        >
          {p + 1}
        </button>
      ))}

      {end < totalPages && <span className="pagination-ellipsis">…</span>}

      <button
        type="button"
        className="pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => {
          pagination.nextPage();
          scrollTop();
        }}
      >
        Next →
      </button>
    </nav>
  );
}
