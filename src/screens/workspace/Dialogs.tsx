import { useRef, useState } from 'react';
import { getCatalogInfo, getProduct, parseCatalogFeed, resetCatalog, setImportedCatalog } from '../../catalog/catalog';
import { RETAILERS } from '../../catalog/retailers';
import { formatIls, formatTime } from '../../lib/format';
import { summarize, type BudgetLine } from '../../logic/budget';
import { activeDesign } from '../../state/project';
import type { Project } from '../../types';
import { CATEGORY_LABEL } from '../../types';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { SourceNote } from './ProductCard';

const KIND_TAG: Record<BudgetLine['kind'], string> = {
  product: 'Chosen',
  estimate: 'Estimate',
  kept: 'Keeping',
  owned: 'Already own',
  'unknown-price': 'Price not listed',
};

function Line({ l }: { l: BudgetLine }) {
  const p = l.product;
  return (
    <li className={`sl-line kind-${l.kind}`}>
      <div className="sl-main">
        <span className="sl-cat">{l.category === 'decor' ? 'Decor' : CATEGORY_LABEL[l.category]}</span>
        <span className="sl-tag">{KIND_TAG[l.kind]}</span>
        <b>{p ? p.name : l.label}</b>
        {p && (
          <span className="muted small">
            {RETAILERS[p.retailer].name}
            {l.variantName ? ` · ${l.variantName}` : ''} · <SourceNote product={p} />
          </span>
        )}
        {p &&
          (p.url ? (
            <a href={p.url} target="_blank" rel="noreferrer" className="small">
              Product page <Icon name="external" size={12} />
            </a>
          ) : (
            <a href={RETAILERS[p.retailer].homepage} target="_blank" rel="noreferrer" className="small">
              {RETAILERS[p.retailer].name} website (no product page for sample listings) <Icon name="external" size={12} />
            </a>
          ))}
      </div>
      <div className="sl-money">
        {l.kind === 'product' && <span>{formatIls(l.price)}</span>}
        {(l.kind === 'product' || l.kind === 'unknown-price') && (
          <span className="muted small">
            Delivery {l.delivery == null ? 'not listed' : l.delivery === 0 ? 'included' : formatIls(l.delivery)} · Assembly{' '}
            {l.assembly == null ? 'not listed' : l.assembly === 0 ? 'included' : formatIls(l.assembly)}
          </span>
        )}
        {l.kind === 'estimate' && <span className="est">~{formatIls(l.total)}</span>}
        {(l.kind === 'kept' || l.kind === 'owned') && <span className="muted">—</span>}
        {l.kind === 'unknown-price' && <span className="muted">?</span>}
      </div>
    </li>
  );
}

function listAsText(project: Project): string {
  const out: string[] = [`${project.name} — shopping list`];
  for (const room of project.rooms) {
    const d = activeDesign(room);
    const s = summarize(d, room.budget);
    out.push('', `${room.name} (${d.name}) — budget ${formatIls(room.budget.totalIls)}`);
    for (const l of [...s.lines, ...(s.decor ? [s.decor] : [])]) {
      const cat = l.category === 'decor' ? 'Decor' : CATEGORY_LABEL[l.category];
      if (l.product) out.push(`- ${cat}: ${l.product.name} (${RETAILERS[l.product.retailer].name}) ${l.kind === 'product' ? formatIls(l.total) + ' incl. known fees' : 'price not listed'} ${l.product.url ?? '[sample listing, no link]'}`);
      else out.push(`- ${cat}: ${KIND_TAG[l.kind]}${l.kind === 'estimate' ? ' ~' + formatIls(l.total) : ''}`);
    }
    out.push(`Total ${formatIls(s.total)} · ${s.remaining >= 0 ? formatIls(s.remaining) + ' left' : formatIls(-s.remaining) + ' over budget'}`);
  }
  return out.join('\n');
}

