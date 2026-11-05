import { useEffect, useMemo, useState } from 'react';
import type { DemoConfig } from '../config/demoConfig';
import exampleConfig from '../../demo.config.example.json';
import { CLOUDINARY_STEPS, CHATGPT_IMAGE_PROMPT } from './setupContent';
import './setup.css';

/**
 * Browser setup wizard (Phase 3).
 *
 * Shown when the app isn't configured yet, or when the user visits /setup.
 * It collects every value in demo.config.json, saves it via the dev-only setup
 * bridge, and provides a two-way channel with the Kiro setup skill: the skill
 * can post questions (polled from /__setup/messages) and the user answers them
 * (posted to /__setup/answer).
 */

type Msg = { id: string; question: string; help?: string };
type Status = { phase?: string; message?: string; progress?: number } | null;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export function SetupWizard({ configured }: { configured: boolean }) {
  const [config, setConfig] = useState<DemoConfig>(exampleConfig as DemoConfig);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Load any existing config the bridge has on disk.
  useEffect(() => {
    api<Record<string, unknown>>('/__setup/config')
      .then((existing) => {
        if (existing && Object.keys(existing).length > 0) {
          setConfig({ ...(exampleConfig as DemoConfig), ...(existing as unknown as DemoConfig) });
        }
      })
      .catch(() => {/* bridge not running; keep example defaults */})
      .finally(() => setLoaded(true));
  }, []);

  // Poll for skill questions + status every 2s.
  useEffect(() => {
    let alive = true;
    const tick = () =>
      api<{ messages: Msg[]; status: Status }>('/__setup/messages')
        .then((d) => {
          if (!alive) return;
          setMessages(d.messages ?? []);
          setStatus(d.status ?? null);
        })
        .catch(() => {/* ignore */});
    tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Helper to update a nested config path immutably.
  const set = (path: string, value: unknown) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api('/__setup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      alert(`Could not save config. Is the dev server running?\n${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const sendAnswer = async (id: string) => {
    const value = answers[id] ?? '';
    await api('/__setup/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, value }),
    });
    setMessages((m) => m.filter((x) => x.id !== id));
  };

  const text = (path: string, value: string, placeholder = '') => (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => set(path, e.target.value)}
    />
  );
  const check = (path: string, value: boolean) => (
    <input type="checkbox" checked={value} onChange={(e) => set(path, e.target.checked)} />
  );

  const cfg = config;
  const chatgptPrompt = useMemo(() => CHATGPT_IMAGE_PROMPT, []);

  if (!loaded) return <div className="setup-loading">Loading setup…</div>;

  return (
    <div className="setup">
      <header className="setup-header">
        <h1>Demo Commerce Site RC — Setup</h1>
        <p>
          Fill in your org values below and click <strong>Save configuration</strong>.
          The Kiro setup skill reads this file and drives the rest of the setup,
          posting any questions it needs right here.
        </p>
        {configured && (
          <p className="setup-note">
            This demo is already configured. You can edit values and re-save, or
            leave <code>/setup</code> to view the storefront.
          </p>
        )}
      </header>

      {/* Live status + questions from the Kiro skill (the two-way channel). */}
      {(status || messages.length > 0) && (
        <section className="setup-skill-panel">
          <h2>From the setup skill</h2>
          {status && (
            <div className="setup-status">
              <strong>{status.phase ?? 'Status'}:</strong> {status.message}
              {typeof status.progress === 'number' && ` (${status.progress}%)`}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="setup-question">
              <label>{m.question}</label>
              {m.help && <p className="setup-help">{m.help}</p>}
              <div className="setup-answer-row">
                <input
                  type="text"
                  value={answers[m.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [m.id]: e.target.value }))}
                />
                <button type="button" onClick={() => sendAnswer(m.id)}>Send</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <form className="setup-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Section title="Coveo — core (required)">
          <Field label="Organization ID" help="e.g. mycompanyabc123">
            {text('coveo.organizationId', cfg.coveo.organizationId, 'mycompanyabc123')}
          </Field>
          <Field label="Region" help="us | eu | au | ca">
            {text('coveo.region', cfg.coveo.region, 'us')}
          </Field>
          <Field label="Access token" help="Public anonymous search/commerce API key (Execute queries + analytics push).">
            {text('coveo.accessToken', cfg.coveo.accessToken, 'xx...')}
          </Field>
          <Field label="Commerce tracking ID" help="The storefront association tracking id (no spaces).">
            {text('coveo.commerce.trackingId', cfg.coveo.commerce.trackingId, 'my-shop')}
          </Field>
          <Field label="Commerce search hub">
            {text('coveo.commerce.searchHub', cfg.coveo.commerce.searchHub, 'My Commerce')}
          </Field>
          <div className="setup-row">
            <Field label="Language">{text('coveo.commerce.locale.language', cfg.coveo.commerce.locale.language, 'en')}</Field>
            <Field label="Country">{text('coveo.commerce.locale.country', cfg.coveo.commerce.locale.country, 'US')}</Field>
            <Field label="Currency">{text('coveo.commerce.locale.currency', cfg.coveo.commerce.locale.currency, 'USD')}</Field>
          </div>
        </Section>

        <Section title="Features — turn surfaces on/off">
          <Field label="Search + browse (always on)"><span className="setup-locked">enabled</span></Field>
          <Field label="Recommendations">{check('features.recommendations', cfg.features.recommendations)}</Field>
          <Field label="Ask Coveo AI (Search Agent)">{check('features.askCoveoAI', cfg.features.askCoveoAI)}</Field>
          <Field label="Try CPD!">{check('features.tryCPD', cfg.features.tryCPD)}</Field>
          <Field label="Technical Support">{check('features.support', cfg.features.support)}</Field>
        </Section>

        {cfg.features.recommendations && (
          <Section title="Recommendations">
            <Field label="Home recommendation slot ID" help="From the Coveo Merchandising Hub.">
              {text('coveo.recommendations.homeSlotId', cfg.coveo.recommendations.homeSlotId)}
            </Field>
          </Section>
        )}

        {cfg.features.askCoveoAI && (
          <Section title="Ask Coveo AI (Search Agent)">
            <Field label="Agent ID">{text('coveo.searchAgent.agentId', cfg.coveo.searchAgent.agentId)}</Field>
            <Field label="Search hub">{text('coveo.searchAgent.searchHub', cfg.coveo.searchAgent.searchHub)}</Field>
            <Field label="Agent token (non-expiring API key)">{text('coveo.searchAgent.token', cfg.coveo.searchAgent.token)}</Field>
          </Section>
        )}

        {cfg.features.tryCPD && (
          <Section title="Try CPD!">
            <Field label="CPD token (Execute agent queries)">{text('coveo.cpd.token', cfg.coveo.cpd.token)}</Field>
          </Section>
        )}

        {cfg.features.support && (
          <Section title="Technical Support">
            <Field label="Support search hub">{text('coveo.support.searchHub', cfg.coveo.support.searchHub, 'MySupport')}</Field>
            <Field label="Case Assist configuration ID">{text('coveo.support.caseAssistId', cfg.coveo.support.caseAssistId)}</Field>
            <Field label="Case Assist token (optional)" help="Falls back to the access token if empty.">
              {text('coveo.support.caseAssistToken', cfg.coveo.support.caseAssistToken)}
            </Field>
            <Field label="Vehicle-category field name" help="Coveo index field from the Salesforce source mapping.">
              {text('coveo.support.fields.vehicleCategory', cfg.coveo.support.fields.vehicleCategory)}
            </Field>
            <Field label="Problem-type field name">
              {text('coveo.support.fields.problemType', cfg.coveo.support.fields.problemType)}
            </Field>
            <h3 className="setup-subhead">Salesforce Web-to-Case</h3>
            <Field label="Web-to-Case org ID (18 chars)">{text('salesforce.webToCase.orgId', cfg.salesforce.webToCase.orgId)}</Field>
            <Field label="Vehicle Category field id (00N...)">{text('salesforce.webToCase.fieldIds.vehicleCategory', cfg.salesforce.webToCase.fieldIds.vehicleCategory)}</Field>
            <Field label="Problem Type field id (00N...)">{text('salesforce.webToCase.fieldIds.problemType', cfg.salesforce.webToCase.fieldIds.problemType)}</Field>
            <Field label="Viewed Help Articles field id (00N...)">{text('salesforce.webToCase.fieldIds.viewedArticles', cfg.salesforce.webToCase.fieldIds.viewedArticles)}</Field>
          </Section>
        )}

        <Section title="Salesforce">
          <Field label="Org alias (sf CLI target-org)">{text('salesforce.orgAlias', cfg.salesforce.orgAlias)}</Field>
          <Field label="Org ID">{text('salesforce.orgId', cfg.salesforce.orgId)}</Field>
        </Section>

        <Section title="Images (Cloudinary)">
          <Field label="Cloud name">{text('images.cloudName', cfg.images.cloudName)}</Field>
          <Field label="Base transform">{text('images.baseTransform', cfg.images.baseTransform, 'f_auto,q_auto,w_600')}</Field>
          <details className="setup-details">
            <summary>How to set up Cloudinary + generate product images</summary>
            <ol className="setup-steps">
              {CLOUDINARY_STEPS.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <h4>ChatGPT prompt for product images</h4>
            <pre className="setup-prompt">{chatgptPrompt}</pre>
          </details>
        </Section>

        <Section title="Storefront">
          <Field label="Store name">{text('storefront.name', cfg.storefront.name, 'Demo RC Store')}</Field>
          <Field label="Base URL (optional)" help="Leave empty to use the runtime origin.">
            {text('storefront.baseUrl', cfg.storefront.baseUrl)}
          </Field>
        </Section>

        <div className="setup-actions">
          <button type="submit" className="setup-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
          {savedAt && <span className="setup-saved">Saved at {savedAt} — tell the Kiro skill to continue.</span>}
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="setup-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="setup-field">
      <span className="setup-label">{label}</span>
      {children}
      {help && <span className="setup-help">{help}</span>}
    </label>
  );
}
