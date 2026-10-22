import { RETAILERS } from '../catalog/retailers';
import { STYLE_BY_ID } from '../design/styles';
import { colorName } from '../lib/color';
import type { Category, Design, ItemShape, Preferences, Product, StyleId } from '../types';

const NOUN: Record<Category, string> = { sofa: 'sofa', coffeeTable: 'coffee table', rug: 'rug', floorLamp: 'floor lamp' };

const ARMS: Record<string, string> = {
  track: 'square track arms',
  rolled: 'rolled arms',
  sloped: 'sloped arms',
  curved: 'rounded arms',
  none: 'no arms',
};
const LEGS: Record<string, string> = {
  'tapered-wood': 'tapered wooden legs',
  metal: 'slim metal legs',
  block: 'low block feet',
  hidden: 'a base that sits on the floor',
  turned: 'turned wooden legs',
};
const SIL: Record<string, string> = {
  straight: 'straight, boxy',
  curved: 'curved',
  chesterfield: 'tufted Chesterfield',
  modular: 'modular',
};
const mat = (m: string) => (m === 'boucle' ? 'bouclé' : m);
const an = (phrase: string) => (/^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`);
const PLANT: Record<string, string> = { fiddle: 'fiddle-leaf fig', snake: 'snake plant', olive: 'olive tree', palm: 'palm' };

/** Plain description of a piece, used both for style directions and product references. */
export function describe(shape: ItemShape): string {
  const c = colorName(shape.color);
  switch (shape.kind) {
    case 'sofa':
      return `${an(SIL[shape.silhouette])} ${c} ${mat(shape.material)} sofa about ${shape.widthCm} cm wide, with ${ARMS[shape.arms]}, ${LEGS[shape.legs]} and ${shape.seatCushions} seat cushion${shape.seatCushions > 1 ? 's' : ''}`;
    case 'coffeeTable':
      return `${an(shape.top === 'rect' ? 'rectangular' : shape.top)} ${c} ${mat(shape.material)} coffee table about ${shape.widthCm} cm wide`;
    case 'rug':
      return `${an(shape.shape === 'round' ? 'round' : 'rectangular')} ${c} ${mat(shape.material)} rug${shape.pattern === 'solid' ? '' : ` with a ${shape.pattern === 'medallion' ? 'traditional' : shape.pattern} pattern in ${colorName(shape.accent)}`}`;
    case 'floorLamp':
      return `a floor lamp with ${shape.shade === 'arc' ? 'an arched stem and dome shade' : an(`${c} ${shape.shade} shade`)}`;
  }
}

function warmthWords(w: number) {
  return w > 0.7 ? 'warm, golden' : w > 0.45 ? 'soft, neutral-warm' : 'cool, bright daylight';
}

/**
 * Prompt for a whole-room style direction on the user's photo. Uses the parametric direction
 * (from generateDesign) so A/B/C get concretely different furniture and palettes.
 */
export function restylePrompt(style: StyleId, design: Design, prefs: Preferences, marked: Category[]): string {
  const s = STYLE_BY_ID[style];
  const furniture: string[] = [];
  for (const c of ['sofa', 'coffeeTable', 'rug', 'floorLamp'] as Category[]) {
    const it = design.items[c];
    if (!it) continue;
    if (prefs.keep.includes(c)) furniture.push(`keep the existing ${NOUN[c]} exactly as it is`);
    else if (it.source.type === 'generated') furniture.push(describe(it.shape));
  }
  const d = design.decor;
  const decor = d
    ? [
        d.armchair ? `${an(colorName(d.armchair.color))} ${d.armchair.style} armchair` : '',
        d.plant !== 'none' ? `a potted ${PLANT[d.plant]}` : '',
        d.wallArt !== 'none' ? `${d.wallArt} wall art in ${colorName(d.artColors[0])} and ${colorName(d.artColors[1])}` : '',
        d.curtains ? `${colorName(d.curtains)} curtains` : '',
        d.cushions.length ? `cushions in ${[...new Set(d.cushions.map(colorName))].join(', ')}` : '',
      ].filter(Boolean)
    : [];
  const fixed = ['camera position and angle', 'walls', 'windows', 'doors', 'ceiling height', 'room proportions'];
  if (!prefs.changeFlooring) fixed.push('flooring');
  if (!prefs.changeWalls) fixed.push('wall colour');
  const inspo = design.inspiration
    ? ` Lean the palette towards these colours: ${design.inspiration.colors.map(colorName).join(', ')}.`
    : '';
  return [
    `Redesign the interior of the room in this photo in ${s.name} style (${s.blurb.toLowerCase().replace(/\.$/, '')}).`,
    `Keep exactly the same ${fixed.join(', ')}. Do not add, move or remove windows or doors.`,
    furniture.length ? `Furnish it with ${furniture.join('; ')}.` : '',
    decor.length ? `Decor: ${decor.join(', ')}.` : '',
    `Lighting: ${warmthWords(design.lighting.warmth)}.${inspo}`,
    marked.length ? `Place the ${marked.map((c) => NOUN[c]).join(' and ')} where the existing ones are.` : '',
    'Photorealistic interior photograph, natural materials, realistic scale, no text, no people.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Prompt for replacing one piece in a crop of the room with a specific product. */
export function replacePrompt(category: Category, product: Product, shape: ItemShape, referenceIsPhoto: boolean): string {
  const n = NOUN[category];
  const dims = product.dims ? ` It measures ${product.dims.widthCm} cm wide, ${product.dims.depthCm} cm deep and ${product.dims.heightCm} cm high.` : '';
  return [
    `The first image shows part of a room. The second image is a ${referenceIsPhoto ? 'product photo' : 'reference drawing'} of the ${n} "${product.name}" from ${RETAILERS[product.retailer].name}: ${describe(shape)}.${dims}`,
    `Replace the ${n} in the first image with this ${n}. Match its colour, material, silhouette, arms, legs and proportions as closely as possible.`,
    `Place it in the same spot, at a realistic size for the room, in the same perspective and lighting.`,
    `Keep the walls, floor, windows, other furniture and everything else in the first image unchanged.`,
    referenceIsPhoto ? '' : 'Render it as a real photographed object, not a drawing.',
    'Photorealistic, no text.',
  ]
    .filter(Boolean)
    .join(' ');
}
