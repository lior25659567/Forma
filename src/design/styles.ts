import type { Decor, FloorFinish, LampShape, Material, RugShape, SofaShape, StyleId, TableShape } from '../types';

export interface StyleDef {
  id: StyleId;
  name: string;
  blurb: string;
  swatch: string[];
  sofa: {
    colors: string[];
    materials: Material[];
    arms: SofaShape['arms'][];
    legs: SofaShape['legs'][];
    silhouettes: SofaShape['silhouette'][];
    legColors: string[];
    widths: number[];
    heights: number[];
  };
  table: {
    tops: TableShape['top'][];
    bases: TableShape['base'][];
    colors: string[];
    materials: Material[];
    legColors: string[];
  };
  rug: {
    patterns: RugShape['pattern'][];
    colors: string[];
    accents: string[];
    materials: Material[];
    shapes: RugShape['shape'][];
  };
  lamp: { shades: LampShape['shade'][]; colors: string[]; baseColors: string[]; materials: Material[] };
  decor: {
    art: Decor['wallArt'][];
    artColors: string[];
    plants: Decor['plant'][];
    planters: string[];
    curtains: (string | null)[];
    armchairStyles: NonNullable<Decor['armchair']>['style'][];
    armchairColors: string[];
    pendants: Decor['pendant'][];
    cushions: string[];
    throws: (string | null)[];
  };
  lighting: { warmth: number; brightness: number };
  walls: string[];
  floors: FloorFinish[];
  /** Rough ILS estimates for generated (not yet chosen) pieces. Labelled as estimates in the UI. */
  estimates: { sofa: number; coffeeTable: number; rug: number; floorLamp: number; decor: number };
}

const oak: FloorFinish = { type: 'oak', color: '#c9a77c' };
const whitewash: FloorFinish = { type: 'whitewash', color: '#ddd2c0' };
const walnut: FloorFinish = { type: 'walnut', color: '#7a5639' };
const concrete: FloorFinish = { type: 'concrete', color: '#a7a39c' };
const terracotta: FloorFinish = { type: 'terracotta', color: '#b9714f' };

