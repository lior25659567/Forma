import { mix } from '../lib/color';
import { uid } from '../lib/id';
import type {
  Category,
  Decor,
  Design,
  ItemSource,
  LampShape,
  PlacedItem,
  Room,
  RugShape,
  SofaShape,
  StyleId,
  TableShape,
} from '../types';
import { STYLE_BY_ID } from './styles';

// ---- Sample room ----

export const SAMPLE_ROOM = {
  wallColor: '#e7e2d8',
  floor: { type: 'oak', color: '#c39f73' } as const,
  dims: { sofaWallCm: 300, roomWidthCm: 420, roomDepthCm: 380 },
};

export function originalSampleDesign(): Design {
  const sofa: SofaShape = {
    kind: 'sofa',
    widthCm: 200,
    depthCm: 90,
    heightCm: 88,
    arms: 'rolled',
    legs: 'block',
    silhouette: 'straight',
    seatCushions: 2,
    color: '#8f8a83',
    material: 'cotton',
    legColor: '#4a3b30',
  };
  const coffeeTable: TableShape = {
    kind: 'coffeeTable',
    widthCm: 100,
    depthCm: 55,
    heightCm: 45,
    top: 'rect',
    base: 'four-legs',
    color: '#6b4a33',
    material: 'wood',
    legColor: '#5a3d2a',
  };
  const rug: RugShape = {
    kind: 'rug',
    widthCm: 200,
    depthCm: 140,
    pattern: 'border',
    shape: 'rect',
    color: '#b9ae9e',
    accent: '#8f8a83',
    material: 'wool',
  };
  const floorLamp: LampShape = {
    kind: 'floorLamp',
    heightCm: 150,
    shade: 'drum',
    color: '#efe7d6',
    baseColor: '#3a3a3a',
    material: 'linen',
  };
  const original: ItemSource = { type: 'original' };
  return {
    id: uid('d'),
    name: 'Original room',
    style: 'original',
    variant: 0,
    createdAt: new Date().toISOString(),
    items: {
      sofa: { category: 'sofa', shape: sofa, source: original },
      coffeeTable: { category: 'coffeeTable', shape: coffeeTable, source: original },
      rug: { category: 'rug', shape: rug, source: original },
      floorLamp: { category: 'floorLamp', shape: floorLamp, source: original },
    },
    decor: {
      wallArt: 'none',
      artColors: ['#8f8a83', '#c8c0b2'],
      plant: 'none',
      planter: '#c8c0b2',
      curtains: '#e3ddd1',
      armchair: null,
      pendant: 'none',
      cushions: ['#c8c0b2'],
      throwColor: null,
      decorEstimateIls: 0,
    },
    lighting: { warmth: 0.45, brightness: 0.75 },
    wallColor: null,
    floor: null,
  };
}

export function originalPhotoDesign(): Design {
  return {
    id: uid('d'),
    name: 'Original photo',
    style: 'original',
    variant: 0,
    createdAt: new Date().toISOString(),
    items: {},
    decor: null,
    lighting: { warmth: 0.5, brightness: 0.75 },
    wallColor: null,
    floor: null,
  };
}

// ---- Seeded randomness so a style + variant always produces the same direction ----

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface GenerateOptions {
  inspirationColors?: string[];
  inspirationStrength?: number; // 0..1
}

/**
 * Builds a design direction for the sample room. Each variant index walks the style's
 * option lists with different offsets, so A/B/C differ in silhouette, palette and decor —
 * not just in one colour. Walls, windows, door, perspective and (unless allowed) floor stay fixed.
 */
