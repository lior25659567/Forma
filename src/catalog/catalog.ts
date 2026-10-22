import type { Category, ItemShape, LampShape, Material, Product, RugShape, SofaShape, TableShape } from '../types';
import { RETAILER_IDS } from './retailers';
import { SAMPLE_PRODUCTS } from './sampleCatalog';

// ---- Catalog source ----
// The app reads products through this module only. In this build the source is either the
// bundled sample catalog or a JSON feed file the user imports. No live retailer API is called.

export type CatalogSourceInfo =
  | { kind: 'sample' }
  | { kind: 'imported'; fileName: string; importedAt: string; count: number };

let products: Product[] = SAMPLE_PRODUCTS;
let info: CatalogSourceInfo = { kind: 'sample' };
const listeners = new Set<() => void>();

export function getCatalogInfo(): CatalogSourceInfo {
  return info;
}

export function subscribeCatalog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function allProducts(): Product[] {
  return products;
}

/** Loads alternatives for a category. Async so a networked feed can drop in without UI changes. */
export async function fetchProducts(category: Category, signal?: AbortSignal): Promise<Product[]> {
  await new Promise((r) => setTimeout(r, 280));
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return products.filter((p) => p.category === category);
}

export function setImportedCatalog(list: Product[], fileName: string) {
  // Keep sample products for categories the feed doesn't cover.
  const covered = new Set(list.map((p) => p.category));
  products = [...list, ...SAMPLE_PRODUCTS.filter((p) => !covered.has(p.category))];
  info = { kind: 'imported', fileName, importedAt: new Date().toISOString(), count: list.length };
  listeners.forEach((l) => l());
}

export function resetCatalog() {
  products = SAMPLE_PRODUCTS;
  info = { kind: 'sample' };
  listeners.forEach((l) => l());
}

// ---- Feed parsing ----

const MATERIALS: Material[] = ['boucle', 'linen', 'velvet', 'leather', 'cotton', 'chenille', 'wood', 'metal', 'glass', 'stone', 'rattan', 'wool', 'jute', 'paper'];
const CATS: Category[] = ['sofa', 'coffeeTable', 'rug', 'floorLamp'];

/**
 * Parses a maintained catalog / retailer feed exported as JSON:
 * { "products": [ { id, category, name, retailer, url, priceIls, deliveryIls?, assemblyIls?,
 *   dims?: {widthCm, depthCm, heightCm}, material, colorName, colorHex, variants?, availability?,
 *   checkedAt, images?, render? } ] }
 * Invalid rows are skipped and reported.
 */
