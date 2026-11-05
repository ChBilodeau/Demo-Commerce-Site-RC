import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSearchBox, type SearchBox as SearchBoxController } from '@coveo/headless/commerce';
import { commerceEngine } from '../engine/commerceEngine';

const controller: SearchBoxController = buildSearchBox(commerceEngine);

/** The current text in the storefront search box (for e.g. a "try in CPD" link). */
export function getSearchBoxValue(): string {
  return controller.state.value;
}

export function SearchBox() {
  const [state, setState] = useState(controller.state);
  const navigate = useNavigate();

  useEffect(() => controller.subscribe(() => setState(controller.state)), []);

  // Submitting a search always takes the shopper to the search view (home),
  // so the search box works the same way from a listing page or anywhere else.
  const submit = () => {
    controller.submit();
    navigate('/');
  };

  const selectSuggestion = (rawValue: string) => {
    controller.selectSuggestion(rawValue);
    navigate('/');
  };

  return (
    <div className="searchbox">
      <input
        type="search"
        className="searchbox-input"
        placeholder="Search products…"
        value={state.value}
        onChange={(e) => controller.updateText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        aria-label="Search products"
      />
      <button type="button" className="searchbox-btn" onClick={submit}>
        Search
      </button>

      {state.suggestions.length > 0 && state.value.length > 0 && (
        <ul className="suggestions" role="listbox">
          {state.suggestions.map((s) => (
            <li key={s.rawValue} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => selectSuggestion(s.rawValue)}
                dangerouslySetInnerHTML={{ __html: s.highlightedValue }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
