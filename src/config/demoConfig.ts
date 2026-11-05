/**
 * Central configuration for the demo.
 *
 * Every org-specific value (Coveo org id, search hubs, tracking id, slot ids,
 * Salesforce field ids, Cloudinary cloud, feature flags) is read from here so
 * nothing is hardcoded in the app. The values come from `demo.config.json` at
 * the repo root, which each user fills in via the setup wizard. A committed
 * `demo.config.example.json` documents the shape.
 *
 * `demo.config.json` is git-ignored and may not exist on a fresh clone — so the
 * app can boot into "setup mode" (see `isConfigured`) and show the wizard
 * instead of crashing on missing values.
 */

export interface DemoConfig {
  version: number;
  coveo: {
    organizationId: string;
    region: string;
    accessToken: string;
    commerce: {
      trackingId: string;
      searchHub: string;
      locale: { language: string; country: string; currency: string };
    };
    searchAgent: { enabled: boolean; agentId: string; searchHub: string; token: string };
    cpd: { enabled: boolean; token: string };
    support: {
      enabled: boolean;
      searchHub: string;
      caseAssistId: string;
      caseAssistToken: string;
      fields: { vehicleCategory: string; problemType: string };
    };
    recommendations: { homeSlotId: string };
  };
  salesforce: {
    orgAlias: string;
    orgId: string;
    webToCase: {
      orgId: string;
      fieldIds: { vehicleCategory: string; problemType: string; viewedArticles: string };
    };
  };
  images: {
    provider: string;
    cloudName: string;
    baseTransform: string;
    brand: { logoPublicId: string; wingsPublicId: string; backgroundPublicId: string };
  };
  storefront: { name: string; baseUrl: string };
  features: {
    search: boolean;
    recommendations: boolean;
    askCoveoAI: boolean;
    tryCPD: boolean;
    support: boolean;
  };
}

// Vite resolves JSON imports at build time. `demo.config.json` is git-ignored;
// when it's absent the glob simply yields nothing and we fall back to the
// example shape so the app can render the setup wizard.
const userConfigModules = import.meta.glob<{ default: DemoConfig }>(
  '/demo.config.json',
  { eager: true },
);
import exampleConfig from '../../demo.config.example.json';

const userConfig = Object.values(userConfigModules)[0]?.default;

/** The active configuration (user's if present, else the example defaults). */
export const demoConfig: DemoConfig = (userConfig ??
  (exampleConfig as unknown)) as DemoConfig;

/** True when the user has supplied the minimum required to run the storefront. */
export function isConfigured(): boolean {
  return Boolean(
    userConfig &&
      demoConfig.coveo.organizationId &&
      demoConfig.coveo.accessToken &&
      demoConfig.coveo.commerce.trackingId,
  );
}

/** Convenience accessors used across the engine layer. */
export const cfg = {
  orgId: () => demoConfig.coveo.organizationId,
  orgEndpoint: () => `https://${demoConfig.coveo.organizationId}.org.coveo.com`,
  accessToken: () => demoConfig.coveo.accessToken,
  trackingId: () => demoConfig.coveo.commerce.trackingId,
  commerceHub: () => demoConfig.coveo.commerce.searchHub,
  locale: () => demoConfig.coveo.commerce.locale,
  cloudName: () => demoConfig.images.cloudName,
  imageTransform: () => demoConfig.images.baseTransform,
  features: () => demoConfig.features,
};

/**
 * Build a Cloudinary URL for a brand asset (logo, wings, background) from the
 * configured cloud name. Returns an empty string when no cloud is configured,
 * so the UI can fall back to text/no-image gracefully.
 */
export function brandImage(
  which: keyof DemoConfig['images']['brand'],
): string {
  const cloud = demoConfig.images.cloudName;
  const id = demoConfig.images.brand?.[which];
  if (!cloud || !id) return '';
  return `https://res.cloudinary.com/${cloud}/image/upload/${id}`;
}