export function parseCatalogFeed(json: unknown): { products: Product[]; errors: string[] } {
  const errors: string[] = [];
  const rows = (json as { products?: unknown[] })?.products;
  if (!Array.isArray(rows)) return { products: [], errors: ['File must contain a "products" array.'] };
  const out: Product[] = [];
  rows.forEach((raw, i) => {
    const r = raw as Record<string, unknown>;
    const where = `Row ${i + 1}`;
    if (typeof r.id !== 'string' || typeof r.name !== 'string') return errors.push(`${where}: missing id or name.`);
    if (!CATS.includes(r.category as Category)) return errors.push(`${where}: unknown category.`);
    if (!RETAILER_IDS.includes(r.retailer as never)) return errors.push(`${where}: unknown retailer.`);
    if (r.url != null && (typeof r.url !== 'string' || !/^https:\/\//.test(r.url)))
      return errors.push(`${where}: url must be an https link.`);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
    const d = r.dims as Record<string, unknown> | undefined;
    const dims =
      d && num(d.widthCm) && num(d.depthCm) && num(d.heightCm)
        ? { widthCm: d.widthCm as number, depthCm: d.depthCm as number, heightCm: d.heightCm as number }
        : null;
    const colorHex = typeof r.colorHex === 'string' && /^#[0-9a-f]{6}$/i.test(r.colorHex) ? r.colorHex : '#999999';
    out.push({
      id: `feed:${r.id}`,
      category: r.category as Category,
      name: r.name,
      retailer: r.retailer as Product['retailer'],
      url: (r.url as string) ?? null,
      priceIls: num(r.priceIls),
      deliveryIls: num(r.deliveryIls),
      assemblyIls: num(r.assemblyIls),
      dims,
      material: MATERIALS.includes(r.material as Material) ? (r.material as Material) : 'cotton',
      colorName: typeof r.colorName === 'string' ? r.colorName : 'Unspecified',
      colorHex,
      variants: Array.isArray(r.variants)
        ? (r.variants as Record<string, unknown>[]).map((v, j) => ({
            id: `feed:${r.id}-v${j}`,
            name: String(v.name ?? `Variant ${j + 1}`),
            colorHex: typeof v.colorHex === 'string' ? v.colorHex : colorHex,
            priceIls: num(v.priceIls),
          }))
        : [{ id: `feed:${r.id}-default`, name: String(r.colorName ?? 'Default'), colorHex, priceIls: num(r.priceIls) }],
      availability: (['in-stock', 'limited', 'out-of-stock'] as const).includes(r.availability as never)
        ? (r.availability as Product['availability'])
        : 'unknown',
      checkedAt: typeof r.checkedAt === 'string' ? r.checkedAt : null,
      images: Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.startsWith('https://')) : [],
      render: (r.render as Partial<ItemShape>) ?? null,
      source: 'imported',
    });
  });
  return { products: out, errors };
}

// ---- Rendering a product ----

export type ShapeResult = { ok: true; shape: ItemShape } | { ok: false; reason: string };

/**
 * Turns a product listing into the parametric shape the room renderer draws. Uses the listing's
 * real dimensions, colour (or chosen variant) and material. Fails rather than guessing when the
 * listing has no dimensions.
 */
export function productShape(p: Product, variantId?: string): ShapeResult {
  if (!p.dims) {
    return { ok: false, reason: "The listing doesn't include dimensions, so Forma can't size it in your room." };
  }
  const color = p.variants.find((v) => v.id === variantId)?.colorHex ?? p.colorHex;
  const r = (p.render ?? {}) as Record<string, unknown>;
  const { widthCm, depthCm, heightCm } = p.dims;
  switch (p.category) {
    case 'sofa': {
      const s: SofaShape = {
        kind: 'sofa',
        widthCm,
        depthCm,
        heightCm,
        arms: (r.arms as SofaShape['arms']) ?? 'track',
        legs: (r.legs as SofaShape['legs']) ?? 'tapered-wood',
        silhouette: (r.silhouette as SofaShape['silhouette']) ?? 'straight',
        seatCushions: (r.seatCushions as SofaShape['seatCushions']) ?? 2,
        color,
        material: p.material,
        legColor: (r.legColor as string) ?? '#6b4a33',
      };
      return { ok: true, shape: s };
    }
    case 'coffeeTable': {
      const s: TableShape = {
        kind: 'coffeeTable',
        widthCm,
        depthCm,
        heightCm,
        top: (r.top as TableShape['top']) ?? 'rect',
        base: (r.base as TableShape['base']) ?? 'four-legs',
        color,
        material: p.material,
        legColor: (r.legColor as string) ?? color,
      };
      return { ok: true, shape: s };
    }
    case 'rug': {
      const s: RugShape = {
        kind: 'rug',
        widthCm,
        depthCm,
        pattern: (r.pattern as RugShape['pattern']) ?? 'solid',
        shape: (r.shape as RugShape['shape']) ?? 'rect',
        color,
        accent: (r.accent as string) ?? color,
        material: p.material,
      };
      return { ok: true, shape: s };
    }
    case 'floorLamp': {
      const s: LampShape = {
        kind: 'floorLamp',
        heightCm,
        shade: (r.shade as LampShape['shade']) ?? 'drum',
        color,
        baseColor: (r.baseColor as string) ?? '#2a2a2a',
        material: p.material,
      };
      return { ok: true, shape: s };
    }
  }
}

export function variantPrice(p: Product, variantId?: string): number | null {
  const v = p.variants.find((x) => x.id === variantId);
  return v?.priceIls ?? p.priceIls;
}
