import type { Availability, Category, ItemShape, Material, Product, ProductVariant, RetailerId } from '../types';

/**
 * SAMPLE CATALOG — illustrative placeholder data.
 *
 * These listings are NOT taken from IKEA Israel, ACE, Beitili or Floralis. Product names are
 * invented, prices are plausible ranges only, and stock is made up. They exist so the matching,
 * budget and preview flow can be exercised end to end. Every listing has `source: 'sample'`,
 * `url: null` and `checkedAt: null`, and the UI labels them as sample data.
 *
 * Replace with a maintained catalog or a retailer feed (see `parseCatalogFeed` in feed.ts).
 */
export const SAMPLE_CATALOG_COMPILED = '2026-10-22';

type Dims = [number, number, number] | null;

interface Row {
  id: string;
  name: string;
  retailer: RetailerId;
  price: number | null;
  delivery: number | null;
  assembly: number | null;
  dims: Dims;
  material: Material;
  colorName: string;
  colorHex: string;
  availability: Availability;
  render: Partial<ItemShape>;
  variants?: [string, string, number?][];
}

function build(category: Category, r: Row): Product {
  const variants: ProductVariant[] = [
    { id: `${r.id}-default`, name: r.colorName, colorHex: r.colorHex, priceIls: r.price },
    ...(r.variants ?? []).map(([name, hex, price], i) => ({
      id: `${r.id}-v${i + 1}`,
      name,
      colorHex: hex,
      priceIls: price ?? r.price,
    })),
  ];
  return {
    id: r.id,
    category,
    name: r.name,
    retailer: r.retailer,
    url: null,
    priceIls: r.price,
    deliveryIls: r.delivery,
    assemblyIls: r.assembly,
    dims: r.dims ? { widthCm: r.dims[0], depthCm: r.dims[1], heightCm: r.dims[2] } : null,
    material: r.material,
    colorName: r.colorName,
    colorHex: r.colorHex,
    variants,
    availability: r.availability,
    checkedAt: null,
    images: [],
    render: { ...r.render, kind: category } as Partial<ItemShape>,
    source: 'sample',
  };
}

