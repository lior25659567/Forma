import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateDesign } from '../design/generate';
import { uid } from '../lib/id';
import { ShapeIllustration } from '../screens/workspace/ProductThumb';
import { putImage } from '../state/storage';
import type { Category, Design, ItemShape, Mark, PlacedItem, Product, Room, StyleId } from '../types';
import { aiGenerate } from './client';
import { compositePatch, cropAround, dataUrlToBlob, fitSize, loadImage, resizeToDataUrl, structureSimilarity } from './imaging';
import { replacePrompt, restylePrompt } from './prompts';

/** Reference image for a product: the retailer photo when it can be loaded, else its illustration. */
async function referenceImage(product: Product, shape: ItemShape): Promise<{ dataUrl: string; isPhoto: boolean }> {
  const photo = product.images[0];
  if (photo) {
    try {
      const img = await loadImage(photo);
      const s = fitSize(img.naturalWidth, img.naturalHeight, 768);
      return { dataUrl: await resizeToDataUrl(photo, s.width, s.height), isPhoto: true };
    } catch {
      // Store blocks cross-site image use; fall back to the illustration.
    }
  }
  const markup = renderToStaticMarkup(createElement(ShapeIllustration, { shape, label: product.name }));
  const xml = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    const k = Math.min(c.width / img.width, c.height / img.height) * 0.9;
    g.drawImage(img, (c.width - img.width * k) / 2, (c.height - img.height * k) / 2, img.width * k, img.height * k);
    return { dataUrl: c.toDataURL('image/png'), isPhoto: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ReplaceResult {
  blob: Blob;
  url: string;
  model: string;
  referenceIsPhoto: boolean;
}

/**
 * Generates the room with one piece replaced by a product. Only a crop around the marked piece
 * is sent to the model, and only a feathered area around the piece is pasted back, so the rest
 * of the room stays exactly as it was.
 */
export async function aiReplace(args: {
  baseUrl: string;
  mark: Mark;
  category: Category;
  product: Product;
  shape: ItemShape;
  signal: AbortSignal;
}): Promise<ReplaceResult> {
  const { baseUrl, mark, category, product, shape, signal } = args;
  const [crop, ref] = await Promise.all([cropAround(baseUrl, mark.rect), referenceImage(product, shape)]);
  const { image, model } = await aiGenerate(
    {
      prompt: replacePrompt(category, product, shape, ref.isPhoto),
      width: crop.size.width,
      height: crop.size.height,
      images: [crop.dataUrl, ref.dataUrl],
      seed: Math.floor(Math.random() * 1e9),
    },
    signal,
  );
  const blob = await compositePatch(baseUrl, image, crop.box, mark.rect);
  return { blob, url: URL.createObjectURL(blob), model, referenceIsPhoto: ref.isPhoto };
}

/** Generates one style direction of the user's photo and stores the image. */
export async function aiRestyle(args: {
  room: Room;
  photoUrl: string;
  style: StyleId;
  variant: number;
  inspirationColors: string[];
  strength: number;
  signal: AbortSignal;
}): Promise<Design> {
  const { room, photoUrl, style, variant, signal } = args;
  if (room.source.kind !== 'photo') throw new Error('Restyling needs a room photo.');
  const plan = generateDesign(room, style, variant, { inspirationColors: args.inspirationColors, inspirationStrength: args.strength });
  const marked = room.marks.map((m) => m.category);
  const size = fitSize(room.source.width, room.source.height, 1024);
  const input = await resizeToDataUrl(photoUrl, size.width, size.height);
  const { image, model } = await aiGenerate(
    {
      prompt: restylePrompt(style, plan, room.preferences, marked),
      width: size.width,
      height: size.height,
      images: [input],
      seed: 1000 + variant * 7919,
    },
    signal,
  );
  const blob = await dataUrlToBlob(image);
  const imageId = uid('img');
  await putImage(imageId, blob);
  const structureScore = await structureSimilarity(photoUrl, image).catch(() => undefined);
  // Only marked pieces can be selected on a photo; they are part of the generated image.
  const items: Design['items'] = {};
  for (const c of Object.keys(plan.items) as Category[]) {
    const it = plan.items[c] as PlacedItem;
    (items as Record<Category, PlacedItem>)[c] = { ...it, inImage: true };
  }
  return { ...plan, items, imageId, imageModel: model, structureScore };
}
