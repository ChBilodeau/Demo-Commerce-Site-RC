import { NavLink } from 'react-router-dom';

/**
 * Top-level category links. Each maps to a listing page whose URL in the CMH
 * must be `<your storefront base URL>/browse/<slug>` to resolve (the base URL
 * is demo.config.json -> storefront.baseUrl).
 *
 * Slugs come from the products' `ec_category_slug` field. Keep this list in
 * sync with the PLPs you create in the CMH Product Listings manager.
 */
const CATEGORIES: { label: string; slug: string }[] = [
  { label: 'Cars & Trucks', slug: 'cars-trucks' },
  { label: 'Airplanes', slug: 'airplanes' },
  { label: 'Helicopters', slug: 'helicopters' },
  { label: 'Boats', slug: 'boats' },
  { label: 'Drones', slug: 'drones' },
  { label: 'Parts', slug: 'parts' },
];

export function CategoryNav() {
  return (
    <nav className="category-nav" aria-label="Product categories">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `category-nav-link ${isActive ? 'is-active' : ''}`
        }
        end
      >
        All
      </NavLink>
      {CATEGORIES.map((c) => (
        <NavLink
          key={c.slug}
          to={`/browse/${c.slug}`}
          className={({ isActive }) =>
            `category-nav-link ${isActive ? 'is-active' : ''}`
          }
        >
          {c.label}
        </NavLink>
      ))}

      <NavLink
        to="/ask"
        className={({ isActive }) =>
          `category-nav-link ask-ai-tab ${isActive ? 'is-active' : ''}`
        }
      >
        ✨ Ask Coveo AI
      </NavLink>

      <NavLink
        to="/discover"
        className={({ isActive }) =>
          `category-nav-link cpd-tab ${isActive ? 'is-active' : ''}`
        }
      >
        🤖 Try CPD!
      </NavLink>
    </nav>
  );
}
