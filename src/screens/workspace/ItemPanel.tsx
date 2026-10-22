import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchProducts, getCatalogInfo } from '../../catalog/catalog';
import { RETAILER_IDS, RETAILERS } from '../../catalog/retailers';
import { COLOR_FAMILY_LABEL, type ColorFamily } from '../../lib/color';
import { formatIls } from '../../lib/format';
import type { BudgetLine, ItemCap } from '../../logic/budget';
import {
  activeFilterCount,
  alternatives,
  EMPTY_FILTERS,
  shapeFacet,
  SORT_LABEL,
  type Filters,
  type SortKey,
} from '../../logic/matching';
import type { Category, ItemShape, Material, Product } from '../../types';
import { CATEGORY_LABEL } from '../../types';
import { Icon } from '../../ui/Icon';
import { ProductCard } from './ProductCard';

const MATERIALS_BY_CAT: Record<Category, Material[]> = {
  sofa: ['boucle', 'linen', 'cotton', 'chenille', 'velvet', 'leather'],
  coffeeTable: ['wood', 'stone', 'metal', 'glass', 'rattan'],
  rug: ['wool', 'jute', 'cotton'],
  floorLamp: ['paper', 'linen', 'metal', 'glass'],
};

export interface PanelProps {
  category: Category;
  target: ItemShape;
  partial: { knownWidth: boolean } | null;
  cap: ItemCap;
  currentLine: BudgetLine | null;
  currentProductId: string | null;
  designName: string;
  wallCm: number | null;
  shortlist: string[];
  previewBusy: boolean;
  canKeepExisting: boolean;
  onClose: () => void;
  onPreview: (p: Product, variantId: string) => void;
  onSetAllowance: (n: number) => void;
  onToggleShortlist: (id: string) => void;
  onKeepExisting: () => void;
  onEnterWall: () => void;
}

