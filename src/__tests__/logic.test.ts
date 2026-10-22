import { describe, expect, it } from 'vitest';
import { getProduct, parseCatalogFeed, productShape } from '../catalog/catalog';
import { SAMPLE_PRODUCTS } from '../catalog/sampleCatalog';
import { generateDesign, originalSampleDesign } from '../design/generate';
import { STYLES } from '../design/styles';
import { allowance, capFor, projectedTotal, summarize } from '../logic/budget';
import { alternatives, compare, EMPTY_FILTERS, matchLine } from '../logic/matching';
import type { Design, Room, SofaShape } from '../types';

function sampleRoom(overrides: Partial<Room> = {}): Room {
  const orig = originalSampleDesign();
  return {
    id: 'room1',
    name: 'Test',
    source: { kind: 'sample', sampleId: 'living' },
    dims: { sofaWallCm: 300, roomWidthCm: 420, roomDepthCm: 380, confirmed: true },
    preferences: { style: 'japandi', changeFlooring: false, changeWalls: false, keep: [] },
    budget: { totalIls: 15000, allowances: {}, includeDecor: true },
    designs: [orig],
    activeDesignId: orig.id,
    marks: [],
    shortlist: [],
    ...overrides,
  };
}

const sofas = SAMPLE_PRODUCTS.filter((p) => p.category === 'sofa');

describe('design generation', () => {
  it('keeps architecture fixed unless the user allows changes', () => {
    const room = sampleRoom();
    for (const s of STYLES) {
      const d = generateDesign(room, s.id, 0);
      expect(d.wallColor).toBeNull();
      expect(d.floor).toBeNull();
    }
    const allowed = generateDesign(sampleRoom({ preferences: { style: 'japandi', changeFlooring: true, changeWalls: true, keep: [] } }), 'japandi', 0);
    expect(allowed.floor).not.toBeNull();
    expect(allowed.wallColor).not.toBeNull();
  });

  it('produces meaningfully different variants within a style', () => {
    const room = sampleRoom();
    for (const s of STYLES) {
      const [a, b, c] = [0, 1, 2].map((v) => generateDesign(room, s.id, v).items.sofa!.shape as SofaShape);
      const sig = (x: SofaShape) => `${x.color}|${x.arms}|${x.legs}|${x.silhouette}|${x.widthCm}`;
      expect(new Set([sig(a), sig(b), sig(c)]).size).toBe(3);
    }
  });

  it('preserves furniture the user keeps', () => {
    const room = sampleRoom({ preferences: { style: 'industrial', changeFlooring: false, changeWalls: false, keep: ['sofa'] } });
    const d = generateDesign(room, 'industrial', 1);
    expect(d.items.sofa!.source.type).toBe('kept');
    expect(d.items.sofa!.shape).toEqual(room.designs[0].items.sofa!.shape);
  });

  it('scales estimates to fit a small budget', () => {
    const room = sampleRoom({ budget: { totalIls: 5000, allowances: {}, includeDecor: true } });
    const d = generateDesign(room, 'art-deco', 0);
    expect(summarize(d, room.budget).total).toBeLessThanOrEqual(5000);
  });
});