const sofas: Row[] = [
  { id: 'sofa-ostra', name: 'Ostra 3-seat sofa', retailer: 'ikea-il', price: 2490, delivery: 149, assembly: 199, dims: [214, 88, 80], material: 'cotton', colorName: 'Light grey', colorHex: '#bdbcb8', availability: 'in-stock', render: { arms: 'track', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 3, legColor: '#c8a982' }, variants: [['Beige', '#d6c7ab'], ['Dark blue', '#2c3a55']] },
  { id: 'sofa-lindvik', name: 'Lindvik 3-seat sofa', retailer: 'ikea-il', price: 3290, delivery: 149, assembly: 249, dims: [228, 95, 73], material: 'boucle', colorName: 'Off-white', colorHex: '#e9e2d4', availability: 'in-stock', render: { arms: 'curved', legs: 'hidden', silhouette: 'curved', seatCushions: 1, legColor: '#d8c7ad' }, variants: [['Sand', '#c9b38c']] },
  { id: 'sofa-barra', name: 'Barra modular sofa', retailer: 'ikea-il', price: 4690, delivery: 149, assembly: 299, dims: [246, 98, 70], material: 'chenille', colorName: 'Warm beige', colorHex: '#cbbb9f', availability: 'limited', render: { arms: 'track', legs: 'hidden', silhouette: 'modular', seatCushions: 3, legColor: '#333333' } },
  { id: 'sofa-vemmo', name: 'Vemmo 2-seat sofa', retailer: 'ikea-il', price: 1790, delivery: 149, assembly: 149, dims: [176, 84, 82], material: 'linen', colorName: 'Natural', colorHex: '#d8cdb8', availability: 'in-stock', render: { arms: 'sloped', legs: 'metal', silhouette: 'straight', seatCushions: 2, legColor: '#222222' } },
  { id: 'sofa-fjella', name: 'Fjella 2-seat sofa', retailer: 'ikea-il', price: 1290, delivery: 149, assembly: 149, dims: [168, 82, 78], material: 'cotton', colorName: 'Mid grey', colorHex: '#8e8d8a', availability: 'in-stock', render: { arms: 'track', legs: 'block', silhouette: 'straight', seatCushions: 2, legColor: '#3a3a3a' } },
  { id: 'sofa-kallby', name: 'Kallby 3-seat sofa', retailer: 'ikea-il', price: 2990, delivery: null, assembly: 199, dims: null, material: 'cotton', colorName: 'Dark green', colorHex: '#355343', availability: 'unknown', render: { arms: 'track', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 3, legColor: '#c8a982' } },
  { id: 'sofa-tamar', name: 'Tamar 3-seat sofa', retailer: 'ace', price: 3490, delivery: 250, assembly: 0, dims: [220, 92, 84], material: 'linen', colorName: 'Oat', colorHex: '#d6c7ab', availability: 'in-stock', render: { arms: 'track', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 2, legColor: '#b08a63' }, variants: [['Stone', '#a9a59c'], ['Olive', '#7b7a46', 3690]] },
  { id: 'sofa-arbel', name: 'Arbel velvet sofa', retailer: 'ace', price: 3990, delivery: 250, assembly: null, dims: [210, 90, 78], material: 'velvet', colorName: 'Bottle green', colorHex: '#1f6b55', availability: 'limited', render: { arms: 'curved', legs: 'metal', silhouette: 'curved', seatCushions: 1, legColor: '#c9a03a' }, variants: [['Dusty rose', '#b97f7c']] },
  { id: 'sofa-gilboa', name: 'Gilboa leather sofa', retailer: 'ace', price: 5990, delivery: 250, assembly: null, dims: [230, 95, 82], material: 'leather', colorName: 'Cognac', colorHex: '#8e4f26', availability: 'in-stock', render: { arms: 'rolled', legs: 'block', silhouette: 'chesterfield', seatCushions: 2, legColor: '#2b2b2b' } },
  { id: 'sofa-carmel', name: 'Carmel 3-seat sofa', retailer: 'ace', price: null, delivery: 250, assembly: null, dims: [216, 92, 80], material: 'cotton', colorName: 'Stone grey', colorHex: '#9a978f', availability: 'unknown', render: { arms: 'track', legs: 'block', silhouette: 'straight', seatCushions: 3, legColor: '#3a3a3a' } },
  { id: 'sofa-noa', name: 'Noa curved sofa', retailer: 'beitili', price: 6490, delivery: 300, assembly: 0, dims: [232, 100, 74], material: 'boucle', colorName: 'Ivory', colorHex: '#ece4d2', availability: 'in-stock', render: { arms: 'curved', legs: 'hidden', silhouette: 'curved', seatCushions: 1, legColor: '#d8c7ad' } },
  { id: 'sofa-eden', name: 'Eden 3-seat sofa', retailer: 'beitili', price: 4890, delivery: 300, assembly: 0, dims: [222, 94, 80], material: 'chenille', colorName: 'Taupe', colorHex: '#9a8b7a', availability: 'in-stock', render: { arms: 'sloped', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 3, legColor: '#7a5639' }, variants: [['Sage', '#9caa8c']] },
  { id: 'sofa-yarden', name: 'Yarden linen sofa', retailer: 'beitili', price: 5590, delivery: 300, assembly: 0, dims: [236, 96, 82], material: 'linen', colorName: 'Sand', colorHex: '#c9b38c', availability: 'out-of-stock', render: { arms: 'track', legs: 'block', silhouette: 'modular', seatCushions: 3, legColor: '#6b4a33' } },
  { id: 'sofa-rimon', name: 'Rimon velvet sofa', retailer: 'beitili', price: 5290, delivery: 300, assembly: 0, dims: [214, 90, 78], material: 'velvet', colorName: 'Terracotta', colorHex: '#b8613f', availability: 'limited', render: { arms: 'rolled', legs: 'turned', silhouette: 'straight', seatCushions: 2, legColor: '#6b4a33' }, variants: [['Mustard', '#c9a03a']] },
  { id: 'sofa-sela', name: 'Sela bouclé sofa', retailer: 'floralis', price: 8900, delivery: 0, assembly: 0, dims: [240, 102, 72], material: 'boucle', colorName: 'Cream', colorHex: '#e6dac0', availability: 'in-stock', render: { arms: 'curved', legs: 'hidden', silhouette: 'curved', seatCushions: 1, legColor: '#d8c7ad' } },
  { id: 'sofa-avital', name: 'Avital 3-seat sofa', retailer: 'floralis', price: 7400, delivery: 0, assembly: 0, dims: [226, 96, 80], material: 'linen', colorName: 'Oatmeal', colorHex: '#d3c4a6', availability: 'in-stock', render: { arms: 'track', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 2, legColor: '#8e6a48' } },
  { id: 'sofa-lior', name: 'Lior modular sofa', retailer: 'floralis', price: 11900, delivery: 0, assembly: 0, dims: [280, 105, 70], material: 'chenille', colorName: 'Mushroom', colorHex: '#a89379', availability: 'limited', render: { arms: 'track', legs: 'hidden', silhouette: 'modular', seatCushions: 3, legColor: '#333333' } },
  { id: 'sofa-hadar', name: 'Hadar leather sofa', retailer: 'floralis', price: 9800, delivery: 0, assembly: 0, dims: [220, 92, 80], material: 'leather', colorName: 'Black', colorHex: '#2a2a2a', availability: 'in-stock', render: { arms: 'track', legs: 'metal', silhouette: 'straight', seatCushions: 2, legColor: '#9a9894' } },
  { id: 'sofa-shaked', name: 'Shaked velvet sofa', retailer: 'floralis', price: 6900, delivery: 0, assembly: 0, dims: [205, 90, 84], material: 'velvet', colorName: 'Navy', colorHex: '#26344f', availability: 'in-stock', render: { arms: 'sloped', legs: 'tapered-wood', silhouette: 'straight', seatCushions: 2, legColor: '#5c3e27' } },
];