export function ShoppingListDialog({ open, onClose, project, onToggleDecor }: { open: boolean; onClose: () => void; project: Project; onToggleDecor: (roomId: string, v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Shopping list"
      side
      footer={
        <>
          <button
            className="btn btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(listAsText(project));
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? 'Copied' : 'Copy as text'}
          </button>
          <button className="btn btn-sm" onClick={() => window.print()}>
            Print
          </button>
        </>
      }
    >
      {project.rooms.map((room) => {
        const d = activeDesign(room);
        const s = summarize(d, room.budget);
        const pctUsed = Math.min(100, (s.total / Math.max(1, s.budget)) * 100);
        const shortlist = room.shortlist.map(getProduct).filter((p) => !!p);
        return (
          <section key={room.id} className="sl-room">
            <h3>
              {room.name} <span className="muted small">· {d.name}</span>
            </h3>
            <ul className="sl-lines">
              {s.lines.map((l) => (
                <Line key={l.category} l={l} />
              ))}
              {s.decor && <Line l={s.decor} />}
            </ul>
            {d.decor && d.decor.decorEstimateIls > 0 && (
              <label className="check-row small">
                <input type="checkbox" checked={room.budget.includeDecor} onChange={(e) => onToggleDecor(room.id, e.target.checked)} />
                Include decor & accessories estimate
              </label>
            )}
            <div className="sl-totals">
              <div className="meter" aria-hidden="true">
                <i style={{ width: `${pctUsed}%` }} className={s.remaining < 0 ? 'over' : ''} />
              </div>
              <dl>
                <dt>Chosen products</dt>
                <dd>{formatIls(s.products)}</dd>
                <dt>Delivery & assembly (where listed)</dt>
                <dd>{formatIls(s.fees)}</dd>
                <dt>Estimates for unchosen pieces</dt>
                <dd>{formatIls(s.estimates)}</dd>
                <dt className="strong">Projected total</dt>
                <dd className="strong">
                  {formatIls(s.total)} <span className="muted">of {formatIls(s.budget)}</span>
                </dd>
                <dt>{s.remaining >= 0 ? 'Left in budget' : 'Over budget'}</dt>
                <dd className={s.remaining < 0 ? 'neg' : ''}>{formatIls(Math.abs(s.remaining))}</dd>
              </dl>
              {s.unknownPrices > 0 && <p className="muted small">{s.unknownPrices} item without a listed price isn’t included in the total.</p>}
            </div>
            {shortlist.length > 0 && (
              <>
                <h4>Shortlist</h4>
                <ul className="sl-short">
                  {shortlist.map((p) => (
                    <li key={p!.id}>
                      {p!.name} · {RETAILERS[p!.retailer].name} · {p!.priceIls != null ? formatIls(p!.priceIls) : 'price not listed'}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </Dialog>
  );
}

export function HistoryDialog({ open, onClose, project, onRestore }: { open: boolean; onClose: () => void; project: Project; onRestore: (id: string) => void }) {
  const revs = [...project.revisions].reverse();
  return (
    <Dialog open={open} onClose={onClose} title="Saved versions" size="sm">
      {revs.length === 0 ? (
        <p className="muted">No saved versions yet. Each time you save, Forma keeps a version you can reopen.</p>
      ) : (
        <ul className="rev-list">
          {revs.map((r, i) => (
            <li key={r.id}>
              <div>
                <b>{r.label}</b>
                <span className="muted small">
                  {formatTime(r.at)}
                  {i === 0 ? ' · latest' : ''}
                </span>
              </div>
              <button className="btn btn-sm" onClick={() => onRestore(r.id)}>
                Reopen
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, force] = useState(0);
  const info = getCatalogInfo();
  return (
    <Dialog open={open} onClose={onClose} title="What works in this build" size="md">
      <table className="status-table">
        <tbody>
          <tr>
            <th>Working</th>
            <td>
              Upload a photo or use the sample room · style & budget setup · selecting furniture · budget-aware matching with plain-language
              reasons · filters · preview with before/after · apply, cancel, undo/redo · shopping list with budget breakdown · saving projects,
              versions and multiple rooms in this browser.
            </td>
          </tr>
          <tr>
            <th>Demo renderer</th>
            <td>
              Designs and previews are drawn by a built-in parametric renderer for the <b>sample room</b>, using each product’s listed dimensions,
              colour, material and shape. They are not AI-generated or photorealistic.
            </td>
          </tr>
          <tr>
            <th>Uploaded photos</th>
            <td>
              Whole-room redesign isn’t available (no image-generation service is connected). You can mark furniture on your photo; previews are
              a rough overlay drawn into the area you marked. Matching uses the colour sampled from your photo and the width you enter.
            </td>
          </tr>
          <tr>
            <th>Product data</th>
            <td>
              {info.kind === 'sample' ? (
                <>
                  <b>Sample catalog.</b> No retailer feed or API for IKEA Israel, ACE, Beitili or Floralis is connected. Listings are illustrative
                  placeholders: names, prices and stock are not from the stores, there are no product pages, and product images are illustrations.
                </>
              ) : (
                <>
                  Using catalog file <b>{info.fileName}</b> ({info.count} products, imported {formatTime(info.importedAt)}). Categories it doesn’t
                  cover fall back to the sample catalog.
                </>
              )}
            </td>
          </tr>
          <tr>
            <th>Room size</th>
            <td>Forma never estimates measurements from a photo. Fit checks use the wall length you enter.</td>
          </tr>
        </tbody>
      </table>
      <div className="about-actions">
        <button className="btn btn-sm" onClick={() => file.current?.click()}>
          Load catalog file (JSON)
        </button>
        {info.kind === 'imported' && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetCatalog();
              setMsg('Back to the sample catalog.');
              force((n) => n + 1);
            }}
          >
            Use sample catalog
          </button>
        )}
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const { products, errors } = parseCatalogFeed(JSON.parse(await f.text()));
              if (!products.length) return setMsg(errors[0] ?? 'No products found in that file.');
              setImportedCatalog(products, f.name);
              setMsg(`Loaded ${products.length} products${errors.length ? `, skipped ${errors.length} invalid rows` : ''}.`);
              force((n) => n + 1);
            } catch {
              setMsg('That file isn’t valid JSON.');
            }
          }}
        />
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
      <p className="muted small">The file format is documented in the README.</p>
    </Dialog>
  );
}