export function generateDesign(room: Room, style: StyleId, variant: number, opts: GenerateOptions = {}): Design {
  const s = STYLE_BY_ID[style];
  const r = rng(hash(`${style}:${variant}:${room.id}`));
  const at = <T,>(arr: T[], offset = 0): T => arr[(variant + offset) % arr.length];
  const any = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)];

  const inspo = opts.inspirationColors ?? [];
  const k = inspo.length ? Math.max(0, Math.min(1, opts.inspirationStrength ?? 0)) : 0;
  const tint = (c: string, i: number) => (k > 0 ? mix(c, inspo[(i + variant) % inspo.length], k * 0.85) : c);

  const sofa: SofaShape = {
    kind: 'sofa',
    widthCm: at(s.sofa.widths),
    depthCm: 92 + Math.round(r() * 8),
    heightCm: at(s.sofa.heights),
    arms: at(s.sofa.arms),
    legs: at(s.sofa.legs),
    silhouette: at(s.sofa.silhouettes),
    seatCushions: ([1, 2, 3] as const)[(variant + (style.length % 3)) % 3],
    color: tint(at(s.sofa.colors), 0),
    material: at(s.sofa.materials),
    legColor: any(s.sofa.legColors),
  };
  if (sofa.silhouette === 'chesterfield') sofa.arms = 'rolled';
  if (sofa.silhouette === 'curved' && sofa.arms === 'track') sofa.arms = 'curved';

  const coffeeTable: TableShape = {
    kind: 'coffeeTable',
    widthCm: at([110, 90, 120], 1),
    depthCm: 60,
    heightCm: at([40, 42, 36], 2),
    top: at(s.table.tops, 1),
    base: at(s.table.bases, 1),
    color: at(s.table.colors, 1),
    material: at(s.table.materials, 1),
    legColor: any(s.table.legColors),
  };
  if (coffeeTable.top !== 'rect') coffeeTable.depthCm = coffeeTable.top === 'round' ? coffeeTable.widthCm * 0.8 : 65;

  const rug: RugShape = {
    kind: 'rug',
    widthCm: at([240, 200, 300], 2),
    depthCm: 170,
    pattern: at(s.rug.patterns, 2),
    shape: at(s.rug.shapes, 1),
    color: tint(at(s.rug.colors), 2),
    accent: tint(at(s.rug.accents, 1), 1),
    material: at(s.rug.materials, 1),
  };
  if (rug.shape === 'round') rug.depthCm = rug.widthCm;

  const floorLamp: LampShape = {
    kind: 'floorLamp',
    heightCm: at([155, 170, 145], 1),
    shade: at(s.lamp.shades),
    color: at(s.lamp.colors, 1),
    baseColor: any(s.lamp.baseColors),
    material: at(s.lamp.materials),
  };

  const d = s.decor;
  const decor: Decor = {
    wallArt: at(d.art, 1),
    artColors: [tint(at(d.artColors), 3), tint(at(d.artColors, 1), 4)],
    plant: at(d.plants),
    planter: any(d.planters),
    curtains: at(d.curtains),
    armchair: { style: at(d.armchairStyles, 1), color: tint(at(d.armchairColors, 1), 1) },
    pendant: at(d.pendants),
    cushions: d.cushions.slice(0, 2 + (variant % 2)).map((c, i) => tint(c, i + 1)),
    throwColor: at(d.throws),
    decorEstimateIls: s.estimates.decor,
  };

  // Keep anything the user chose to keep from the original room.
  const original = room.designs.find((x) => x.style === 'original');
  const items: Design['items'] = {
    sofa: { category: 'sofa', shape: sofa, source: { type: 'generated', estimateIls: 0 } },
    coffeeTable: { category: 'coffeeTable', shape: coffeeTable, source: { type: 'generated', estimateIls: 0 } },
    rug: { category: 'rug', shape: rug, source: { type: 'generated', estimateIls: 0 } },
    floorLamp: { category: 'floorLamp', shape: floorLamp, source: { type: 'generated', estimateIls: 0 } },
  };
  for (const c of room.preferences.keep) {
    const orig = original?.items[c];
    if (orig) (items as Record<Category, PlacedItem>)[c] = { ...orig, source: { type: 'kept' } } as PlacedItem;
  }

  // Estimates for the pieces this direction proposes, scaled so the direction fits the budget.
  const est: Record<Category, number> = {
    sofa: s.estimates.sofa * (sofa.widthCm / 220),
    coffeeTable: s.estimates.coffeeTable,
    rug: s.estimates.rug * (rug.widthCm / 240),
    floorLamp: s.estimates.floorLamp,
  };
  const genCats = (Object.keys(items) as Category[]).filter((c) => items[c]?.source.type === 'generated');
  const decorCost = room.budget.includeDecor ? decor.decorEstimateIls : 0;
  const sum = genCats.reduce((a, c) => a + est[c], 0) + decorCost;
  const scale = sum > room.budget.totalIls * 0.95 ? (room.budget.totalIls * 0.95) / sum : 1;
  for (const c of genCats) {
    const it = items[c]!;
    it.source = { type: 'generated', estimateIls: roundTo(est[c] * scale, 50) };
  }
  decor.decorEstimateIls = roundTo(decor.decorEstimateIls * scale, 50);

  const changeWalls = room.preferences.changeWalls;
  const changeFloor = room.preferences.changeFlooring;

  return {
    id: uid('d'),
    name: `${s.name} · ${VARIANT_LETTERS[variant % VARIANT_LETTERS.length]}`,
    style,
    variant,
    createdAt: new Date().toISOString(),
    items,
    decor,
    lighting: { warmth: s.lighting.warmth, brightness: s.lighting.brightness },
    wallColor: changeWalls ? at(s.walls) : null,
    floor: changeFloor ? at(s.floors) : null,
    inspiration: k > 0 ? { strength: k, colors: inspo } : undefined,
  };
}
