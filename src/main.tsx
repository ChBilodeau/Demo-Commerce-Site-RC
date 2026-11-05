import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { isConfigured } from './config/demoConfig';
import { SetupWizard } from './setup/SetupWizard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found.');
}

// Setup mode: when demo.config.json is missing/incomplete, OR the user explicitly
// visits /setup, render the wizard instead of the storefront. Importantly we do
// NOT import App (and therefore the Coveo engines, which build at import time)
// until the app is configured — otherwise the engines would construct with an
// empty org id/token and throw. App is lazy-loaded only when configured.
const wantsSetup =
  window.location.pathname === '/setup' || !isConfigured();

const App = lazy(() => import('./App'));

createRoot(rootElement).render(
  <StrictMode>
    {wantsSetup ? (
      <SetupWizard configured={isConfigured()} />
    ) : (
      <BrowserRouter>
        <Suspense fallback={<div className="grid-status">Loading…</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    )}
  </StrictMode>,
);
