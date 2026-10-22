import { productShape } from '../catalog/catalog';
import { RETAILERS } from '../catalog/retailers';
import { colorDistance, colorFamily, colorName, lightness, type ColorFamily } from '../lib/color';
import { formatIls } from '../lib/format';
import type { Category, ItemShape, Material, Product, RetailerId } from '../types';
import { productAllIn } from './budget';

// ---- Filters & sorting ----

export type SortKey = 'closest' | 'price-asc' | 'price-desc';

export const SORT_LABEL: Record<SortKey, string> = {
  closest: 'Closest look within budget',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

export interface Filters {
  stores: RetailerId[]; // empty = all stores
  maxWidthCm: number | null;
  fitWall: boolean;
  colors: ColorFamily[];
  materials: Material[];
  shapes: string[];
  inStockOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  stores: [],
  maxWidthCm: null,
  fitWall: false,
  colors: [],
  materials: [],
  shapes: [],
  inStockOnly: false,
};

/** Count of filters inside "More filters" (store choice and budget are shown separately). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.maxWidthCm != null ? 1 : 0) +
    (f.fitWall ? 1 : 0) +
    (f.colors.length ? 1 : 0) +
    (f.materials.length ? 1 : 0) +
    (f.shapes.length ? 1 : 0) +
    (f.inStockOnly ? 1 : 0)
  );
}

/** Shape facet for each category: the attribute users recognise most. */
export function shapeFacet(c: Category): { label: string; options: { value: string; label: string }[] } {
  switch (c) {
    case 'sofa':
      return {
        label: 'Arms',
        options: [
          { value: 'track', label: 'Square' },
          { value: 'rolled', label: 'Rolled' },
          { value: 'sloped', label: 'Sloped' },
          { value: 'curved', label: 'Rounded' },
          { value: 'none', label: 'Armless' },
        ],
      };
    case 'coffeeTable':
      return {
        label: 'Top',
        options: [
          { value: 'rect', label: 'Rectangular' },
          { value: 'round', label: 'Round' },
          { value: 'oval', label: 'Oval' },
        ],
      };
    case 'rug':
      return {
        label: 'Pattern',
        options: [
          { value: 'solid', label: 'Plain' },
          { value: 'border', label: 'Border' },
          { value: 'stripe', label: 'Stripe' },
          { value: 'geometric', label: 'Geometric' },
          { value: 'medallion', label: 'Traditional' },
        ],
      };
    case 'floorLamp':
      return {
        label: 'Shade',
        options: [
          { value: 'drum', label: 'Drum' },
          { value: 'cone', label: 'Cone' },
          { value: 'globe', label: 'Globe' },
          { value: 'arc', label: 'Arc' },
          { value: 'paper', label: 'Paper' },
        ],
      };
  }
}

function shapeValue(p: Product): string | undefined {
  const r = (p.render ?? {}) as Record<string, string>;
  switch (p.category) {
    case 'sofa':
      return r.arms;
    case 'coffeeTable':
      return r.top;
    case 'rug':
      return r.pattern;
    case 'floorLamp':
      return r.shade;
  }
}

// ---- Similarity ----

const ARM_TEXT: Record<string, string> = {
  track: 'square arms',
  rolled: 'rolled arms',
  sloped: 'sloped arms',
  curved: 'rounded arms',
  none: 'no arms',
};
const LEG_TEXT: Record<string, string> = {
  'tapered-wood': 'tapered wooden legs',
  metal: 'slim metal legs',
  block: 'low block feet',
  hidden: 'a base that sits on the floor',
  turned: 'turned wooden legs',
};
const SIL_TEXT: Record<string, string> = {
  straight: 'a straight, boxy shape',
  curved: 'a curved shape',
  chesterfield: 'a tufted Chesterfield shape',
  modular: 'separate modular seats',
};
const SOFT: Material[] = ['boucle', 'chenille', 'velvet'];
const WOVEN: Material[] = ['linen', 'cotton'];

function materialLabel(m: Material) {
  return m === 'boucle' ? 'bouclé' : m;
}

function sameFamily(a: Material, b: Material) {
  return (SOFT.includes(a) && SOFT.includes(b)) || (WOVEN.includes(a) && WOVEN.includes(b));
}

export interface Match {
  product: Product;
  variantId: string;
  /** Internal ranking value. Never shown to users. */
  rank: number;
  similar: string[];
  different: string[];
  allIn: number | null;
  fits: boolean | null;
}

function pickVariant(p: Product, targetColor: string) {
  let best = p.variants[0];
  let bestD = Infinity;
  for (const v of p.variants) {
    const d = colorDistance(v.colorHex, targetColor);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

/**
 * Compares a product with the item selected in the room.
 * `colorAndSizeOnly` is used for uploaded photos, where Forma only knows the colour it sampled
 * and the width the user entered — so it never claims similarity in arms, legs or material.
 */
export function compare(target: ItemShape, p: Product, wallCm: number | null, colorAndSizeOnly = false, knownWidth = true): Match {
  const targetColor = target.color;
  const variant = pickVariant(p, targetColor);
  const res = productShape(p, variant.id);
  const similar: string[] = [];
  const different: string[] = [];
  let rank = 0;

  // Colour & tone
  const d = colorDistance(variant.colorHex, targetColor);
  const tName = colorName(targetColor);
  const pName = colorName(variant.colorHex);
  rank += Math.max(0, 1 - d / 50) * 3;
  const inVariant = variant.id !== p.variants[0].id ? ` (in ${variant.name})` : '';
  if (d < 12) similar.push((tName === pName ? `same ${tName} tone` : `a very close ${pName} tone`) + inVariant);
  else if (d < 24) similar.push(`a similar ${pName} tone${inVariant}`);
  else if (d > 38) different.push(`${pName} rather than ${tName}`);
  else different.push(lightness(variant.colorHex) > lightness(targetColor) ? 'a lighter shade' : 'a deeper shade');

  // Material
  if (colorAndSizeOnly) {
    // unknown for photos
  } else if (p.material === target.material) {
    rank += 1;
    similar.push(materialLabel(p.material));
  } else if (sameFamily(p.material, target.material)) {
    rank += 0.5;
  } else {
    different.push(`${materialLabel(p.material)} instead of ${materialLabel(target.material)}`);
  }

  if (res.ok) {
    const s = res.shape;
    if (s.kind === 'sofa' && target.kind === 'sofa' && !colorAndSizeOnly) {
      if (s.silhouette === target.silhouette) {
        rank += 1.2;
        if (s.silhouette !== 'straight') similar.push(SIL_TEXT[s.silhouette]);
      } else different.push(SIL_TEXT[s.silhouette]);
      if (s.arms === target.arms) {
        rank += 1.2;
        similar.push(ARM_TEXT[s.arms]);
      } else different.push(`${ARM_TEXT[s.arms]} instead of ${ARM_TEXT[target.arms].replace(' arms', '')}`);
      if (s.legs === target.legs) {
        rank += 0.8;
        similar.push(LEG_TEXT[s.legs]);
      } else different.push(LEG_TEXT[s.legs]);
      const dh = s.heightCm - target.heightCm;
      rank += Math.max(0, 1 - Math.abs(dh) / 20) * 0.6;
      if (dh <= -8) different.push('a lower back');
      if (dh >= 8) different.push('a taller back');
    }
    if (s.kind === 'coffeeTable' && target.kind === 'coffeeTable' && !colorAndSizeOnly) {
      if (s.top === target.top) {
        rank += 1.2;
        similar.push(`${s.top === 'rect' ? 'rectangular' : s.top} top`);
      } else different.push(`${s.top === 'rect' ? 'rectangular' : s.top} top`);
      if (s.base === target.base) rank += 0.8;
      const dh = s.heightCm - target.heightCm;
      if (Math.abs(dh) >= 6) different.push(dh > 0 ? 'sits higher' : 'sits lower');
    }
    if (s.kind === 'rug' && target.kind === 'rug' && !colorAndSizeOnly) {
      if (s.pattern === target.pattern) {
        rank += 1.2;
        similar.push(s.pattern === 'solid' ? 'plain weave' : `${s.pattern} pattern`);
      } else different.push(s.pattern === 'solid' ? 'plain, no pattern' : `${s.pattern === 'medallion' ? 'traditional' : s.pattern} pattern`);
      if (s.shape !== target.shape) different.push(s.shape === 'round' ? 'round' : 'rectangular');
      else rank += 0.6;
    }
    if (s.kind === 'floorLamp' && target.kind === 'floorLamp' && !colorAndSizeOnly) {
      if (s.shade === target.shade) {
        rank += 1.4;
        similar.push(`${s.shade} shade`);
      } else different.push(`${s.shade} shade`);
      const dh = s.heightCm - target.heightCm;
      if (Math.abs(dh) >= 15) different.push(dh > 0 ? 'taller' : 'shorter');
    }

    // Size (for photos only when the user entered the current width)
    if (s.kind !== 'floorLamp' && target.kind !== 'floorLamp' && (!colorAndSizeOnly || knownWidth)) {
      const dw = s.widthCm - target.widthCm;
      rank += Math.max(0, 1 - Math.abs(dw) / 60);
      if (Math.abs(dw) <= 8) similar.push('about the same width');
      else if (Math.abs(dw) >= 20) different.push(`${Math.abs(dw)} cm ${dw > 0 ? 'wider' : 'narrower'}`);
    }
  }

  // Fit against the user-entered wall length
  let fits: boolean | null = null;
  if (p.category === 'sofa' && wallCm && p.dims) {
    fits = p.dims.widthCm <= wallCm;
    if (!fits) {
      rank -= 2;
      different.unshift(`wider than your ${wallCm} cm wall`);
    }
  }

  if (p.availability === 'out-of-stock') rank -= 0.8;
  if (p.availability === 'unknown') rank -= 0.2;

  return { product: p, variantId: variant.id, rank, similar, different, allIn: productAllIn(p, variant.id), fits };
}

/** One short plain-language line for a product card. */
export function matchLine(m: Match): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const sim = m.similar.slice(0, 2);
  const diff = m.different.slice(0, 1);
  const parts: string[] = [];
  if (sim.length) parts.push(cap(sim.join(' and ')));
  if (diff.length) parts.push(`${sim.length ? '' : 'Different look: '}${cap(diff[0])}`);
  return parts.join('. ') + (parts.length ? '.' : '');
}

// ---- Alternatives ----

export interface AlternativesInput {
  products: Product[];
  target: ItemShape;
  filters: Filters;
  sort: SortKey;
  cap: number;
  wallCm: number | null;
  /** Photo rooms: only colour (and width, if entered) of the existing piece are known. */
  partial?: { knownWidth: boolean };
}

export interface Suggestion {
  text: string;
  action:
    | { type: 'raise-budget'; to: number }
    | { type: 'clear-filter'; key: keyof Filters }
    | { type: 'all-stores' };
}

export interface Alternatives {
  within: Match[];
  above: Match[];
  unknownPrice: Match[];
  total: number;
  filteredOut: number;
  reason: string | null;
  suggestion: Suggestion | null;
}

function passes(p: Product, f: Filters, wallCm: number | null, ignore?: keyof Filters): boolean {
  if (ignore !== 'stores' && f.stores.length && !f.stores.includes(p.retailer)) return false;
  if (ignore !== 'maxWidthCm' && f.maxWidthCm != null && (!p.dims || p.dims.widthCm > f.maxWidthCm)) return false;
  if (ignore !== 'fitWall' && f.fitWall && wallCm && (!p.dims || p.dims.widthCm > wallCm)) return false;
  if (ignore !== 'colors' && f.colors.length && !p.variants.some((v) => f.colors.includes(colorFamily(v.colorHex))))
    return false;
  if (ignore !== 'materials' && f.materials.length && !f.materials.includes(p.material)) return false;
  if (ignore !== 'shapes' && f.shapes.length && !f.shapes.includes(shapeValue(p) ?? '')) return false;
  if (ignore !== 'inStockOnly' && f.inStockOnly && p.availability !== 'in-stock' && p.availability !== 'limited')
    return false;
  return true;
}

const FILTER_NAME: Partial<Record<keyof Filters, string>> = {
  maxWidthCm: 'width limit',
  fitWall: '“fits my wall” filter',
  colors: 'colour filter',
  materials: 'material filter',
  shapes: 'shape filter',
  inStockOnly: '“in stock” filter',
};

export function alternatives(input: AlternativesInput): Alternatives {
  const { products, target, filters, sort, cap, wallCm } = input;
  const scored = products.filter((p) => passes(p, filters, wallCm)).map((p) => compare(target, p, wallCm, !!input.partial, input.partial?.knownWidth ?? true));
  const within = scored.filter((m) => m.allIn != null && m.allIn <= cap);
  const above = scored.filter((m) => m.allIn != null && m.allIn > cap);
  const unknownPrice = scored.filter((m) => m.allIn == null);

  const byRank = (a: Match, b: Match) => b.rank - a.rank;
  const byPrice = (a: Match, b: Match) => (a.allIn ?? 0) - (b.allIn ?? 0);
  if (sort === 'closest') within.sort(byRank);
  if (sort === 'price-asc') within.sort(byPrice);
  if (sort === 'price-desc') within.sort((a, b) => byPrice(b, a));
  above.sort(byPrice);
  unknownPrice.sort(byRank);

  let reason: string | null = null;
  let suggestion: Suggestion | null = null;
  if (within.length === 0) {
    if (scored.length === 0 && products.length > 0) {
      reason = 'Nothing matches your current filters.';
      // Which single filter, if cleared, brings back the most in-budget options?
      let best: { key: keyof Filters; n: number } | null = null;
      for (const key of Object.keys(FILTER_NAME) as (keyof Filters)[]) {
        const n = products.filter((p) => passes(p, filters, wallCm, key)).length;
        if (n > 0 && (!best || n > best.n)) best = { key, n };
      }
      const storesN = filters.stores.length ? products.filter((p) => passes(p, filters, wallCm, 'stores')).length : 0;
      if (best && best.n >= storesN) {
        suggestion = { text: `Remove the ${FILTER_NAME[best.key]} to see ${best.n} more`, action: { type: 'clear-filter', key: best.key } };
      } else if (storesN > 0) {
        suggestion = { text: `Include all stores to see ${storesN} more`, action: { type: 'all-stores' } };
      }
    } else if (above.length > 0) {
      const cheapest = above[0].allIn!;
      reason =
        cap <= 0
          ? 'Your room budget is already used by the other pieces.'
          : `The lowest-priced match costs ${formatIls(cheapest)} including delivery, above your ${formatIls(cap)} limit.`;
      suggestion = { text: `Raise the budget to ${formatIls(Math.ceil(cheapest / 50) * 50)}`, action: { type: 'raise-budget', to: Math.ceil(cheapest / 50) * 50 } };
    } else if (unknownPrice.length > 0) {
      reason = "The only matches don't list a price, so Forma can't confirm they fit your budget.";
    } else {
      reason = 'No products in this category yet.';
    }
  }

  return {
    within,
    above,
    unknownPrice,
    total: products.length,
    filteredOut: products.length - scored.length,
    reason,
    suggestion,
  };
}

export function retailerName(id: RetailerId) {
  return RETAILERS[id].name;
}
