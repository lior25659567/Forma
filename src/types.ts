// Core data model for Forma.

export type Category = 'sofa' | 'coffeeTable' | 'rug' | 'floorLamp';

export const CATEGORIES: Category[] = ['sofa', 'coffeeTable', 'rug', 'floorLamp'];

export const CATEGORY_LABEL: Record<Category, string> = {
  sofa: 'Sofa',
  coffeeTable: 'Coffee table',
  rug: 'Rug',
  floorLamp: 'Floor lamp',
};

export type StyleId =
  | 'warm-minimal'
  | 'japandi'
  | 'scandinavian'
  | 'industrial'
  | 'retro'
  | 'midcentury'
  | 'contemporary'
  | 'mediterranean'
  | 'coastal'
  | 'bohemian'
  | 'art-deco'
  | 'modern-farmhouse';

export type Material =
  | 'boucle'
  | 'linen'
  | 'velvet'
  | 'leather'
  | 'cotton'
  | 'chenille'
  | 'wood'
  | 'metal'
  | 'glass'
  | 'stone'
  | 'rattan'
  | 'wool'
  | 'jute'
  | 'paper';

// ---- Parametric shapes used by the demo renderer ----

export interface SofaShape {
  kind: 'sofa';
  widthCm: number;
  depthCm: number;
  heightCm: number;
  arms: 'track' | 'rolled' | 'sloped' | 'curved' | 'none';
  legs: 'tapered-wood' | 'metal' | 'block' | 'hidden' | 'turned';
  silhouette: 'straight' | 'curved' | 'chesterfield' | 'modular';
  seatCushions: 1 | 2 | 3;
  color: string;
  material: Material;
  legColor: string;
}

export interface TableShape {
  kind: 'coffeeTable';
  widthCm: number;
  depthCm: number;
  heightCm: number;
  top: 'rect' | 'round' | 'oval';
  base: 'four-legs' | 'pedestal' | 'sled' | 'block';
  color: string;
  material: Material;
  legColor: string;
}

export interface RugShape {
  kind: 'rug';
  widthCm: number;
  depthCm: number;
  pattern: 'solid' | 'border' | 'geometric' | 'stripe' | 'medallion';
  shape: 'rect' | 'round';
  color: string;
  accent: string;
  material: Material;
}

export interface LampShape {
  kind: 'floorLamp';
  heightCm: number;
  shade: 'drum' | 'cone' | 'globe' | 'arc' | 'paper';
  color: string;
  baseColor: string;
  material: Material;
}

export type ItemShape = SofaShape | TableShape | RugShape | LampShape;

export type ShapeFor<C extends Category> = Extract<ItemShape, { kind: C }>;

// ---- Catalog ----

export type RetailerId = 'ikea-il' | 'ace' | 'beitili' | 'floralis';

export type Availability = 'in-stock' | 'limited' | 'out-of-stock' | 'unknown';

export interface ProductVariant {
  id: string;
  name: string;
  colorHex: string;
  priceIls?: number | null;
}

export interface Product {
  id: string;
  category: Category;
  name: string;
  retailer: RetailerId;
  /** Exact product page. null when unknown (e.g. sample listings). */
  url: string | null;
  priceIls: number | null;
  deliveryIls: number | null;
  assemblyIls: number | null;
  dims: { widthCm: number; depthCm: number; heightCm: number } | null;
  material: Material;
  colorName: string;
  colorHex: string;
  variants: ProductVariant[];
  availability: Availability;
  /** ISO date the listing was last checked against the retailer. null = never verified. */
  checkedAt: string | null;
  /** Product photograph URLs. Empty → the UI draws an illustration and says so. */
  images: string[];
  /** Attributes used for matching and rendering the preview. */
  render: Partial<ItemShape> | null;
  /** Where this listing came from. */
  source: 'sample' | 'imported';
}

// ---- Designs ----

export type ItemSource =
  | { type: 'original' } // furniture already in the room photo
  | { type: 'kept' } // user chose to keep their existing piece
  | { type: 'generated'; estimateIls: number } // proposed by a design direction, not yet a real product
  | { type: 'product'; productId: string; variantId?: string };

export interface PlacedItem<C extends Category = Category> {
  category: C;
  shape: ShapeFor<C>;
  source: ItemSource;
}

export interface Decor {
  wallArt: 'none' | 'abstract' | 'botanical' | 'grid' | 'arch' | 'sunburst';
  artColors: [string, string];
  plant: 'none' | 'fiddle' | 'olive' | 'palm' | 'snake';
  planter: string;
  curtains: string | null;
  armchair: { color: string; style: 'lounge' | 'wingback' | 'rattan' | 'sling' } | null;
  pendant: 'none' | 'globe' | 'dome' | 'rattan' | 'linear';
  cushions: string[];
  throwColor: string | null;
  decorEstimateIls: number;
}

export interface Lighting {
  /** 0 = cool daylight, 1 = very warm. */
  warmth: number;
  /** 0 = dim / moody, 1 = bright. */
  brightness: number;
}

export interface Design {
  id: string;
  name: string;
  style: StyleId | 'original';
  variant: number;
  createdAt: string;
  items: Partial<{ [C in Category]: PlacedItem<C> }>;
  decor: Decor | null;
  lighting: Lighting;
  wallColor: string | null; // null = keep the room's wall colour
  floor: FloorFinish | null; // null = keep the room's floor
  inspiration?: { strength: number; colors: string[] };
}

export type FloorFinish = { type: 'oak' | 'walnut' | 'concrete' | 'terracotta' | 'whitewash'; color: string };

// ---- Rooms & projects ----

export interface Mark {
  id: string;
  category: Category;
  /** Normalised (0..1) rectangle on the photo. */
  rect: { x: number; y: number; w: number; h: number };
  /** Colours sampled around the region, used to cover the old piece in overlay previews. */
  patch: { top: string; bottom: string };
  /** Average colour sampled from the marked region (used for matching). */
  color: string;
  /** Optional user-entered width of the existing piece, used to scale replacements. */
  currentWidthCm: number | null;
}

export interface RoomDims {
  /** Usable wall length for the sofa, entered by the user. */
  sofaWallCm: number | null;
  roomWidthCm: number | null;
  roomDepthCm: number | null;
  /** True once the user has entered or confirmed these values. */
  confirmed: boolean;
}

export interface Preferences {
  style: StyleId;
  changeFlooring: boolean;
  changeWalls: boolean;
  keep: Category[];
}

export interface Budget {
  totalIls: number;
  /** User overrides of per-item allowances. Missing = default share of total. */
  allowances: Partial<Record<Category, number>>;
  includeDecor: boolean;
}

export type RoomSource =
  | { kind: 'sample'; sampleId: 'living' }
  | { kind: 'photo'; imageId: string; width: number; height: number };

export interface Room {
  id: string;
  name: string;
  source: RoomSource;
  dims: RoomDims;
  preferences: Preferences;
  budget: Budget;
  designs: Design[];
  activeDesignId: string;
  marks: Mark[];
  shortlist: string[];
}

export interface Revision {
  id: string;
  at: string;
  label: string;
  rooms: Room[];
  activeRoomId: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
  activeRoomId: string;
  revisions: Revision[];
}
