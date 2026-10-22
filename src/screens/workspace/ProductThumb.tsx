import { useId, useMemo } from 'react';
import { productShape } from '../../catalog/catalog';
import { drawItem, type Ctx } from '../../render/items';
import { SceneDefs } from '../../render/SceneDefs';
import { ACCENT } from '../../render/RoomScene';
import type { ItemShape, Product } from '../../types';

/** Draws an item shape on its own, cropped to its bounds. */
export function ShapeIllustration({ shape, label }: { shape: ItemShape; label?: string }) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = `th${rid}`;
  const drawn = useMemo(() => {
    const ctx: Ctx = { id, n: 0 };
    const at = shape.kind === 'rug' ? { X: 0, Z: 320 } : { X: -40, Z: 420 };
    return drawItem(ctx, shape, { at, glow: 0.3 });
  }, [shape, id]);
  const b = drawn.bbox;
  const pad = Math.max(b.w, b.h) * 0.08;
  return (
    <svg viewBox={`${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <SceneDefs id={id} accent={ACCENT} />
      {drawn.node}
    </svg>
  );
}

/**
 * Product image. Uses the retailer's photo when the listing has one; otherwise draws an
 * illustration from the listing's attributes and says so.
 */
export function ProductThumb({ product, variantId }: { product: Product; variantId?: string }) {
  if (product.images.length > 0) {
    return (
      <div className="thumb">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
      </div>
    );
  }
  const res = productShape(product, variantId);
  return (
    <div className="thumb thumb-illus" title="Illustration drawn from the listing’s attributes — no retailer photo in this catalog">
      {res.ok ? <ShapeIllustration shape={res.shape} label={`Illustration of ${product.name}`} /> : <span className="thumb-missing">No image</span>}
      <span className="thumb-tag">Illustration</span>
    </div>
  );
}
