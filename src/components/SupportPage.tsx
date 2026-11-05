import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Result } from '@coveo/headless';
import {
  getCaseAssistControllers,
  isCaseAssistConfigured,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TO_SALESFORCE,
  type CaseAssistControllers,
} from '../engine/caseAssistEngine';
import {
  getSupportSearchControllers,
  setSupportScope,
  setSupportLargeQuery,
  buildSupportInteractiveResult,
  resultProblemType,
} from '../engine/supportSearchEngine';
import { QuickViewOverlay } from './QuickViewOverlay';
import { LiveArticleSuggestions } from './LiveArticleSuggestions';
import { brandImage } from '../config/demoConfig';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PROBLEMS,
  getCategory,
  getProblem,
  buildHelpSeed,
  SF_FUNNEL_FIELDS,
  type SupportCategory,
  type SupportProblem,
} from '../engine/supportFunnel';

/** Shared shell matching the other static pages. */
function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="static-page support-page">
      <Link to="/" className="back-link">← Back to store</Link>
      <h1 className="static-title">{title}</h1>
      {children}
    </div>
  );
}

/**
 * Salesforce Web-to-Case submission.
 *
 * Set VITE_SF_WEBTOCASE_ORGID to your org's Web-to-Case orgid to enable real
 * case creation. Until then, submitting shows a local confirmation so the flow
 * is demoable end-to-end.
 */
const SF_ORGID = import.meta.env.VITE_SF_WEBTOCASE_ORGID as string | undefined;
const SF_WEBTOCASE_URL = 'https://webto.salesforce.com/servlet/servlet.WebToCase';

export function SupportPage() {
  if (!isCaseAssistConfigured) {
    return <SupportSetupNotice />;
  }
  return <SupportFunnel />;
}

/** Shown until VITE_COVEO_CASE_ASSIST_ID is set. */
function SupportSetupNotice() {
  return (
    <PageShell title="Technical Support">
      <div className="support-coming-soon">
        <img
          className="support-wings"
          src={brandImage('wingsPublicId')}
          alt=""
          aria-hidden="true"
        />
        <h2>Support is almost ready</h2>
        <p>
          The AI-assisted support experience is wired up and waiting on its Coveo
          Case Assist configuration ID. Once <code>VITE_COVEO_CASE_ASSIST_ID</code> is
          set, this page will suggest help articles as you type and auto-classify
          your issue before creating a case.
        </p>
        <Link to="/ask" className="cart-checkout-btn support-cta">
          Meanwhile, Ask Coveo AI
        </Link>
      </div>
    </PageShell>
  );
}

/** Which funnel step the current URL params resolve to. */
type Step = 'category' | 'problem' | 'articles' | 'case';

function SupportFunnel() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category');
  const problemId = params.get('problem');
  const wantsCase = params.get('case') === '1';

  const category = getCategory(categoryId);
  const problem = getProblem(problemId);

  const step: Step = !category
    ? 'category'
    : !problem
      ? 'problem'
      : wantsCase
        ? 'case'
        : 'articles';

  // Navigation helpers that preserve/trim the funnel params.
  const go = (next: { category?: string; problem?: string; case?: boolean }) => {
    const p = new URLSearchParams();
    if (next.category) p.set('category', next.category);
    if (next.problem) p.set('problem', next.problem);
    if (next.case) p.set('case', '1');
    setParams(p);
  };

  return (
    <PageShell title="Technical Support">
      <FunnelBreadcrumb step={step} category={category} problem={problem} go={go} />

      {step === 'category' && (
        <CategoryStep onPick={(c) => go({ category: c.id })} />
      )}

      {step === 'problem' && category && (
        <ProblemStep
          category={category}
          onPick={(pr) => go({ category: category.id, problem: pr.id })}
        />
      )}

      {step === 'articles' && category && problem && (
        <ArticlesStep
          category={category}
          problem={problem}
          onCreateCase={() => go({ category: category.id, problem: problem.id, case: true })}
        />
      )}

      {step === 'case' && category && problem && (
        <CaseStep category={category} problem={problem} />
      )}
    </PageShell>
  );
}

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */

function FunnelBreadcrumb({
  step,
  category,
  problem,
  go,
}: {
  step: Step;
  category?: SupportCategory;
  problem?: SupportProblem;
  go: (n: { category?: string; problem?: string; case?: boolean }) => void;
}) {
  return (
    <nav className="support-breadcrumb" aria-label="Support progress">
      <button
        type="button"
        className={'support-crumb' + (step === 'category' ? ' is-current' : '')}
        onClick={() => go({})}
      >
        1. Category
      </button>
      <span className="support-crumb-sep">›</span>
      <button
        type="button"
        className={'support-crumb' + (step === 'problem' ? ' is-current' : '')}
        onClick={() => category && go({ category: category.id })}
        disabled={!category}
      >
        2. {category ? category.label : 'Problem'}
      </button>
      <span className="support-crumb-sep">›</span>
      <button
        type="button"
        className={'support-crumb' + (step === 'articles' ? ' is-current' : '')}
        onClick={() => category && problem && go({ category: category.id, problem: problem.id })}
        disabled={!category || !problem}
      >
        3. Help
      </button>
      <span className="support-crumb-sep">›</span>
      <span className={'support-crumb' + (step === 'case' ? ' is-current' : '')}>
        4. Create a case
      </span>
    </nav>
  );
}

/* ── Step 1: category ───────────────────────────────────────────────────── */