export function ItemPanel(props: PanelProps) {
  const { category, target, cap } = props;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('closest');
  const [moreOpen, setMoreOpen] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const [storesOpen, setStoresOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(cap.allowance));
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setBudgetDraft(String(cap.allowance)), [cap.allowance]);

  useEffect(() => {
    titleRef.current?.focus();
    setFilters(EMPTY_FILTERS);
    setShowAbove(false);
    setMoreOpen(false);
  }, [category]);

  useEffect(() => {
    const ac = new AbortController();
    setProducts(null);
    setLoadError(null);
    fetchProducts(category, ac.signal)
      .then(setProducts)
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setLoadError('Couldn’t load products. Check your connection and try again.');
      });
    return () => ac.abort();
  }, [category, attempt]);

  const result = useMemo(
    () =>
      products
        ? alternatives({ products, target, filters, sort, cap: cap.cap, wallCm: props.wallCm, partial: props.partial ?? undefined })
        : null,
    [products, target, filters, sort, cap.cap, props.wallCm, props.partial],
  );

  const facet = shapeFacet(category);
  const moreCount = activeFilterCount(filters);
  const toggle = <K extends 'colors' | 'materials' | 'shapes'>(key: K, v: Filters[K][number]) =>
    setFilters((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(v as string) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const commitBudget = () => {
    const n = Math.round(Number(budgetDraft));
    if (Number.isFinite(n) && n >= 0 && n !== cap.allowance) props.onSetAllowance(n);
    else setBudgetDraft(String(cap.allowance));
  };

  const label = CATEGORY_LABEL[category];
  const storeLabel = filters.stores.length === 0 ? 'All stores' : filters.stores.length === 1 ? RETAILERS[filters.stores[0]].name : `${filters.stores.length} stores`;
  const catalog = getCatalogInfo();
  const line = props.currentLine;

  return (
    <div className="panel-inner">
      <header className="panel-head">
        <h2 ref={titleRef} tabIndex={-1} id="panel-title">
          {label}
        </h2>
        <button className="icon-btn" onClick={props.onClose} aria-label={`Close ${label} panel`}>
          <Icon name="close" />
        </button>
      </header>

      {line && (
        <div className="panel-current">
          <p>
            {line.kind === 'product' || line.kind === 'unknown-price' ? (
              <>
                In your room: <b>{line.label}</b>
                {line.variantName ? ` (${line.variantName})` : ''} · {line.kind === 'product' ? formatIls(line.total) : 'price not listed'}
              </>
            ) : line.kind === 'estimate' ? (
              <>
                Proposed by {props.designName} · <span className="est">estimate {formatIls(line.total)}</span>. Pick a real product below.
              </>
            ) : line.kind === 'kept' ? (
              <>Keeping your existing {label.toLowerCase()}.</>
            ) : (
              <>Your current {label.toLowerCase()}.</>
            )}
          </p>
          {props.canKeepExisting && line.kind !== 'kept' && line.kind !== 'owned' && (
            <button className="link-btn" onClick={props.onKeepExisting}>
              Keep my existing {label.toLowerCase()} instead
            </button>
          )}
        </div>
      )}

      <div className="panel-controls">
        <label className="budget-field">
          <span>{label} budget</span>
          <div className="money-input money-input-sm">
            <span>₪</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value)}
              onBlur={commitBudget}
              onKeyDown={(e) => e.key === 'Enter' && commitBudget()}
              aria-describedby="cap-note"
            />
          </div>
        </label>
        <p id="cap-note" className={`cap-note${cap.roomLeft < cap.allowance ? ' is-warn' : ''}`}>
          {cap.roomLeft < cap.allowance
            ? cap.roomLeft <= 0
              ? 'No room budget left after your other pieces.'
              : `Room budget leaves ${formatIls(cap.roomLeft)} for this piece.`
            : `${formatIls(cap.roomLeft)} of the room budget is available for this piece.`}
        </p>

        <div className="control-row">
          <div className="popover-wrap">
            <button className="select-btn" aria-expanded={storesOpen} aria-haspopup="true" onClick={() => setStoresOpen(!storesOpen)}>
              {storeLabel} <Icon name="chevronDown" size={14} />
            </button>
            {storesOpen && (
              <div className="popover" role="group" aria-label="Stores" onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setStoresOpen(false))}>
                {RETAILER_IDS.map((r) => (
                  <label key={r} className="check-row">
                    <input
                      type="checkbox"
                      checked={filters.stores.length === 0 || filters.stores.includes(r)}
                      onChange={(e) => {
                        const cur = filters.stores.length === 0 ? [...RETAILER_IDS] : filters.stores;
                        const next = e.target.checked ? [...cur, r] : cur.filter((x) => x !== r);
                        setFilters({ ...filters, stores: next.length === RETAILER_IDS.length || next.length === 0 ? [] : next });
                      }}
                    />
                    {RETAILERS[r].name}
                  </label>
                ))}
                <button className="link-btn" onClick={() => setStoresOpen(false)}>
                  Done
                </button>
              </div>
            )}
          </div>
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </div>

        <button className="more-btn" aria-expanded={moreOpen} aria-controls="more-filters" onClick={() => setMoreOpen(!moreOpen)}>
          <Icon name="filter" size={16} /> More filters
          {moreCount > 0 && <span className="count">{moreCount}</span>}
          <Icon name="chevronDown" size={14} className={moreOpen ? 'rot180' : ''} />
        </button>
        {moreOpen && (
          <div className="more-filters" id="more-filters">
            {category === 'sofa' && (
              <fieldset>
                <legend>Dimensions</legend>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={filters.fitWall}
                    disabled={!props.wallCm}
                    onChange={(e) => setFilters({ ...filters, fitWall: e.target.checked })}
                  />
                  Fits my wall{props.wallCm ? ` (${props.wallCm} cm)` : ''}
                </label>
                {!props.wallCm && (
                  <button className="link-btn" onClick={props.onEnterWall}>
                    Enter wall length
                  </button>
                )}
                <label className="inline-field">
                  Max width
                  <input
                    type="number"
                    min={50}
                    placeholder="any"
                    value={filters.maxWidthCm ?? ''}
                    onChange={(e) => setFilters({ ...filters, maxWidthCm: e.target.value ? Number(e.target.value) : null })}
                  />
                  cm
                </label>
              </fieldset>
            )}
            <fieldset>
              <legend>Colour</legend>
              <div className="chips">
                {(Object.keys(COLOR_FAMILY_LABEL) as ColorFamily[]).map((c) => (
                  <button key={c} className={`chip${filters.colors.includes(c) ? ' is-on' : ''}`} aria-pressed={filters.colors.includes(c)} onClick={() => toggle('colors', c)}>
                    {COLOR_FAMILY_LABEL[c]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Material</legend>
              <div className="chips">
                {MATERIALS_BY_CAT[category].map((m) => (
                  <button key={m} className={`chip cap${filters.materials.includes(m) ? ' is-on' : ''}`} aria-pressed={filters.materials.includes(m)} onClick={() => toggle('materials', m)}>
                    {m === 'boucle' ? 'bouclé' : m}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{facet.label}</legend>
              <div className="chips">
                {facet.options.map((o) => (
                  <button key={o.value} className={`chip${filters.shapes.includes(o.value) ? ' is-on' : ''}`} aria-pressed={filters.shapes.includes(o.value)} onClick={() => toggle('shapes', o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Availability</legend>
              <label className="check-row">
                <input type="checkbox" checked={filters.inStockOnly} onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })} />
                Only show items listed as in stock
              </label>
            </fieldset>
            {moreCount > 0 && (
              <button className="link-btn" onClick={() => setFilters({ ...EMPTY_FILTERS, stores: filters.stores })}>
                Clear filters (keeps your budget)
              </button>
            )}
          </div>
        )}
      </div>

      <section className="results" aria-live="polite" aria-busy={!result && !loadError}>
        {loadError && (
          <div className="empty">
            <p>{loadError}</p>
            <button className="btn btn-sm" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        )}
        {!result && !loadError && (
          <>
            <p className="sr-only">Loading alternatives…</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="pcard skeleton" aria-hidden="true">
                <div className="thumb" />
                <div className="pcard-body">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </>
        )}
        {result && (
          <>
            {result.within.length > 0 && (
              <p className="results-count">
                {result.within.length} {result.within.length === 1 ? 'option' : 'options'} within {formatIls(cap.cap)}
              </p>
            )}
            {result.within.length === 0 && (
              <div className="empty">
                <p>
                  <b>No matches within budget.</b> {result.reason}
                </p>
                {result.suggestion && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const a = result.suggestion!.action;
                      if (a.type === 'raise-budget') props.onSetAllowance(a.to);
                      if (a.type === 'all-stores') setFilters({ ...filters, stores: [] });
                      if (a.type === 'clear-filter') setFilters({ ...filters, [a.key]: EMPTY_FILTERS[a.key] });
                    }}
                  >
                    {result.suggestion.text}
                  </button>
                )}
                {result.suggestion?.action.type === 'raise-budget' && cap.roomLeft < result.suggestion.action.to && (
                  <p className="muted small">That would take the room over its total budget if the other pieces stay as they are.</p>
                )}
              </div>
            )}
            {result.within.map((m) => (
              <ProductCard
                key={m.product.id}
                match={m}
                cap={cap.cap}
                wallCm={props.wallCm}
                shortlisted={props.shortlist.includes(m.product.id)}
                busy={props.previewBusy}
                isCurrent={props.currentProductId === m.product.id}
                onPreview={(v) => props.onPreview(m.product, v)}
                onShortlist={() => props.onToggleShortlist(m.product.id)}
              />
            ))}
            {result.above.length > 0 && (
              <div className="above">
                <button className="btn btn-sm btn-ghost" aria-expanded={showAbove} onClick={() => setShowAbove(!showAbove)}>
                  {showAbove ? 'Hide options above budget' : `Show ${result.above.length} ${result.above.length === 1 ? 'option' : 'options'} above budget`}
                </button>
                {showAbove &&
                  result.above.map((m) => (
                    <ProductCard
                      key={m.product.id}
                      match={m}
                      cap={cap.cap}
                      wallCm={props.wallCm}
                      shortlisted={props.shortlist.includes(m.product.id)}
                      busy={props.previewBusy}
                      isCurrent={props.currentProductId === m.product.id}
                      onPreview={(v) => props.onPreview(m.product, v)}
                      onShortlist={() => props.onToggleShortlist(m.product.id)}
                    />
                  ))}
              </div>
            )}
            {result.unknownPrice.length > 0 && (
              <details className="unknown">
                <summary>
                  {result.unknownPrice.length} without a listed price — can’t confirm they fit your budget
                </summary>
                {result.unknownPrice.map((m) => (
                  <ProductCard
                    key={m.product.id}
                    match={m}
                    cap={cap.cap}
                    wallCm={props.wallCm}
                    shortlisted={props.shortlist.includes(m.product.id)}
                    busy={props.previewBusy}
                    isCurrent={props.currentProductId === m.product.id}
                    onPreview={(v) => props.onPreview(m.product, v)}
                    onShortlist={() => props.onToggleShortlist(m.product.id)}
                  />
                ))}
              </details>
            )}
            {props.partial && (
              <p className="muted small">
                For uploaded photos Forma compares colour{props.partial.knownWidth ? ' and width' : ''} only — it can’t read the shape of your
                existing piece.
              </p>
            )}
          </>
        )}
      </section>

      <footer className="panel-foot">
        <Icon name="info" size={14} />
        {catalog.kind === 'sample'
          ? 'Sample catalog: illustrative listings, not live retailer data.'
          : `Catalog file “${catalog.fileName}” (${catalog.count} products).`}
      </footer>
    </div>
  );
}
