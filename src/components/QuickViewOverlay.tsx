import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Result } from '@coveo/headless';
import { buildSupportQuickview, resultProblemType } from '../engine/supportSearchEngine';

/**
 * In-page overlay that shows a result's Coveo Quick view (the indexed article
 * HTML) instead of navigating to Salesforce.
 *
 * The HTML comes from the Quickview controller's `state.content`. We render it
 * inside a SANDBOXED iframe (via srcdoc) rather than injecting it into the page
 * DOM — the content is server-provided HTML and the sandbox (no same-origin, no
 * scripts) prevents it from touching the storefront, which is the safe way to
 * display third-party/indexed HTML.
 */
export function QuickViewOverlay({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  const quickview = useMemo(() => buildSupportQuickview(result), [result]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPreview, setHasPreview] = useState(true);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Fetch the quick view HTML on open and subscribe to the controller state.
  useEffect(() => {
    const unsub = quickview.subscribe(() => {
      const s = quickview.state;
      setContent(s.content);
      setLoading(s.isLoading);
      setHasPreview(s.resultHasPreview);
    });
    quickview.fetchResultContent();
    return unsub;
  }, [quickview]);

  // Close on Escape; focus the close button on open; lock background scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const problemTag = resultProblemType(result);

  // Wrap the raw article HTML in a minimal styled document so it reads cleanly
  // inside the sandboxed iframe (the indexed HTML has no <head>/styles).
  const srcDoc = useMemo(() => {
    if (!content) return '';
    return `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { font: 15px/1.6 -apple-system, system-ui, sans-serif; color: #1a1a2e; margin: 0; padding: 20px; }
  h1,h2,h3 { color: #111; margin: 0 0 10px; }
  p { margin: 0 0 12px; }
  ol,ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  a { color: #2563eb; }
</style></head><body>${content}</body></html>`;
  }, [content]);

  // Render via a portal to <body> so no ancestor transform/animation (e.g. the
  // funnel step's entrance animation) traps this fixed-position overlay and
  // knocks it off-center.
  return createPortal(
    <div
      className="qv-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={result.title}
      onClick={onClose}
    >
      <div className="qv-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qv-head">
          <div className="qv-head-main">
            <h2 className="qv-title">{result.title}</h2>
            {problemTag && <span className="qv-tag">{problemTag}</span>}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="qv-close"
            onClick={onClose}
            aria-label="Close article"
          >
            ✕
          </button>
        </div>

        <div className="qv-body">
          {loading && <p className="grid-status">Loading article…</p>}
          {!loading && !hasPreview && (
            <p className="support-suggestions-empty">
              No preview is available for this article.
            </p>
          )}
          {!loading && hasPreview && content && (
            <iframe
              className="qv-frame"
              title={result.title}
              sandbox=""
              srcDoc={srcDoc}
            />
          )}
        </div>

        <div className="qv-foot">
          <a
            className="qv-source-link"
            href={result.clickUri}
            target="_blank"
            rel="noreferrer"
          >
            Open in Salesforce ↗
          </a>
          <button type="button" className="cart-checkout-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