const tables: Row[] = [
  { id: 'table-runa', name: 'Runa round coffee table', retailer: 'ikea-il', price: 590, delivery: 99, assembly: 79, dims: [80, 80, 45], material: 'wood', colorName: 'Oak veneer', colorHex: '#c9a77c', availability: 'in-stock', render: { top: 'round', base: 'four-legs', legColor: '#b8956b' } },
  { id: 'table-plan', name: 'Plan coffee table', retailer: 'ikea-il', price: 390, delivery: 99, assembly: 59, dims: [118, 59, 40], material: 'wood', colorName: 'White', colorHex: '#f1efe9', availability: 'in-stock', render: { top: 'rect', base: 'four-legs', legColor: '#f1efe9' } },
  { id: 'table-dor', name: 'Dor metal coffee table', retailer: 'ace', price: 890, delivery: 150, assembly: null, dims: [110, 55, 42], material: 'metal', colorName: 'Black', colorHex: '#2a2a2a', availability: 'in-stock', render: { top: 'rect', base: 'sled', legColor: '#1e1e1e' } },
  { id: 'table-even', name: 'Even travertine table', retailer: 'beitili', price: 2490, delivery: 300, assembly: 0, dims: [90, 90, 36], material: 'stone', colorName: 'Travertine', colorHex: '#dcc9ad', availability: 'limited', render: { top: 'round', base: 'pedestal', legColor: '#dcc9ad' } },
  { id: 'table-kash', name: 'Kash rattan coffee table', retailer: 'beitili', price: 1290, delivery: 300, assembly: 0, dims: [100, 60, 40], material: 'rattan', colorName: 'Natural', colorHex: '#c9a272', availability: 'in-stock', render: { top: 'oval', base: 'block', legColor: '#b08a63' } },
  { id: 'table-alon', name: 'Alon walnut coffee table', retailer: 'floralis', price: 3900, delivery: 0, assembly: 0, dims: [120, 65, 38], material: 'wood', colorName: 'Walnut', colorHex: '#6b4a33', availability: 'in-stock', render: { top: 'oval', base: 'four-legs', legColor: '#5c3e27' } },
];