function CategoryStep({ onPick }: { onPick: (c: SupportCategory) => void }) {
  return (
    <div className="support-step">
      <h2 className="support-step-title">What do you need help with?</h2>
      <p className="support-step-sub">Pick the type of product so we can point you to the right fixes.</p>
      <div className="support-choice-grid">
        {SUPPORT_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="support-choice" onClick={() => onPick(c)}>
            <span className="support-choice-icon" aria-hidden="true">{c.icon}</span>
            <span className="support-choice-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: problem type ───────────────────────────────────────────────── */

function ProblemStep({
  category,
  onPick,
}: {
  category: SupportCategory;
  onPick: (p: SupportProblem) => void;
}) {
  return (
    <div className="support-step">
      <h2 className="support-step-title">
        <span aria-hidden="true">{category.icon}</span> {category.label} — what's going on?
      </h2>
      <p className="support-step-sub">Choose the option that best matches your situation.</p>
      <div className="support-choice-grid support-choice-grid--wide">
        {SUPPORT_PROBLEMS.map((p) => (
          <button key={p.id} type="button" className="support-choice support-choice--wide" onClick={() => onPick(p)}>
            <span className="support-choice-label">{p.label}</span>
            <span className="support-choice-blurb">{p.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Step 3: help articles (deflection) ─────────────────────────────────── */

function ArticlesStep({
  category,
  problem,
  onCreateCase,
}: {
  category: SupportCategory;
  problem: SupportProblem;
  onCreateCase: () => void;
}) {
  // SEARCH API — the support article step runs on the support search hub
  // (demo.config.json -> coveo.support.searchHub).
  const controllers = useMemo(() => getSupportSearchControllers(), []);
  const [refine, setRefine] = useState('');
  const [results, setResults] = useState<Result[]>(
    () => controllers.resultList.state.results,
  );
  const [loading, setLoading] = useState(true);
  // The result whose quick view is open in the overlay (null = closed).
  const [preview, setPreview] = useState<Result | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to the result list.
  useEffect(() => {
    return controllers.resultList.subscribe(() => {
      const s = controllers.resultList.state;
      setResults(s.results);
      setLoading(s.isLoading);
    });
  }, [controllers]);

  // Re-run the search when the funnel choices or refine text change. Category
  // is a hard filter + problem a boost (both via the engine's
  // preprocessRequest); the refine text is the query.
  useEffect(() => {
    setSupportScope(category.label, problem.label);
    setSupportLargeQuery(null); // step 3 uses short keyword `q`, not `lq`
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(
      () => {
        controllers.searchBox.updateText(refine);
        controllers.searchBox.submit();
      },
      refine ? 450 : 0,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [controllers, category, problem, refine]);

  // Belt-and-suspenders ordering: float the chosen problem type to the top so
  // the boost is visible even on an empty-query search (where base scores are
  // flat). Stable sort preserves the server's relevance order within groups.
  const ordered = useMemo(() => {
    const matches = (r: Result) => resultProblemType(r) === problem.label;
    return [...results].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  }, [results, problem.label]);

  return (
    <div className="support-step">
      <h2 className="support-step-title">Here's what might help</h2>
      <p className="support-step-sub">
        Articles for <strong>{category.label}</strong> · <strong>{problem.label}</strong>.
        Add a few words to narrow it down.
      </p>

      <input
        type="text"
        className="support-refine-input"
        placeholder="e.g. won't bind, overheats, stripped gear…"
        value={refine}
        onChange={(e) => setRefine(e.target.value)}
        aria-label="Refine help articles"
      />

      <div className="support-articles" aria-live="polite">
        {loading && <p className="grid-status">Finding answers…</p>}
        {!loading && ordered.length === 0 && (
          <p className="support-suggestions-empty">
            No articles matched. Try different words above, or create a case below.
          </p>
        )}
        <ul className="support-article-list">
          {ordered.map((result) => (
            <SupportResult
              key={result.uniqueId}
              result={result}
              onOpen={() => setPreview(result)}
            />
          ))}
        </ul>
      </div>

      <div className="support-deflect-foot">
        <p>Didn't find what you need?</p>
        <button type="button" className="cart-checkout-btn support-cta" onClick={onCreateCase}>
          Create a support case
        </button>
      </div>

      {preview && (
        <QuickViewOverlay result={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

/**
 * A single search result. Clicking it opens the article's quick view in an
 * in-page overlay (instead of navigating to Salesforce) and logs a Search API
 * click event for analytics.
 */
function SupportResult({
  result,
  onOpen,
}: {
  result: Result;
  onOpen: () => void;
}) {
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

/* ── Step 4: create a case ──────────────────────────────────────────────── */

interface Classification {
  field: string;
  label: string;
  value: string;
  confidence: number;
  suggestions: { value: string; confidence: number }[];
}

function CaseStep({
  category,
  problem,
}: {
  category: SupportCategory;
  problem: SupportProblem;
}) {
  const controllers = useMemo<CaseAssistControllers | null>(
    () => getCaseAssistControllers(),
    [],
  );

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Classification subscriptions. Seed the description with the funnel choices
  // so the first classification reflects the category + problem.
  useEffect(() => {
    if (!controllers) return;
    const unsubs: (() => void)[] = [];
    for (const { field, controller } of controllers.classificationFields) {
      unsubs.push(
        controller.subscribe(() => {
          setClassifications((prev) => {
            const next = prev.filter((c) => c.field !== field);
            const { suggestions } = controller.state;
            if (suggestions.length === 0) return next;
            const top = suggestions[0];
            next.push({
              field,
              label: CLASSIFICATION_LABELS[field] ?? field,
              value: top.value,
              confidence: top.confidence,
              suggestions: suggestions.map((s) => ({ value: s.value, confidence: s.confidence })),
            });
            return next;
          });
        }),
      );
    }
    // Seed with the funnel choices for an initial classification.
    controllers.subjectInput.update(`${category.label} — ${problem.label}`);
    controllers.descriptionInput.update(buildHelpSeed(category, problem), {
      caseClassifications: true,
      documentSuggestions: false,
    });
    return () => unsubs.forEach((u) => u());
  }, [controllers, category, problem]);

  const triggerClassify = () => {
    if (!controllers) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      controllers.descriptionInput.update(
        `${buildHelpSeed(category, problem)} ${description}`.trim(),
        { caseClassifications: true, documentSuggestions: false },
      );
    }, 600);
  };

  const onSubjectChange = (v: string) => {
    setSubject(v);
    controllers?.subjectInput.update(v);
  };
  const onDescriptionChange = (v: string) => {
    setDescription(v);
    triggerClassify();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (SF_ORGID) {
      (e.target as HTMLFormElement).submit();
      return;
    }
    setSubmitted(true);
  };

  const canSubmit = subject.trim().length > 0 && email.trim().length > 0;

  if (submitted) {
    return (
      <div className="support-confirmation">
        <div className="cart-confirmation-check" aria-hidden="true">✓</div>
        <h2>Your request was received</h2>
        <p>
          Thanks{name ? `, ${name}` : ''}. Our support team will follow up at{' '}
          <strong>{email}</strong>. (Demo mode — set a Web-to-Case orgid to create a
          real Salesforce case.)
        </p>
        <Link to="/" className="cart-checkout-btn support-cta">Back to store</Link>
      </div>
    );
  }

  return (
    <div className="support-step">
      <h2 className="support-step-title">Create a support case</h2>
      <p className="support-step-sub">
        We've pre-filled your choices. Add a few details and we'll take it from here.
      </p>

      <div className="support-grid">
        <form
          className="support-form"
          action={SF_ORGID ? SF_WEBTOCASE_URL : undefined}
          method={SF_ORGID ? 'POST' : undefined}
          onSubmit={handleSubmit}
        >
          {SF_ORGID && (
            <>
              <input type="hidden" name="orgid" value={SF_ORGID} />
              <input type="hidden" name="retURL" value={window.location.href} />
            </>
          )}

          {/* Funnel choices carried onto the Case (custom fields by id). */}
          {SF_ORGID && SF_FUNNEL_FIELDS.vehicleCategory && (
            <input type="hidden" name={SF_FUNNEL_FIELDS.vehicleCategory} value={category.label} />
          )}
          {SF_ORGID && SF_FUNNEL_FIELDS.problemType && (
            <input type="hidden" name={SF_FUNNEL_FIELDS.problemType} value={problem.label} />
          )}
          {SF_ORGID && SF_FUNNEL_FIELDS.viewedArticles && (
            <input type="hidden" name={SF_FUNNEL_FIELDS.viewedArticles} value="1" />
          )}

          {/* Visible, read-only summary of the funnel choices. */}
          <div className="support-prefill">
            <span className="support-prefill-chip">{category.icon} {category.label}</span>
            <span className="support-prefill-chip">{problem.label}</span>
          </div>

          <label className="support-field">
            <span>Name</span>
            <input name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>

          <label className="support-field">
            <span>Email <abbr title="required" aria-label="required">*</abbr></span>
            <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>

          <label className="support-field">
            <span>Subject <abbr title="required" aria-label="required">*</abbr></span>
            <input
              name="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="e.g. LiPo battery won't charge"
            />
          </label>

          <label className="support-field">
            <span>Product / SKU</span>
            <input type="text" value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="Optional — model or SKU" />
          </label>

          <label className="support-field">
            <span>Description</span>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Tell us what's happening — symptoms, what you've tried…"
            />
          </label>
          <input
            type="hidden"
            name="description"
            value={[
              `Category: ${category.label}`,
              `Problem: ${problem.label}`,
              ...(productSku.trim() ? [`Product / SKU: ${productSku.trim()}`] : []),
              '',
              description,
            ].join('\n')}
          />

          {classifications.length > 0 && (
            <div className="support-classification">
              <h3>Suggested categories</h3>
              {classifications.map((c) => {
                const chosen = picked[c.field] ?? c.value;
                return (
                  <div key={c.field} className="support-classify-row">
                    <span className="support-classify-label">{c.label}</span>
                    <div className="support-classify-chips">
                      {c.suggestions.slice(0, 3).map((s) => (
                        <button
                          type="button"
                          key={s.value}
                          className={'support-chip' + (chosen === s.value ? ' is-active' : '')}
                          onClick={() => setPicked((p) => ({ ...p, [c.field]: s.value }))}
                          title={`${Math.round(s.confidence * 100)}% confidence`}
                        >
                          {s.value}
                        </button>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name={CLASSIFICATION_TO_SALESFORCE[c.field] ?? c.field}
                      value={chosen}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <button type="submit" className="cart-checkout-btn support-submit" disabled={!canSubmit}>
            {SF_ORGID ? 'Create support case' : 'Submit (demo)'}
          </button>
        </form>

        {/* Live article suggestions (Search API) driven by what they type. */}
        <LiveArticleSuggestions
          category={category.label}
          problem={problem.label}
          query={`${subject} ${description}`.trim()}
        />
      </div>
    </div>
  );
}