export const STYLES: StyleDef[] = [
  {
    id: 'warm-minimal',
    name: 'Warm minimal',
    blurb: 'Soft neutrals, rounded forms, very little clutter.',
    swatch: ['#e8dfd0', '#c9b293', '#9a8064', '#4b3f35'],
    sofa: {
      colors: ['#ddd0bb', '#c8b497', '#e9e2d4', '#a89379'],
      materials: ['boucle', 'linen', 'chenille'],
      arms: ['curved', 'track', 'sloped'],
      legs: ['hidden', 'block', 'tapered-wood'],
      silhouettes: ['curved', 'straight', 'modular'],
      legColors: ['#b08a63', '#d8c7ad'],
      widths: [228, 210, 240],
      heights: [74, 80, 72],
    },
    table: { tops: ['round', 'oval', 'rect'], bases: ['pedestal', 'block', 'four-legs'], colors: ['#d9c4a5', '#efe9df', '#b89a78'], materials: ['stone', 'wood'], legColors: ['#b89a78'] },
    rug: { patterns: ['solid', 'border'], colors: ['#ebe3d6', '#d8cab4'], accents: ['#c9b293', '#bda88c'], materials: ['wool', 'jute'], shapes: ['rect', 'round'] },
    lamp: { shades: ['paper', 'globe', 'drum'], colors: ['#f3ece0', '#ece2d0'], baseColors: ['#a68462', '#3b342f'], materials: ['paper', 'linen'] },
    decor: {
      art: ['abstract', 'arch'],
      artColors: ['#c9b293', '#8e7358', '#e6dccb'],
      plants: ['olive', 'fiddle'],
      planters: ['#d7cab6', '#8a7663'],
      curtains: ['#efe8dc', null],
      armchairStyles: ['lounge'],
      armchairColors: ['#cbb699', '#e5dccd'],
      pendants: ['none', 'globe'],
      cushions: ['#bfa788', '#efe6d8', '#8f775d'],
      throws: ['#d7c4a8', null],
    },
    lighting: { warmth: 0.6, brightness: 0.75 },
    walls: ['#ece6dc', '#e8ded0'],
    floors: [oak, whitewash],
    estimates: { sofa: 5200, coffeeTable: 1400, rug: 1300, floorLamp: 650, decor: 1400 },
  },
  {
    id: 'japandi',
    name: 'Japandi',
    blurb: 'Low, calm and natural — light wood, linen, muted earth tones.',
    swatch: ['#e3dccf', '#b5a58d', '#6f6a5e', '#2f2c28'],
    sofa: {
      colors: ['#cfc4b1', '#8e8676', '#b9a98f', '#5d5b52'],
      materials: ['linen', 'cotton', 'boucle'],
      arms: ['track', 'none', 'sloped'],
      legs: ['tapered-wood', 'block', 'hidden'],
      silhouettes: ['straight', 'modular', 'straight'],
      legColors: ['#c29e74', '#5a4636'],
      widths: [214, 200, 230],
      heights: [70, 66, 72],
    },
    table: { tops: ['rect', 'round', 'oval'], bases: ['block', 'four-legs', 'sled'], colors: ['#c8a47a', '#4a3a2e', '#e2d6c2'], materials: ['wood'], legColors: ['#c8a47a', '#3a2e25'] },
    rug: { patterns: ['solid', 'border', 'stripe'], colors: ['#d9cfbd', '#b8ab95'], accents: ['#6f6a5e', '#8e8676'], materials: ['wool', 'jute'], shapes: ['rect'] },
    lamp: { shades: ['paper', 'cone', 'globe'], colors: ['#f1ead9', '#e6dccb'], baseColors: ['#2f2c28', '#c29e74'], materials: ['paper', 'wood'] },
    decor: {
      art: ['abstract', 'grid', 'none'],
      artColors: ['#2f2c28', '#b5a58d', '#e3dccf'],
      plants: ['snake', 'olive'],
      planters: ['#3a3631', '#cdbfa8'],
      curtains: ['#e7dfd0', null],
      armchairStyles: ['lounge', 'sling'],
      armchairColors: ['#8e8676', '#cfc4b1'],
      pendants: ['rattan', 'globe', 'none'],
      cushions: ['#6f6a5e', '#d9cfbd', '#2f2c28'],
      throws: ['#8e8676', null],
    },
    lighting: { warmth: 0.55, brightness: 0.7 },
    walls: ['#e7e1d6', '#dcd5c8'],
    floors: [oak, whitewash],
    estimates: { sofa: 4600, coffeeTable: 1200, rug: 1100, floorLamp: 600, decor: 1200 },
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    blurb: 'Bright and practical — pale wood, soft greys, simple shapes.',
    swatch: ['#f3f3f0', '#cfd3d4', '#9fb3bf', '#c8a982'],
    sofa: {
      colors: ['#b8bcbd', '#d9d6cf', '#8d9ca6', '#6b7275'],
      materials: ['cotton', 'linen', 'chenille'],
      arms: ['track', 'sloped', 'track'],
      legs: ['tapered-wood', 'tapered-wood', 'metal'],
      silhouettes: ['straight', 'straight', 'modular'],
      legColors: ['#d4b48c', '#c8a982'],
      widths: [210, 225, 240],
      heights: [80, 84, 78],
    },
    table: { tops: ['oval', 'round', 'rect'], bases: ['four-legs', 'four-legs', 'pedestal'], colors: ['#ffffff', '#d7b893', '#e9e4dc'], materials: ['wood'], legColors: ['#d7b893'] },
    rug: { patterns: ['geometric', 'stripe', 'solid'], colors: ['#eeeeea', '#d8dad8'], accents: ['#6b7275', '#9fb3bf'], materials: ['wool', 'cotton'], shapes: ['rect', 'round'] },
    lamp: { shades: ['drum', 'cone', 'globe'], colors: ['#ffffff', '#e8e6e0'], baseColors: ['#d7b893', '#ffffff'], materials: ['linen', 'metal'] },
    decor: {
      art: ['botanical', 'grid', 'abstract'],
      artColors: ['#9fb3bf', '#c8a982', '#2f3b40'],
      plants: ['fiddle', 'snake'],
      planters: ['#ffffff', '#d8d3c8'],
      curtains: ['#f5f5f2', '#dfe4e6'],
      armchairStyles: ['lounge', 'wingback'],
      armchairColors: ['#9fb3bf', '#e2ddd3'],
      pendants: ['dome', 'globe'],
      cushions: ['#9fb3bf', '#f0eee8', '#c8a982'],
      throws: ['#e2ddd3', null],
    },
    lighting: { warmth: 0.35, brightness: 0.9 },
    walls: ['#f4f3ef', '#eceeec'],
    floors: [whitewash, oak],
    estimates: { sofa: 4200, coffeeTable: 900, rug: 1000, floorLamp: 450, decor: 1000 },
  },
  {
    id: 'industrial',
    name: 'Industrial',
    blurb: 'Leather, black metal, raw textures and darker contrast.',
    swatch: ['#a7a39c', '#6b4a33', '#3a3a3a', '#1e1e1e'],
    sofa: {
      colors: ['#7c4a2a', '#3d3d3f', '#5b3a26', '#7a7a76'],
      materials: ['leather', 'leather', 'cotton'],
      arms: ['rolled', 'track', 'track'],
      legs: ['metal', 'block', 'metal'],
      silhouettes: ['chesterfield', 'straight', 'modular'],
      legColors: ['#1e1e1e', '#2b2b2b'],
      widths: [220, 236, 250],
      heights: [78, 82, 76],
    },
    table: { tops: ['rect', 'rect', 'round'], bases: ['sled', 'four-legs', 'pedestal'], colors: ['#5a3d29', '#7a7a76', '#3a2a1f'], materials: ['wood', 'metal', 'stone'], legColors: ['#1e1e1e'] },
    rug: { patterns: ['medallion', 'solid', 'geometric'], colors: ['#5b4a41', '#8a8580', '#3d3a38'], accents: ['#a56b46', '#c8c2b8'], materials: ['wool'], shapes: ['rect'] },
    lamp: { shades: ['cone', 'arc', 'globe'], colors: ['#1e1e1e', '#b38a4a'], baseColors: ['#1e1e1e'], materials: ['metal'] },
    decor: {
      art: ['grid', 'abstract'],
      artColors: ['#1e1e1e', '#a56b46', '#d8d2c8'],
      plants: ['snake', 'fiddle'],
      planters: ['#3a3a3a', '#8a8580'],
      curtains: [null, '#5a5650'],
      armchairStyles: ['sling', 'lounge'],
      armchairColors: ['#8e4f26', '#3d3d3f'],
      pendants: ['dome', 'linear'],
      cushions: ['#a56b46', '#3d3d3f', '#c8c2b8'],
      throws: ['#5a5650', null],
    },
    lighting: { warmth: 0.7, brightness: 0.55 },
    walls: ['#b8b2a9', '#8f8b85'],
    floors: [concrete, walnut],
    estimates: { sofa: 6200, coffeeTable: 1500, rug: 1400, floorLamp: 800, decor: 1300 },
  },
  {
    id: 'retro',
    name: 'Retro',
    blurb: 'Seventies warmth — rounded shapes, mustard, rust and bold pattern.',
    swatch: ['#e9d3a5', '#c9a03a', '#b8613f', '#5d4a2f'],
    sofa: {
      colors: ['#c9a03a', '#b8613f', '#7b7a46', '#8e4f26'],
      materials: ['velvet', 'chenille', 'velvet'],
      arms: ['curved', 'rolled', 'sloped'],
      legs: ['hidden', 'tapered-wood', 'block'],
      silhouettes: ['curved', 'straight', 'modular'],
      legColors: ['#6b4a33'],
      widths: [215, 230, 245],
      heights: [76, 70, 74],
    },
    table: { tops: ['round', 'oval', 'round'], bases: ['pedestal', 'pedestal', 'four-legs'], colors: ['#f0e6cf', '#c9a03a', '#6b4a33'], materials: ['wood', 'glass'], legColors: ['#6b4a33', '#c9a03a'] },
    rug: { patterns: ['geometric', 'stripe', 'medallion'], colors: ['#e9d3a5', '#d9b77a'], accents: ['#b8613f', '#7b7a46'], materials: ['wool'], shapes: ['round', 'rect'] },
    lamp: { shades: ['globe', 'arc', 'drum'], colors: ['#f2e3c0', '#c9a03a'], baseColors: ['#c9a03a', '#6b4a33'], materials: ['glass', 'metal'] },
    decor: {
      art: ['sunburst', 'abstract'],
      artColors: ['#b8613f', '#c9a03a', '#7b7a46'],
      plants: ['palm', 'fiddle'],
      planters: ['#b8613f', '#e9d3a5'],
      curtains: ['#d9b77a', '#e9d3a5'],
      armchairStyles: ['lounge', 'wingback'],
      armchairColors: ['#7b7a46', '#b8613f'],
      pendants: ['globe', 'dome'],
      cushions: ['#b8613f', '#e9d3a5', '#7b7a46'],
      throws: ['#c9a03a', null],
    },
    lighting: { warmth: 0.85, brightness: 0.7 },
    walls: ['#efe2c8', '#e6d3b3'],
    floors: [walnut, terracotta],
    estimates: { sofa: 4800, coffeeTable: 1100, rug: 1200, floorLamp: 700, decor: 1300 },
  },
  {
    id: 'midcentury',
    name: 'Midcentury modern',
    blurb: 'Tapered legs, walnut and clean lines with a few saturated accents.',
    swatch: ['#e7dccb', '#7a5639', '#2f6f73', '#c9a03a'],
    sofa: {
      colors: ['#2f6f73', '#8e4f26', '#7b7a46', '#4c5a66'],
      materials: ['cotton', 'leather', 'velvet'],
      arms: ['track', 'sloped', 'track'],
      legs: ['tapered-wood', 'tapered-wood', 'metal'],
      silhouettes: ['straight', 'straight', 'modular'],
      legColors: ['#5c3e27', '#7a5639'],
      widths: [205, 220, 236],
      heights: [80, 84, 78],
    },
    table: { tops: ['oval', 'rect', 'round'], bases: ['four-legs', 'four-legs', 'pedestal'], colors: ['#7a5639', '#5c3e27'], materials: ['wood'], legColors: ['#5c3e27'] },
    rug: { patterns: ['geometric', 'solid', 'border'], colors: ['#e7dccb', '#c9b89b'], accents: ['#2f6f73', '#c9a03a'], materials: ['wool'], shapes: ['rect'] },
    lamp: { shades: ['cone', 'arc', 'drum'], colors: ['#f0e6d2', '#2f6f73'], baseColors: ['#5c3e27', '#c9a03a'], materials: ['metal', 'linen'] },
    decor: {
      art: ['abstract', 'sunburst', 'grid'],
      artColors: ['#2f6f73', '#c9a03a', '#b8613f'],
      plants: ['fiddle', 'snake'],
      planters: ['#5c3e27', '#e7dccb'],
      curtains: ['#e7dccb', null],
      armchairStyles: ['lounge'],
      armchairColors: ['#8e4f26', '#c9a03a'],
      pendants: ['dome', 'globe'],
      cushions: ['#c9a03a', '#e7dccb', '#b8613f'],
      throws: ['#e7dccb', null],
    },
    lighting: { warmth: 0.65, brightness: 0.75 },
    walls: ['#ece5d8', '#e2e0d6'],
    floors: [walnut, oak],
    estimates: { sofa: 5400, coffeeTable: 1300, rug: 1200, floorLamp: 750, decor: 1300 },
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    blurb: 'Crisp and current — low profiles, greys, black accents.',
    swatch: ['#efefed', '#bcbcba', '#5f6164', '#1f1f20'],
    sofa: {
      colors: ['#8e8d8a', '#46474a', '#bdbcb8', '#5d7287'],
      materials: ['chenille', 'velvet', 'linen'],
      arms: ['track', 'none', 'curved'],
      legs: ['metal', 'hidden', 'block'],
      silhouettes: ['modular', 'straight', 'curved'],
      legColors: ['#1f1f20', '#8e8d8a'],
      widths: [240, 225, 260],
      heights: [72, 70, 76],
    },
    table: { tops: ['rect', 'round', 'oval'], bases: ['block', 'pedestal', 'sled'], colors: ['#1f1f20', '#e8e6e2', '#9a9894'], materials: ['stone', 'glass', 'metal'], legColors: ['#1f1f20'] },
    rug: { patterns: ['solid', 'geometric', 'border'], colors: ['#c9c7c3', '#8e8d8a'], accents: ['#46474a', '#efefed'], materials: ['wool'], shapes: ['rect'] },
    lamp: { shades: ['arc', 'globe', 'drum'], colors: ['#efefed', '#1f1f20'], baseColors: ['#1f1f20', '#9a9894'], materials: ['metal'] },
    decor: {
      art: ['abstract', 'grid'],
      artColors: ['#1f1f20', '#8e8d8a', '#5d7287'],
      plants: ['snake', 'olive'],
      planters: ['#1f1f20', '#efefed'],
      curtains: ['#e1e0dd', null],
      armchairStyles: ['lounge', 'sling'],
      armchairColors: ['#46474a', '#bdbcb8'],
      pendants: ['linear', 'globe'],
      cushions: ['#5d7287', '#efefed', '#1f1f20'],
      throws: ['#bdbcb8', null],
    },
    lighting: { warmth: 0.35, brightness: 0.85 },
    walls: ['#eeeeec', '#e3e4e3'],
    floors: [concrete, oak],
    estimates: { sofa: 5800, coffeeTable: 1500, rug: 1300, floorLamp: 800, decor: 1300 },
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    blurb: 'Sun-washed plaster, terracotta, olive wood and linen.',
    swatch: ['#f1e8d8', '#d7b98f', '#b8613f', '#7b7a46'],
    sofa: {
      colors: ['#e6dac0', '#d1b48a', '#9caa8c', '#c98e6a'],
      materials: ['linen', 'cotton', 'boucle'],
      arms: ['rolled', 'curved', 'track'],
      legs: ['turned', 'hidden', 'block'],
      silhouettes: ['straight', 'curved', 'straight'],
      legColors: ['#7a5639', '#a5835f'],
      widths: [218, 232, 205],
      heights: [82, 76, 80],
    },
    table: { tops: ['round', 'rect', 'oval'], bases: ['pedestal', 'four-legs', 'block'], colors: ['#a5835f', '#e8dcc6', '#b8613f'], materials: ['wood', 'stone'], legColors: ['#7a5639'] },
    rug: { patterns: ['medallion', 'border', 'stripe'], colors: ['#e8d8bc', '#d7b98f'], accents: ['#b8613f', '#5d7287'], materials: ['jute', 'wool'], shapes: ['rect', 'round'] },
    lamp: { shades: ['drum', 'cone', 'paper'], colors: ['#f1e8d8', '#e8d8bc'], baseColors: ['#b8613f', '#7a5639'], materials: ['linen', 'stone'] },
    decor: {
      art: ['arch', 'botanical'],
      artColors: ['#5d7287', '#b8613f', '#d7b98f'],
      plants: ['olive', 'palm'],
      planters: ['#b8613f', '#e8dcc6'],
      curtains: ['#f3ece0', '#e8d8bc'],
      armchairStyles: ['rattan', 'lounge'],
      armchairColors: ['#c9a272', '#9caa8c'],
      pendants: ['rattan', 'dome'],
      cushions: ['#5d7287', '#b8613f', '#f1e8d8'],
      throws: ['#9caa8c', null],
    },
    lighting: { warmth: 0.75, brightness: 0.85 },
    walls: ['#f1e8d8', '#ead9bf'],
    floors: [terracotta, whitewash],
    estimates: { sofa: 4900, coffeeTable: 1300, rug: 1100, floorLamp: 650, decor: 1400 },
  },
  {
    id: 'coastal',
    name: 'Coastal',
    blurb: 'Airy whites, washed blues, rattan and natural fibres.',
    swatch: ['#f6f4ee', '#c8d6de', '#5d7287', '#d9c39f'],
    sofa: {
      colors: ['#eeeae1', '#c8d6de', '#9cb9cf', '#d6c7ab'],
      materials: ['linen', 'cotton', 'linen'],
      arms: ['rolled', 'track', 'sloped'],
      legs: ['turned', 'tapered-wood', 'hidden'],
      silhouettes: ['straight', 'modular', 'straight'],
      legColors: ['#d9c39f', '#ffffff'],
      widths: [220, 236, 210],
      heights: [84, 80, 82],
    },
    table: { tops: ['round', 'rect', 'oval'], bases: ['pedestal', 'four-legs', 'block'], colors: ['#d9c39f', '#ffffff', '#c3a57a'], materials: ['rattan', 'wood'], legColors: ['#d9c39f'] },
    rug: { patterns: ['stripe', 'solid', 'border'], colors: ['#e7dcc6', '#f2efe7'], accents: ['#5d7287', '#9cb9cf'], materials: ['jute', 'cotton'], shapes: ['rect', 'round'] },
    lamp: { shades: ['drum', 'globe', 'cone'], colors: ['#ffffff', '#efe8da'], baseColors: ['#d9c39f', '#9cb9cf'], materials: ['linen', 'rattan'] },
    decor: {
      art: ['botanical', 'abstract'],
      artColors: ['#5d7287', '#9cb9cf', '#d9c39f'],
      plants: ['palm', 'olive'],
      planters: ['#d9c39f', '#ffffff'],
      curtains: ['#f8f7f2', '#e2eaee'],
      armchairStyles: ['rattan', 'lounge'],
      armchairColors: ['#d9c39f', '#c8d6de'],
      pendants: ['rattan', 'globe'],
      cushions: ['#5d7287', '#9cb9cf', '#f2efe7'],
      throws: ['#c8d6de', null],
    },
    lighting: { warmth: 0.3, brightness: 0.95 },
    walls: ['#f6f4ee', '#edf1f2'],
    floors: [whitewash, oak],
    estimates: { sofa: 4700, coffeeTable: 1100, rug: 1000, floorLamp: 550, decor: 1200 },
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    blurb: 'Layered pattern, plants, rattan and saturated earth tones.',
    swatch: ['#e9d3a5', '#b8613f', '#355343', '#5e3550'],
    sofa: {
      colors: ['#355343', '#b8613f', '#5e3550', '#c9a03a'],
      materials: ['velvet', 'cotton', 'chenille'],
      arms: ['rolled', 'curved', 'sloped'],
      legs: ['turned', 'hidden', 'tapered-wood'],
      silhouettes: ['straight', 'curved', 'modular'],
      legColors: ['#6b4a33'],
      widths: [215, 232, 245],
      heights: [80, 74, 72],
    },
    table: { tops: ['round', 'oval', 'round'], bases: ['pedestal', 'four-legs', 'block'], colors: ['#8e5a35', '#c3a57a', '#6b4a33'], materials: ['wood', 'rattan'], legColors: ['#6b4a33'] },
    rug: { patterns: ['medallion', 'geometric', 'border'], colors: ['#b8613f', '#9c4426', '#c9a03a'], accents: ['#26344f', '#e9d3a5'], materials: ['wool'], shapes: ['rect', 'round'] },
    lamp: { shades: ['paper', 'cone', 'drum'], colors: ['#e9d3a5', '#c3a57a'], baseColors: ['#6b4a33'], materials: ['rattan', 'paper'] },
    decor: {
      art: ['botanical', 'sunburst', 'arch'],
      artColors: ['#355343', '#b8613f', '#c9a03a'],
      plants: ['palm', 'fiddle'],
      planters: ['#c3a57a', '#b8613f'],
      curtains: ['#e9d3a5', '#c98e6a'],
      armchairStyles: ['rattan', 'wingback'],
      armchairColors: ['#c3a57a', '#5e3550'],
      pendants: ['rattan', 'dome'],
      cushions: ['#c9a03a', '#b8613f', '#26344f', '#e9d3a5'],
      throws: ['#9c4426', '#e9d3a5'],
    },
    lighting: { warmth: 0.85, brightness: 0.65 },
    walls: ['#eadcc4', '#e5d2b6'],
    floors: [terracotta, walnut],
    estimates: { sofa: 4400, coffeeTable: 1000, rug: 1500, floorLamp: 600, decor: 1600 },
  },
  {
    id: 'art-deco',
    name: 'Art Deco',
    blurb: 'Velvet, brass, curves and deep jewel tones.',
    swatch: ['#1f6b55', '#26344f', '#c9a03a', '#1f1f20'],
    sofa: {
      colors: ['#1f6b55', '#26344f', '#5e3550', '#d9a8a0'],
      materials: ['velvet', 'velvet', 'velvet'],
      arms: ['curved', 'rolled', 'track'],
      legs: ['metal', 'hidden', 'block'],
      silhouettes: ['curved', 'chesterfield', 'straight'],
      legColors: ['#c9a03a', '#b38a4a'],
      widths: [225, 220, 240],
      heights: [80, 82, 78],
    },
    table: { tops: ['round', 'oval', 'rect'], bases: ['pedestal', 'four-legs', 'block'], colors: ['#ece6dc', '#1f1f20', '#c9a03a'], materials: ['stone', 'glass', 'metal'], legColors: ['#c9a03a'] },
    rug: { patterns: ['geometric', 'border', 'medallion'], colors: ['#1f1f20', '#ece6dc', '#26344f'], accents: ['#c9a03a', '#1f6b55'], materials: ['wool'], shapes: ['rect', 'round'] },
    lamp: { shades: ['globe', 'cone', 'drum'], colors: ['#f2e3c0', '#ece6dc'], baseColors: ['#c9a03a'], materials: ['metal', 'glass'] },
    decor: {
      art: ['sunburst', 'arch', 'abstract'],
      artColors: ['#c9a03a', '#1f1f20', '#1f6b55'],
      plants: ['palm', 'snake'],
      planters: ['#c9a03a', '#1f1f20'],
      curtains: ['#26344f', '#ece6dc'],
      armchairStyles: ['wingback', 'lounge'],
      armchairColors: ['#d9a8a0', '#c9a03a'],
      pendants: ['globe', 'dome'],
      cushions: ['#c9a03a', '#d9a8a0', '#1f1f20'],
      throws: [null],
    },
    lighting: { warmth: 0.75, brightness: 0.6 },
    walls: ['#e6e0d4', '#2d3a4d'],
    floors: [walnut, concrete],
    estimates: { sofa: 6800, coffeeTable: 1800, rug: 1600, floorLamp: 900, decor: 1700 },
  },
  {
    id: 'modern-farmhouse',
    name: 'Modern farmhouse',
    blurb: 'Relaxed and sturdy — slipcovered fabric, reclaimed wood, black hardware.',
    swatch: ['#f2efe7', '#bfae94', '#6b4a33', '#2b2b2b'],
    sofa: {
      colors: ['#ece4d2', '#bfae94', '#8e8d8a', '#6b7a6b'],
      materials: ['cotton', 'linen', 'leather'],
      arms: ['rolled', 'track', 'rolled'],
      legs: ['turned', 'block', 'tapered-wood'],
      silhouettes: ['straight', 'straight', 'chesterfield'],
      legColors: ['#6b4a33', '#2b2b2b'],
      widths: [225, 240, 215],
      heights: [86, 82, 84],
    },
    table: { tops: ['rect', 'rect', 'round'], bases: ['four-legs', 'sled', 'pedestal'], colors: ['#8e6a48', '#6b4a33', '#bfae94'], materials: ['wood', 'metal'], legColors: ['#2b2b2b', '#6b4a33'] },
    rug: { patterns: ['border', 'stripe', 'solid'], colors: ['#e2d8c4', '#cfc3ad'], accents: ['#2b2b2b', '#6b4a33'], materials: ['jute', 'wool'], shapes: ['rect'] },
    lamp: { shades: ['drum', 'cone', 'globe'], colors: ['#f2efe7', '#2b2b2b'], baseColors: ['#2b2b2b', '#8e6a48'], materials: ['linen', 'metal'] },
    decor: {
      art: ['botanical', 'grid'],
      artColors: ['#6b4a33', '#6b7a6b', '#2b2b2b'],
      plants: ['olive', 'fiddle'],
      planters: ['#d8d0bf', '#2b2b2b'],
      curtains: ['#f2efe7', '#e2d8c4'],
      armchairStyles: ['wingback', 'lounge'],
      armchairColors: ['#8e4f26', '#bfae94'],
      pendants: ['dome', 'linear'],
      cushions: ['#6b7a6b', '#f2efe7', '#2b2b2b'],
      throws: ['#e2d8c4', null],
    },
    lighting: { warmth: 0.6, brightness: 0.8 },
    walls: ['#f2efe7', '#e9e5dc'],
    floors: [oak, walnut],
    estimates: { sofa: 5000, coffeeTable: 1300, rug: 1100, floorLamp: 650, decor: 1300 },
  },
];

export const STYLE_BY_ID: Record<StyleId, StyleDef> = Object.fromEntries(STYLES.map((s) => [s.id, s])) as Record<
  StyleId,
  StyleDef
>;

export function styleName(id: StyleId | 'original'): string {
  return id === 'original' ? 'Original room' : STYLE_BY_ID[id].name;
}
