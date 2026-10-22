import { useState } from 'react';
import { variantPrice } from '../../catalog/catalog';
import { RETAILERS } from '../../catalog/retailers';
import { formatDate, formatDims, formatIls } from '../../lib/format';
import { productAllIn } from '../../logic/budget';
import { matchLine, type Match } from '../../logic/matching';
import type { Availability, Product } from '../../types';
import { Icon } from '../../ui/Icon';
import { ProductThumb } from './ProductThumb';

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  'in-stock': 'In stock',
  limited: 'Limited stock',
  'out-of-stock': 'Out of stock',
  unknown: 'Stock not listed',
};

/** Short fee summary, e.g. "+ ₪250 delivery · assembly included". */
function feeText(p: Product): string {
  const part = (v: number | null, name: string) => (v == null ? `${name} not listed` : v === 0 ? `${name} included` : `+ ${formatIls(v)} ${name}`);
  return `${part(p.deliveryIls, 'delivery')} · ${part(p.assemblyIls, 'assembly')}`;
}

export function SourceNote({ product }: { product: Product }) {
  if (product.source === 'sample') return <>Sample listing — not checked with {RETAILERS[product.retailer].name}</>;
  return <>{product.checkedAt ? `Checked ${formatDate(product.checkedAt)}` : 'Check date not provided by feed'}</>;
}

export function ProductCard({
  match,
  cap,
  wallCm,
  shortlisted,
  busy,
  isCurrent,
  onPreview,
  onShortlist,
}: {
  match: Match;
  cap: number;
  wallCm: number | null;
  shortlisted: boolean;
  busy: boolean;
  isCurrent: boolean;
  onPreview: (variantId: string) => void;
  onShortlist: () => void;
}) {
  const p = match.product;
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState(match.variantId);
  const price = variantPrice(p, variantId);
  const allIn = productAllIn(p, variantId);
  const over = allIn != null && allIn > cap ? allIn - cap : 0;
  const line = matchLine(match);
  const detailsId = `details-${p.id}`;

  return (
    <article className={`pcard${isCurrent ? ' is-current' : ''}`} aria-label={p.name}>
      <ProductThumb product={p} variantId={variantId} />
      <div className="pcard-body">
        <h3>{p.name}</h3>
        <p className="pcard-store">
          {RETAILERS[p.retailer].name}
          {p.source === 'sample' && <span className="tag">Sample</span>}
        </p>
        <p className="pcard-price">
          {price != null ? <b>{formatIls(price)}</b> : <b className="muted">Price not listed</b>}
          {price != null && <span className="muted"> {feeText(p)}</span>}
        </p>
        {over > 0 && <p className="pcard-over">{formatIls(over)} over your limit</p>}
        {line && <p className="pcard-why">{line}</p>}
        <div className="pcard-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onPreview(variantId)} disabled={busy || isCurrent} aria-describedby={isCurrent ? undefined : undefined}>
            {isCurrent ? 'In your room' : 'Preview in room'}
          </button>
          <button className={`icon-btn${shortlisted ? ' is-on' : ''}`} onClick={onShortlist} aria-pressed={shortlisted} aria-label={shortlisted ? 'Remove from shortlist' : 'Save to shortlist'}>
            <Icon name="heart" size={17} />
          </button>
          <button className="link-btn" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
            Details <Icon name="chevronDown" size={14} className={open ? 'rot180' : ''} />
          </button>
        </div>
        {open && (
          <dl className="pcard-details" id={detailsId}>
            <dt>Size</dt>
            <dd>{p.dims ? formatDims(p.dims) : 'Not listed'}</dd>
            {p.category === 'sofa' && (
              <>
                <dt>Fit</dt>
                <dd>
                  {!p.dims
                    ? 'Can’t check — no dimensions'
                    : wallCm
                      ? p.dims.widthCm <= wallCm
                        ? `Fits your ${wallCm} cm wall with ${wallCm - p.dims.widthCm} cm to spare`
                        : `${p.dims.widthCm - wallCm} cm wider than your ${wallCm} cm wall`
                      : 'Enter your wall length to check'}
                </dd>
              </>
            )}
            <dt>Material</dt>
            <dd className="cap">{p.material === 'boucle' ? 'bouclé' : p.material}</dd>
            <dt>Colour</dt>
            <dd>
              <div className="variants" role="radiogroup" aria-label="Colour">
                {p.variants.map((v) => (
                  <button
                    key={v.id}
                    role="radio"
                    aria-checked={variantId === v.id}
                    className={`variant${variantId === v.id ? ' is-on' : ''}`}
                    onClick={() => setVariantId(v.id)}
                  >
                    <i style={{ background: v.colorHex }} />
                    {v.name}
                    {v.priceIls != null && v.priceIls !== p.priceIls ? ` · ${formatIls(v.priceIls)}` : ''}
                  </button>
                ))}
              </div>
            </dd>
            <dt>Stock</dt>
            <dd>{AVAILABILITY_LABEL[p.availability]}</dd>
            <dt>Delivery</dt>
            <dd>{p.deliveryIls == null ? 'Not listed' : p.deliveryIls === 0 ? 'Included' : formatIls(p.deliveryIls)}</dd>
            <dt>Assembly</dt>
            <dd>{p.assemblyIls == null ? 'Not listed' : p.assemblyIls === 0 ? 'Included' : formatIls(p.assemblyIls)}</dd>
            {allIn != null && (
              <>
                <dt>All-in</dt>
                <dd>{formatIls(allIn)}</dd>
              </>
            )}
            <dt>Source</dt>
            <dd>
              <SourceNote product={p} />
            </dd>
            <dt>Store</dt>
            <dd>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer">
                  View product page <Icon name="external" size={13} />
                </a>
              ) : (
                <>
                  No product page for sample listings.{' '}
                  <a href={RETAILERS[p.retailer].homepage} target="_blank" rel="noreferrer">
                    {RETAILERS[p.retailer].name} website <Icon name="external" size={13} />
                  </a>
                </>
              )}
            </dd>
          </dl>
        )}
      </div>
    </article>
  );
}