const rugs: Row[] = [
  { id: 'rug-tova', name: 'Tova jute rug 200×300', retailer: 'ikea-il', price: 690, delivery: 99, assembly: 0, dims: [300, 200, 1], material: 'jute', colorName: 'Natural', colorHex: '#c9b38c', availability: 'in-stock', render: { pattern: 'solid', shape: 'rect', accent: '#b39d77' } },
  { id: 'rug-mild', name: 'Mild wool rug 170×240', retailer: 'ikea-il', price: 1190, delivery: 99, assembly: 0, dims: [240, 170, 1], material: 'wool', colorName: 'Off-white', colorHex: '#ebe5d9', availability: 'in-stock', render: { pattern: 'border', shape: 'rect', accent: '#cfc4b1' } },
  { id: 'rug-geo', name: 'Geo rug 160×230', retailer: 'ace', price: 899, delivery: 150, assembly: 0, dims: [230, 160, 1], material: 'wool', colorName: 'Grey & cream', colorHex: '#c9c7c3', availability: 'in-stock', render: { pattern: 'geometric', shape: 'rect', accent: '#46474a' } },
  { id: 'rug-shulayim', name: 'Shulayim border rug 200×290', retailer: 'beitili', price: 2290, delivery: 300, assembly: 0, dims: [290, 200, 1], material: 'wool', colorName: 'Sand', colorHex: '#d8cab4', availability: 'in-stock', render: { pattern: 'border', shape: 'rect', accent: '#8f7a5f' } },
  { id: 'rug-anat', name: 'Anat medallion rug 200×300', retailer: 'floralis', price: 3900, delivery: 0, assembly: 0, dims: [300, 200, 1], material: 'wool', colorName: 'Rust', colorHex: '#9c4426', availability: 'limited', render: { pattern: 'medallion', shape: 'rect', accent: '#26344f' } },
  { id: 'rug-igul', name: 'Igul round rug Ø200', retailer: 'floralis', price: 2490, delivery: 0, assembly: 0, dims: [200, 200, 1], material: 'wool', colorName: 'Cream', colorHex: '#e6dac0', availability: 'in-stock', render: { pattern: 'stripe', shape: 'round', accent: '#bfa788' } },
];

const lamps: Row[] = [
  { id: 'lamp-kumo', name: 'Kumo paper floor lamp', retailer: 'ikea-il', price: 299, delivery: 49, assembly: 0, dims: [45, 45, 140], material: 'paper', colorName: 'White', colorHex: '#f3ede2', availability: 'in-stock', render: { shade: 'paper', baseColor: '#2f2c28' } },
  { id: 'lamp-svaj', name: 'Svaj arc floor lamp', retailer: 'ikea-il', price: 690, delivery: 49, assembly: 0, dims: [120, 40, 185], material: 'metal', colorName: 'Black', colorHex: '#1e1e1e', availability: 'in-stock', render: { shade: 'arc', baseColor: '#1e1e1e' } },
  { id: 'lamp-tri', name: 'Tri tripod lamp', retailer: 'ace', price: 449, delivery: 80, assembly: 0, dims: [50, 50, 155], material: 'linen', colorName: 'Linen & oak', colorHex: '#ece2d0', availability: 'in-stock', render: { shade: 'cone', baseColor: '#b08a63' } },
  { id: 'lamp-shachor', name: 'Shachor drum floor lamp', retailer: 'ace', price: 349, delivery: 80, assembly: 0, dims: [40, 40, 150], material: 'metal', colorName: 'Black', colorHex: '#2a2a2a', availability: 'unknown', render: { shade: 'drum', baseColor: '#1e1e1e' } },
  { id: 'lamp-zahav', name: 'Zahav globe floor lamp', retailer: 'beitili', price: 1190, delivery: 300, assembly: 0, dims: [35, 35, 160], material: 'glass', colorName: 'Opal & brass', colorHex: '#f2e3c0', availability: 'in-stock', render: { shade: 'globe', baseColor: '#c9a03a' } },
  { id: 'lamp-ohr', name: 'Ohr linen floor lamp', retailer: 'floralis', price: 1890, delivery: 0, assembly: 0, dims: [50, 50, 165], material: 'linen', colorName: 'Natural linen', colorHex: '#e8dcc6', availability: 'in-stock', render: { shade: 'drum', baseColor: '#7a5639' } },
];

export const SAMPLE_PRODUCTS: Product[] = [
  ...sofas.map((r) => build('sofa', r)),
  ...tables.map((r) => build('coffeeTable', r)),
  ...rugs.map((r) => build('rug', r)),
  ...lamps.map((r) => build('floorLamp', r)),
];
