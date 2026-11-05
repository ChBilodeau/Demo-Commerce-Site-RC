import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  converse,
  isCpdConfigured,
  type CanvasComponent,
} from '../engine/cpdAgent';
import { cpdStore, type CpdTurn as Turn } from '../engine/cpdConversationStore';
import { addToCart } from '../engine/cartController';
import { formatPrice } from '../utils/format';

/**
 * "Try CPD!" — a native front end for Coveo Conversational Product Discovery.
 * It streams the discovery agent's adaptive A2UI canvas and renders each
 * component (ProductCarousel, NextActionsBar, comparison/summary tables,
 * narrative text) as themed React widgets.
 *
 * The conversation (turns + agent handle + input) is kept in `cpdStore`, a
 * module-level store, so it survives navigating to a product page and back —
 * returning to /discover restores the conversation exactly as it was left.
 */

export function TryCPD() {
  // Read the persisted conversation from the store (survives navigation).
  const { turns, input } = useSyncExternalStore(
    cpdStore.subscribe,
    cpdStore.getState,
  );
  const setTurns = cpdStore.setTurns;
  const setInput = cpdStore.setInput;
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () =>
    requestAnimationFrame(() =>
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }),
    );

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setTurns((t) => [
      ...t,
      { role: 'user', text: message },
      { role: 'agent', streaming: true },
    ]);
    scrollToBottom();

    const patch = (p: Partial<Turn>) =>
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = { ...next[next.length - 1], ...p };
        return next;
      });

    const nextConvo = await converse(message, cpdStore.getConversation(), {
      onText: (full) => {
        patch({ text: full });
        scrollToBottom();
      },
      onReasoning: (full) => patch({ reasoning: full }),
      onCanvas: (canvas) => {
        patch({ canvas });
        scrollToBottom();
      },
      onDone: (answered) => {
        patch({ streaming: false, noAnswer: !answered });
        setBusy(false);
        scrollToBottom();
      },
      onError: (msg) => {
        patch({ streaming: false, text: `⚠️ ${msg}` });
        setBusy(false);
      },
    });
    // Persist the updated agent handle and stamp the finished turn with its
    // runId (read from the returned conversation, which is now complete).
    cpdStore.setConversation(nextConvo);
    patch({ runId: nextConvo.runId });
  };

  // If we arrived from the "Try this in CPD!" link (no-results search), send
  // that query automatically — once. We clear the history state afterward so a
  // refresh or revisit doesn't re-send it.
  const location = useLocation();
  const autoSentRef = useRef(false);
  useEffect(() => {
    const cpdQuery = (location.state as { cpdQuery?: string } | null)?.cpdQuery;
    if (cpdQuery && !autoSentRef.current && !busy) {
      autoSentRef.current = true;
      window.history.replaceState({}, ''); // drop the state so it won't re-fire
      send(cpdQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  if (!isCpdConfigured) {
    return (
      <div className="cpd">
        <CpdHeader />
        <div className="cpd-setup">
          <p>
            Conversational Product Discovery is wired up and waiting on a Coveo
            platform token. Add <code>VITE_COVEO_CPD_TOKEN</code> (a token with the
            <code> EXECUTE_AGENT_QUERY</code> privilege) to <code>.env.local</code> and
            restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  const started = turns.length > 0;

  const inputRow = (
    <div className="chat-input-row">
      <input
        type="text"
        className="chat-input"
        placeholder={started ? 'Ask a follow-up…' : "Describe what you're shopping for…"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        disabled={busy}
        aria-label="Try Conversational Product Discovery"
      />
      <button
        type="button"
        className="chat-send"
        onClick={() => send()}
        disabled={busy || !input.trim()}
      >
        {busy ? '…' : 'Send'}
      </button>
    </div>
  );

  return (
    <div className="cpd">
      <CpdHeader />

      <div className={`chat${started ? ' chat--conversation' : ''}`}>
        {/* Before the conversation starts, the input sits up top with the
            suggestions. Once it starts, the input moves below the thread. */}
        {!started && inputRow}

        <div className="chat-thread cpd-thread" ref={threadRef}>
          {!started && (
            <div className="chat-empty">
              <p>Try asking:</p>
              <div className="chat-suggestions">
                {[
                  'What do I need to start RC drifting under $400?',
                  'Compare a few beginner-friendly RC rock crawlers',
                  'Recommend a fast brushless short course truck',
                  'I want an FPV drone and the batteries to go with it',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chat-suggestion"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) =>
            turn.role === 'user' ? (
              <div key={i} className="chat-msg chat-msg-user">
                {turn.text}
              </div>
            ) : (
              <div key={i} className="chat-msg chat-msg-agent cpd-agent">
                {turn.streaming && !turn.text && !turn.canvas?.length ? (
                  <span className="chat-typing">
                    {turn.reasoning ? 'Thinking…' : 'Working on it…'}
                  </span>
                ) : (
                  <>
                    {turn.text && (
                      <div className="chat-answer">
                        <Markdown text={turn.text} />
                      </div>
                    )}
                    {turn.canvas?.map((c, ci) => (
                      <CanvasRenderer key={ci} component={c} onAction={send} />
                    ))}
                    {turn.noAnswer && !turn.text && !turn.canvas?.length && (
                      <span className="chat-noanswer">
                        I couldn't find a product answer for that.
                      </span>
                    )}
                  </>
                )}
              </div>
            ),
          )}
        </div>

        {/* Once the conversation has started, the input is pinned at the bottom,
            directly under the latest response. */}
        {started && inputRow}
      </div>
    </div>
  );
}

function CpdHeader() {
  return (
    <div className="ask-ai-header">
      <h1 className="ask-ai-title">Try CPD! <span className="cpd-badge">beta</span></h1>
      <p className="ask-ai-sub">
        Conversational Product Discovery — describe your goal in plain language and
        get curated RC products, comparisons, and bundles, grounded in our catalog.
      </p>
    </div>
  );
}

// ─── A2UI component renderers ────────────────────────────────────────────────

/**
 * Minimal, safe renderer for the subset of markdown the discovery agent emits:
 * **bold**, paragraphs (blank lines), and "-" bullet lists. No raw HTML is
 * injected — we build React elements, so there's no XSS surface.
 */
function Markdown({ text }: { text: string }) {
  // Split into blocks on blank lines → paragraphs / lists.
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l)) && lines.length > 0;
        if (isList) {
          return (
            <ul key={bi} className="cpd-md-list">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        // Paragraph: join wrapped lines with <br/>.
        return (
          <p key={bi} className="cpd-md-p">
            {lines.map((l, li) => (
              <span key={li}>
                {renderInline(l)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** Renders inline **bold** spans within a line. */
function renderInline(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<strong key={key++}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

/**
 * Loading state shown while the CPD agent streams a surface. Combines a short
 * "thinking" line (animated dots) with a row of product-card skeletons that
 * mimic the real carousel layout, so it reads as "results are coming" rather
 * than a blank box.
 */
function CpdLoading() {
  return (
    <div className="cpd-loading" aria-live="polite" aria-busy="true">
      <div className="cpd-loading-head">
        <span className="cpd-thinking-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="cpd-thinking-text">Finding the best RC gear for you…</span>
      </div>
      <div className="cpd-loading-track" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="cpd-card cpd-card-skeleton">
            <div className="cpd-skel cpd-skel-image" />
            <div className="cpd-skel cpd-skel-line cpd-skel-line-name" />
            <div className="cpd-skel cpd-skel-line cpd-skel-line-price" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CanvasRenderer({
  component,
  onAction,
}: {
  component: CanvasComponent;
  onAction: (text: string) => void;
}) {
  if (component.loading) {
    return <CpdLoading />;
  }
  switch (component.type) {
    case 'ProductCarousel':
      return <ProductCarousel component={component} />;
    case 'BundleDisplay':
      return <BundleDisplay component={component} />;
    case 'NextActionsBar':
      return <NextActionsBar component={component} onAction={onAction} />;
    case 'ComparisonTable':
    case 'SummaryTable':
      return <ProductTable component={component} />;
    default:
      return <UnknownComponent component={component} />;
  }
}

interface AgentProduct {
  // CPD product fields (confirmed from the live data model).
  ec_product_id?: string;
  ec_name?: string;
  ec_price?: number | string;
  ec_promo_price?: number | string;
  ec_image?: string;
  ec_brand?: string;
  clickUri?: string;
  // Legacy / alternate field names, kept as fallbacks.
  productId?: string;
  name?: string;
  price?: number | string;
  image?: string;
  ec_images?: string[];
  [k: string]: unknown;
}

function asProducts(data: Record<string, unknown>): AgentProduct[] {
  // The ProductCarousel binds its `products` prop to the "/items" data path, so
  // the resolved array may land under `products`, `items`, or be the data itself.
  const candidate =
    (data.products as unknown) ??
    (data.items as unknown) ??
    (Array.isArray(data) ? (data as unknown) : undefined);
  return Array.isArray(candidate) ? (candidate as AgentProduct[]) : [];
}

function productId(p: AgentProduct): string | undefined {
  return p.ec_product_id ?? p.productId;
}
function productName(p: AgentProduct): string | undefined {
  return p.ec_name ?? p.name ?? productId(p);
}
function productImage(p: AgentProduct): string | undefined {
  return p.ec_image ?? p.image ?? p.ec_images?.[0];
}
function productPrice(p: AgentProduct): number | undefined {
  // Prefer the active promo price when it's lower than list.
  const list = toNum(p.ec_price ?? p.price);
  const promo = toNum(p.ec_promo_price);
  if (promo !== undefined && (list === undefined || promo < list)) return promo;
  return list;
}
function toNum(raw: unknown): number | undefined {
  const n = typeof raw === 'string' ? Number(raw) : (raw as number);
  return Number.isFinite(n) ? n : undefined;
}

/** Client-side router link when we have a target, plain block otherwise. */
function MaybeLink({
  to,
  className,
  children,
}: {
  to?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return to ? (
    <Link className={className} to={to} state={{ from: 'cpd' }}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function ProductCarousel({ component }: { component: CanvasComponent }) {
  const products = asProducts(component.data);
  const heading = (component.props.heading as string) || 'Recommended for you';
  // Track which products were just added (productId -> true) for the ✓ state.
  const [added, setAdded] = useState<Record<string, boolean>>({});

  if (products.length === 0) {
    return (
      <div className="cpd-carousel">
        <h3 className="cpd-section-title">{heading}</h3>
        <p className="support-suggestions-empty">No products returned for this request.</p>
      </div>
    );
  }

  const handleAdd = (p: AgentProduct) => {
    const id = productId(p);
    const price = productPrice(p);
    if (!id || price === undefined) return;
    const name = productName(p) ?? id;
    addToCart({ productId: id, name, price, image: productImage(p) });
    setAdded((a) => ({ ...a, [id]: true }));
    window.setTimeout(() => setAdded((a) => ({ ...a, [id]: false })), 1800);
  };

  return (
    <div className="cpd-carousel">
      {heading && <h3 className="cpd-section-title">{heading}</h3>}
      <div className="cpd-carousel-track">
        {products.map((p, i) => {
          const price = productPrice(p);
          const img = productImage(p);
          const id = productId(p);
          // Link against THIS site's PDP route (/product/:id), not the agent's
          // clickUri (which uses a different /pdp/ path).
          const href = id ? `/product/${encodeURIComponent(id)}` : undefined;
          const canAdd = Boolean(id) && price !== undefined;
          const isAdded = id ? added[id] : false;
          return (
            <div key={id ?? i} className="cpd-card">
              {href ? (
                <Link className="cpd-card-link" to={href} state={{ from: 'cpd' }}>
                  <div className="cpd-card-image">
                    {img ? (
                      <img src={img} alt="" loading="lazy" />
                    ) : (
                      <div className="cpd-card-noimg">No image</div>
                    )}
                  </div>
                  <div className="cpd-card-name">{productName(p)}</div>
                  {price !== undefined && (
                    <div className="cpd-card-price">{formatPrice(price)}</div>
                  )}
                </Link>
              ) : (
                <div className="cpd-card-link">
                  <div className="cpd-card-image">
                    {img ? (
                      <img src={img} alt="" loading="lazy" />
                    ) : (
                      <div className="cpd-card-noimg">No image</div>
                    )}
                  </div>
                  <div className="cpd-card-name">{productName(p)}</div>
                  {price !== undefined && (
                    <div className="cpd-card-price">{formatPrice(price)}</div>
                  )}
                </div>
              )}
              <button
                type="button"
                className={`cpd-card-add${isAdded ? ' is-added' : ''}`}
                disabled={!canAdd}
                onClick={() => handleAdd(p)}
                aria-label={`Add ${productName(p)} to cart`}
              >
                {isAdded ? '✓ Added' : 'Add to cart'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="cpd-cart-prompt">
        Like any of these? Hit <strong>Add to cart</strong> on a product, or ask me
        to refine the list.
      </p>
    </div>
  );
}

interface BundleSlot {
  categoryLabel?: string;
  surfaceRef?: string;
}
interface BundleDef {
  bundleId?: string;
  label?: string;
  description?: string;
  slots?: BundleSlot[];
}

function BundleDisplay({ component }: { component: CanvasComponent }) {
  const title = (component.props.title as string) || 'Your setup';
  const bundles = (component.props.bundles as BundleDef[]) ?? [];
  const [added, setAdded] = useState<Record<string, boolean>>({});

  // Resolve a slot's product from the referenced ProductCard surface's items.
  const productFor = (slot: BundleSlot): AgentProduct | undefined => {
    if (!slot.surfaceRef) return undefined;
    const surf = component.surfaces?.[slot.surfaceRef];
    const items = surf?.items;
    return Array.isArray(items) ? (items[0] as AgentProduct) : undefined;
  };

  const addProduct = (p: AgentProduct, key: string) => {
    const id = productId(p);
    const price = productPrice(p);
    if (!id || price === undefined) return;
    const name = productName(p) ?? id;
    addToCart({ productId: id, name, price, image: productImage(p) });
    setAdded((a) => ({ ...a, [key]: true }));
    window.setTimeout(() => setAdded((a) => ({ ...a, [key]: false })), 1800);
  };

  if (bundles.length === 0) return null;

  return (
    <div className="cpd-bundles">
      <h3 className="cpd-section-title">{title}</h3>
      <div className="cpd-bundle-grid">
        {bundles.map((b, bi) => {
          const slots = (b.slots ?? []).map((s) => ({ slot: s, product: productFor(s) }));
          const total = slots.reduce(
            (sum, { product }) => sum + (product ? productPrice(product) ?? 0 : 0),
            0,
          );
          return (
            <div key={b.bundleId ?? bi} className="cpd-bundle">
              <div className="cpd-bundle-head">
                <span className="cpd-bundle-label">{b.label}</span>
                {b.description && (
                  <p className="cpd-bundle-desc">{b.description}</p>
                )}
              </div>
              <ul className="cpd-bundle-slots">
                {slots.map(({ slot, product }, si) => {
                  const key = `${bi}-${si}`;
                  if (!product) {
                    return (
                      <li key={si} className="cpd-bundle-slot cpd-bundle-slot--empty">
                        <span className="cpd-slot-cat">{slot.categoryLabel}</span>
                        <span className="cpd-slot-na">Not available</span>
                      </li>
                    );
                  }
                  const id = productId(product);
                  const img = productImage(product);
                  const price = productPrice(product);
                  const href = id ? `/product/${encodeURIComponent(id)}` : undefined;
                  return (
                    <li key={si} className="cpd-bundle-slot">
                      <span className="cpd-slot-cat">{slot.categoryLabel}</span>
                      <MaybeLink className="cpd-slot-product" to={href}>
                        <div className="cpd-slot-image">
                          {img ? (
                            <img src={img} alt="" loading="lazy" />
                          ) : (
                            <div className="cpd-card-noimg">No image</div>
                          )}
                        </div>
                        <div className="cpd-slot-info">
                          <span className="cpd-slot-name">{productName(product)}</span>
                          {price !== undefined && (
                            <span className="cpd-slot-price">{formatPrice(price)}</span>
                          )}
                        </div>
                      </MaybeLink>
                      <button
                        type="button"
                        className={`cpd-card-add cpd-slot-add${added[key] ? ' is-added' : ''}`}
                        onClick={() => addProduct(product, key)}
                        aria-label={`Add ${productName(product)} to cart`}
                      >
                        {added[key] ? '✓' : '+ Add'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="cpd-bundle-foot">
                <span className="cpd-bundle-total">
                  Bundle total <strong>{formatPrice(total)}</strong>
                </span>
                <button
                  type="button"
                  className="cart-checkout-btn cpd-bundle-addall"
                  onClick={() =>
                    slots.forEach(({ product }, si) => {
                      if (product) addProduct(product, `${bi}-${si}`);
                    })
                  }
                >
                  Add bundle to cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NextActionsBar({
  component,
  onAction,
}: {
  component: CanvasComponent;
  onAction: (text: string) => void;
}) {
  const actions = (component.data.actions as { text?: string; type?: string }[]) ?? [];
  if (actions.length === 0) return null;
  return (
    <div className="cpd-next-actions">
      <span className="cpd-next-label">Next</span>
      <div className="cpd-next-chips">
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            className="support-chip cpd-next-chip"
            onClick={() => a.text && onAction(a.text)}
          >
            {a.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductTable({ component }: { component: CanvasComponent }) {
  const products = asProducts(component.data);
  const heading = (component.props.heading as string) || 'Comparison';
  if (products.length === 0) return null;
  // Collect attribute keys to compare (skip identifiers, media, and internals).
  const skip = new Set([
    'ec_product_id', 'productId', 'permanentid', 'ec_item_group_id', 'ec_name', 'name',
    'ec_image', 'image', 'imageUrl', 'ec_images', 'clickUri', 'ec_description', 'excerpt',
    'ec_shortdesc', 'resultType', 'queryPinned', 'totalNumberOfChildren', 'ec_listing',
  ]);
  const attrKeys = [
    ...new Set(products.flatMap((p) => Object.keys(p).filter((k) => !skip.has(k)))),
  ].slice(0, 8);
  return (
    <div className="cpd-table-wrap">
      <h3 className="cpd-section-title">{heading}</h3>
      <table className="cpd-table">
        <thead>
          <tr>
            <th />
            {products.map((p, i) => (
              <th key={i}>{productName(p)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attrKeys.map((k) => (
            <tr key={k}>
              <td className="cpd-table-attr">{k}</td>
              {products.map((p, i) => (
                <td key={i}>{String(p[k] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnknownComponent({ component }: { component: CanvasComponent }) {
  // Graceful fallback: if it looks like it carries products, show them.
  const products = asProducts(component.data);
  if (products.length > 0) return <ProductCarousel component={component} />;
  return null;
}
