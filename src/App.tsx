import { Link, Route, Routes } from 'react-router-dom';
import { SearchBox } from './components/SearchBox';
import { ProductGrid } from './components/ProductGrid';
import { ProductPage } from './components/ProductPage';
import { Facets } from './components/Facets';
import { CartIndicator } from './components/CartIndicator';
import { CartPage } from './components/CartPage';
import { ListingPage } from './components/ListingPage';
import { CategoryNav } from './components/CategoryNav';
import { AskCoveoAI } from './components/AskCoveoAI';
import { TryCPD } from './components/TryCPD';
import { RecommendationRail } from './components/RecommendationRail';
import { HOME_RAIL } from './engine/recommendationSlots';
import {
  CustomerAgreementPage,
  PrivacyPolicyPage,
} from './components/StaticPages';
import { SupportPage } from './components/SupportPage';
import { brandImage } from './config/demoConfig';

function HomePage() {
  return (
    <div className="storefront-layout storefront-layout--with-rail">
      <Facets />
      <ProductGrid />
      <RecommendationRail
        slotId={HOME_RAIL.slotId}
        fallbackTitle={HOME_RAIL.fallbackTitle}
        count={3}
      />
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-title-link" aria-label="Fallen Angels RC — home">
          <img
            className="app-logo"
            src={brandImage('logoPublicId')}
            alt="Demo RC Store"
          />
        </Link>
        <CartIndicator />
      </header>

      <CategoryNav />
      <SearchBox />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/browse/*" element={<ListingPage />} />
          <Route path="/ask" element={<AskCoveoAI />} />
          <Route path="/discover" element={<TryCPD />} />
          <Route path="/customer-agreement" element={<CustomerAgreementPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="footer-brand">
          <img
            className="footer-wings"
            src={brandImage('wingsPublicId')}
            alt=""
            aria-hidden="true"
          />
          <span>
            Fallen Angels<span className="app-title-accent"> RC</span> · remote control, fully charged
          </span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/customer-agreement">Customer Agreement</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/support">Technical Support</Link>
        </nav>
        <div className="footer-copy">© {new Date().getFullYear()} Fallen Angels RC</div>
      </footer>
    </div>
  );
}
