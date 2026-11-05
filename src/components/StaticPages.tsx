import { Link } from 'react-router-dom';

/** Shared shell for simple content pages. */
function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="static-page">
      <Link to="/" className="back-link">← Back to store</Link>
      <h1 className="static-title">{title}</h1>
      <div className="static-body">{children}</div>
    </div>
  );
}

export function CustomerAgreementPage() {
  return (
    <PageShell title="Customer Agreement">
      <p>
        Welcome to Fallen Angels RC. By purchasing from this store you agree to the
        terms below. This is a demo storefront; the following is placeholder content.
      </p>
      <h2>1. Orders & Payment</h2>
      <p>
        All orders are subject to availability. Prices are shown in the storefront
        currency and may change without notice.
      </p>
      <h2>2. Shipping & Returns</h2>
      <p>
        Products may be returned within 30 days of delivery in their original
        condition. Remote-control vehicles showing signs of use may be subject to a
        restocking fee.
      </p>
      <h2>3. Warranty</h2>
      <p>
        Manufacturer warranties apply where offered. Fallen Angels RC is not liable
        for damage resulting from misuse, crashes, or unauthorized modifications.
      </p>
      <h2>4. Use of the Site</h2>
      <p>
        You agree not to misuse the site or attempt to disrupt its services.
      </p>
    </PageShell>
  );
}

export function PrivacyPolicyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p>
        Fallen Angels RC respects your privacy. This is a demo storefront; the
        following is placeholder content.
      </p>
      <h2>Information We Collect</h2>
      <p>
        We collect search queries, product interactions, and cart activity to power
        product discovery and recommendations via Coveo.
      </p>
      <h2>How We Use It</h2>
      <p>
        Usage data improves search relevance, recommendations, and the overall
        shopping experience. We do not sell your personal data.
      </p>
      <h2>Cookies & Analytics</h2>
      <p>
        The site uses analytics events to understand how shoppers use the storefront.
      </p>
      <h2>Contact</h2>
      <p>Questions about privacy? Reach out through Technical Support.</p>
    </PageShell>
  );
}

// SupportPage moved to ./SupportPage.tsx (Coveo Case Assist experience).