describe('budget', () => {
  it('counts products with known delivery and assembly, estimates and kept items', () => {
    const room = sampleRoom();
    const d = generateDesign(room, 'japandi', 0);
    const tamar = getProduct('sofa-tamar')!;
    const applied: Design = { ...d, items: { ...d.items, sofa: { category: 'sofa', shape: d.items.sofa!.shape as SofaShape, source: { type: 'product', productId: tamar.id } } } };
    const s = summarize(applied, room.budget);
    const sofaLine = s.lines.find((l) => l.category === 'sofa')!;
    expect(sofaLine.total).toBe(3490 + 250 + 0);
    expect(s.estimates).toBeGreaterThan(0);
  });

  it('caps an item by what is left in the room budget', () => {
    const room = sampleRoom({ budget: { totalIls: 6000, allowances: { sofa: 9000 }, includeDecor: true } });
    const d = generateDesign(room, 'japandi', 0);
    const cap = capFor(d, room.budget, 'sofa');
    expect(cap.allowance).toBe(9000);
    expect(cap.cap).toBe(cap.roomLeft);
    expect(cap.cap).toBeLessThan(6000);
  });

  it('defaults allowances to a share of the total', () => {
    expect(allowance({ totalIls: 10000, allowances: {}, includeDecor: true }, 'sofa')).toBe(4200);
  });

  it('projects the room total for a preview without mutating the design', () => {
    const room = sampleRoom();
    const d = generateDesign(room, 'japandi', 0);
    const before = JSON.stringify(d);
    const r = projectedTotal(d, room.budget, 'sofa', getProduct('sofa-ostra')!);
    expect(r.priceKnown).toBe(true);
    expect(r.after - r.before).toBe(r.delta);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('matching', () => {
  const target = originalSampleDesign().items.sofa!.shape;

  it('never shows over-budget products in the main list', () => {
    const res = alternatives({ products: sofas, target, filters: EMPTY_FILTERS, sort: 'closest', cap: 4000, wallCm: null });
    for (const m of res.within) expect(m.allIn!).toBeLessThanOrEqual(4000);
    for (const m of res.above) expect(m.allIn!).toBeGreaterThan(4000);
    expect(res.unknownPrice.every((m) => m.product.priceIls == null)).toBe(true);
  });

  it('explains an empty result and suggests one change', () => {
    const res = alternatives({ products: sofas, target, filters: EMPTY_FILTERS, sort: 'closest', cap: 500, wallCm: null });
    expect(res.within).toHaveLength(0);
    expect(res.reason).toBeTruthy();
    expect(res.suggestion?.action.type).toBe('raise-budget');
  });

  it('suggests removing the filter that blocks results', () => {
    const res = alternatives({
      products: sofas,
      target,
      filters: { ...EMPTY_FILTERS, colors: ['blue'], materials: ['leather'] },
      sort: 'closest',
      cap: 20000,
      wallCm: null,
    });
    expect(res.within).toHaveLength(0);
    expect(res.suggestion?.action.type).toBe('clear-filter');
  });

  it('flags sofas wider than the entered wall', () => {
    const lior = getProduct('sofa-lior')!;
    const m = compare(target, lior, 250);
    expect(m.fits).toBe(false);
    expect(m.different[0]).toMatch(/wider than your 250 cm wall/);
  });

  it('does not claim shape similarity for photo targets', () => {
    for (const p of sofas) {
      const m = compare(target, p, null, true, false);
      const text = [...m.similar, ...m.different].join(' ');
      expect(text).not.toMatch(/arms|legs|back|bouclé|linen|velvet|leather|width|wider|narrower/);
    }
  });

  it('writes plain-language explanations without percentages', () => {
    for (const p of sofas) {
      const line = matchLine(compare(target, p, 300));
      expect(line).not.toMatch(/%|exact match|confidence/i);
    }
  });
});

describe('catalog', () => {
  it('refuses to render a product without dimensions', () => {
    const r = productShape(getProduct('sofa-kallby')!);
    expect(r.ok).toBe(false);
  });

  it('uses real dimensions and the chosen variant colour', () => {
    const p = getProduct('sofa-ostra')!;
    const r = productShape(p, p.variants[2].id);
    expect(r.ok && r.shape.kind === 'sofa' && r.shape.widthCm).toBe(214);
    expect(r.ok && r.shape.color).toBe(p.variants[2].colorHex);
  });

  it('labels every sample listing as unverified', () => {
    for (const p of SAMPLE_PRODUCTS) {
      expect(p.source).toBe('sample');
      expect(p.url).toBeNull();
      expect(p.checkedAt).toBeNull();
    }
  });

  it('validates feed rows', () => {
    const { products, errors } = parseCatalogFeed({
      products: [
        { id: 'a', name: 'Real sofa', category: 'sofa', retailer: 'ikea-il', url: 'https://www.ikea.co.il/x', priceIls: 2000, dims: { widthCm: 200, depthCm: 90, heightCm: 80 }, material: 'linen', colorHex: '#aabbcc', checkedAt: '2026-10-01' },
        { id: 'b', name: 'Bad', category: 'sofa', retailer: 'nowhere' },
        { id: 'c', name: 'Bad link', category: 'sofa', retailer: 'ace', url: 'javascript:alert(1)' },
      ],
    });
    expect(products).toHaveLength(1);
    expect(products[0].source).toBe('imported');
    expect(errors).toHaveLength(2);
  });
});

describe('image prompts', () => {
  it('describes the direction, protects the architecture and reads naturally', async () => {
    const { restylePrompt } = await import('../ai/prompts');
    const room = sampleRoom();
    for (const s of STYLES) {
      for (const v of [0, 1, 2]) {
        const p = restylePrompt(s.id, generateDesign(room, s.id, v), room.preferences, ['sofa']);
        expect(p).toMatch(/Keep exactly the same camera position/);
        expect(p).toMatch(/flooring/);
        expect(p).not.toMatch(/\ba [aeiou]/i);
        expect(p).not.toMatch(/plant plant/);
      }
    }
  });
});
