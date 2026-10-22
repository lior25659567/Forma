import { getProduct, variantPrice } from '../catalog/catalog';
import type { Budget, Category, Design, PlacedItem, Product } from '../types';
import { CATEGORIES } from '../types';

/** Default share of the room budget allotted to each piece when the user hasn't set one. */
export const DEFAULT_SHARES: Record<Category, number> = {
  sofa: 0.42,
  coffeeTable: 0.12,
  rug: 0.14,
  floorLamp: 0.07,
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function allowance(budget: Budget, c: Category): number {
  return budget.allowances[c] ?? roundTo(budget.totalIls * DEFAULT_SHARES[c], 50);
}

export type LineKind = 'product' | 'estimate' | 'kept' | 'owned' | 'unknown-price';

export interface BudgetLine {
  category: Category | 'decor';
  kind: LineKind;
  label: string;
  product?: Product;
  variantName?: string;
  price: number;
  delivery: number | null;
  assembly: number | null;
  /** Amount counted toward the room total. */
  total: number;
}

export function productAllIn(p: Product, variantId?: string): number | null {
  const price = variantPrice(p, variantId);
  if (price == null) return null;
  return price + (p.deliveryIls ?? 0) + (p.assemblyIls ?? 0);
}

export function lineFor(item: PlacedItem): BudgetLine {
  const c = item.category;
  const src = item.source;
  switch (src.type) {
    case 'original':
      return { category: c, kind: 'owned', label: 'Already in the room', price: 0, delivery: null, assembly: null, total: 0 };
    case 'kept':
      return { category: c, kind: 'kept', label: 'Keeping my existing piece', price: 0, delivery: null, assembly: null, total: 0 };
    case 'generated':
      return {
        category: c,
        kind: 'estimate',
        label: 'Estimate — no product chosen yet',
        price: src.estimateIls,
        delivery: null,
        assembly: null,
        total: src.estimateIls,
      };
    case 'product': {
      const p = getProduct(src.productId);
      if (!p) {
        return { category: c, kind: 'unknown-price', label: 'Product no longer in catalog', price: 0, delivery: null, assembly: null, total: 0 };
      }
      const price = variantPrice(p, src.variantId);
      const variantName = p.variants.find((v) => v.id === src.variantId)?.name;
      if (price == null) {
        return { category: c, kind: 'unknown-price', label: p.name, product: p, variantName, price: 0, delivery: p.deliveryIls, assembly: p.assemblyIls, total: (p.deliveryIls ?? 0) + (p.assemblyIls ?? 0) };
      }
      return {
        category: c,
        kind: 'product',
        label: p.name,
        product: p,
        variantName,
        price,
        delivery: p.deliveryIls,
        assembly: p.assemblyIls,
        total: price + (p.deliveryIls ?? 0) + (p.assemblyIls ?? 0),
      };
    }
  }
}

export interface RoomSummary {
  lines: BudgetLine[];
  decor: BudgetLine | null;
  total: number;
  products: number;
  estimates: number;
  fees: number;
  budget: number;
  remaining: number;
  unknownPrices: number;
}

export function summarize(design: Design, budget: Budget): RoomSummary {
  const lines = CATEGORIES.filter((c) => design.items[c]).map((c) => lineFor(design.items[c] as PlacedItem));
  const decor =
    design.decor && design.decor.decorEstimateIls > 0 && budget.includeDecor
      ? ({
          category: 'decor',
          kind: 'estimate',
          label: 'Decor & accessories — estimate',
          price: design.decor.decorEstimateIls,
          delivery: null,
          assembly: null,
          total: design.decor.decorEstimateIls,
        } satisfies BudgetLine)
      : null;
  const all = decor ? [...lines, decor] : lines;
  const total = all.reduce((a, l) => a + l.total, 0);
  return {
    lines,
    decor,
    total,
    products: all.filter((l) => l.kind === 'product').reduce((a, l) => a + l.price, 0),
    estimates: all.filter((l) => l.kind === 'estimate').reduce((a, l) => a + l.total, 0),
    fees: all.filter((l) => l.kind === 'product' || l.kind === 'unknown-price').reduce((a, l) => a + (l.delivery ?? 0) + (l.assembly ?? 0), 0),
    budget: budget.totalIls,
    remaining: budget.totalIls - total,
    unknownPrices: all.filter((l) => l.kind === 'unknown-price').length,
  };
}

export interface ItemCap {
  allowance: number;
  /** Room budget left for this piece after everything else in the design is counted. */
  roomLeft: number;
  /** The binding limit: min(allowance, roomLeft). */
  cap: number;
  /** What the slot currently costs. */
  current: number;
}

export function capFor(design: Design, budget: Budget, c: Category): ItemCap {
  const s = summarize(design, budget);
  const current = design.items[c] ? lineFor(design.items[c] as PlacedItem).total : 0;
  const roomLeft = budget.totalIls - (s.total - current);
  const a = allowance(budget, c);
  return { allowance: a, roomLeft, cap: Math.max(0, Math.min(a, roomLeft)), current };
}

/** Projected room total if `c` were replaced by `p`. */
export function projectedTotal(design: Design, budget: Budget, c: Category, p: Product, variantId?: string) {
  const s = summarize(design, budget);
  const current = design.items[c] ? lineFor(design.items[c] as PlacedItem).total : 0;
  const next = productAllIn(p, variantId);
  return { before: s.total, after: s.total - current + (next ?? 0), delta: (next ?? 0) - current, priceKnown: next != null };
}
