import { useEffect, useMemo, useRef, useState } from 'react';
import type { Result } from '@coveo/headless';
import {
  getSupportSearchControllers,
  setSupportScope,
  setSupportLargeQuery,
  buildSupportInteractiveResult,
  resultProblemType,
} from '../engine/supportSearchEngine';
import { QuickViewOverlay } from './QuickViewOverlay';

/**
 * Live help-article suggestions shown beside the case form (search-as-you-type).
 *
 * Runs on the SAME Search API engine as the funnel's article step (hub
 * FASupport): category stays a hard filter + problem a boost (via
 * setSupportScope), and the user's subject + description become the query,
 * debounced so results update as they type. Clicking a suggestion opens the
 * quick-view overlay instead of navigating to Salesforce — continuing to
 * deflect while the shopper writes the case.
 */
export function LiveArticleSuggestions({
  category,
  problem,
  query,
}: {
  category: string;
  problem: string;
  query: string;
}) {
  const controllers = useMemo(() => getSupportSearchControllers(), []);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Result | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return controllers.resultList.subscribe(() => {
      const s = controllers.resultList.state;
      setResults(s.results);
      setLoading(s.isLoading);
    });
  }, [controllers]);

  // Debounced search-as-you-type. The case description is natural language, so
  // we send it as the `lq` (large query), which extracts keywords instead of
  // demanding an exact match. We only search once a few characters are typed.
  useEffect(() => {
    setSupportScope(category, problem);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSupportLargeQuery(null);
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      setSupportLargeQuery(trimmed);
      controllers.searchBox.updateText(''); // keep q empty; lq carries the text
      controllers.searchBox.submit();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [controllers, category, problem, query]);

  // Clear the large query when this panel unmounts so the funnel's step-3
  // refine search (which uses short keyword `q`) isn't affected.
  useEffect(() => {
    return () => setSupportLargeQuery(null);
  }, []);

  const ordered = useMemo(() => {
    const matches = (r: Result) => resultProblemType(r) === problem;
    return [...results].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  }, [results, problem]);

  const typedEnough = query.trim().length >= 3;

  return (
    <aside className="support-suggestions" aria-live="polite">
      <h3 className="support-suggestions-title">Suggested help articles</h3>

      {!typedEnough && (
        <p className="support-suggestions-empty">
          Start describing your issue and relevant {category} articles will appear here.
        </p>
      )}
      {typedEnough && loading && <p className="grid-status">Finding answers…</p>}
      {typedEnough && !loading && ordered.length === 0 && (
        <p className="support-suggestions-empty">
          No articles matched yet. Keep typing, or submit your case below.
        </p>
      )}

      <ul className="support-article-list">
        {ordered.slice(0, 6).map((result) => (
          <LiveResult key={result.uniqueId} result={result} onOpen={() => setPreview(result)} />
        ))}
      </ul>

      {preview && <QuickViewOverlay result={preview} onClose={() => setPreview(null)} />}
    </aside>
  );
}

function LiveResult({ result, onOpen }: { result: Result; onOpen: () => void }) {
  const interactive = useMemo(() => buildSupportInteractiveResult(result), [result]);
  const problemTag = resultProblemType(result);
  const open = () => {
    interactive.select();
    onOpen();
  };
  return (
    <li className="support-article">
      <button type="button" className="support-article-btn" onClick={open}>
        <span className="support-article-title">{result.title}</span>
        {problemTag && <span className="support-article-tag">{problemTag}</span>}
        {result.excerpt && (
          <span className="support-article-excerpt">{result.excerpt}</span>
        )}
      </button>
    </li>
  );
}
