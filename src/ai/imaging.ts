// Browser-side image helpers for the generation flow: resizing, cropping around a piece of
// furniture, compositing a generated patch back into the room, and a structure check.

export type Rect = { x: number; y: number; w: number; h: number };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Couldn’t load image.'));
    img.src = src;
  });
}

/** Fit inside `max` on the long edge, rounded to multiples of 16 (what the model expects). */
export function fitSize(w: number, h: number, max = 1024, min = 256) {
  const k = Math.min(max / Math.max(w, h), 1.6);
  const r16 = (n: number) => Math.max(min, Math.round((n * k) / 16) * 16);
  return { width: r16(w), height: r16(h) };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}

export async function resizeToDataUrl(src: string, width: number, height: number): Promise<string> {
  const img = await loadImage(src);
  const c = canvas(width, height);
  c.getContext('2d')!.drawImage(img, 0, 0, width, height);
  return c.toDataURL('image/jpeg', 0.9);
}

/**
 * Crops a generous area around the marked piece so the model sees enough of the room to match
 * perspective and light. Returns the crop (as a data URL sized for the model) and where it sits
 * in the full image, in pixels.
 */
export async function cropAround(src: string, mark: Rect) {
  const img = await loadImage(src);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const padX = mark.w * 0.45;
  const padY = mark.h * 0.6;
  const x0 = Math.max(0, (mark.x - padX) * W);
  const y0 = Math.max(0, (mark.y - padY) * H);
  const x1 = Math.min(W, (mark.x + mark.w + padX) * W);
  const y1 = Math.min(H, (mark.y + mark.h + padY * 0.6) * H);
  const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const size = fitSize(box.w, box.h, 1024, 256);
  const c = canvas(size.width, size.height);
  c.getContext('2d')!.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, size.width, size.height);
  return { dataUrl: c.toDataURL('image/jpeg', 0.92), box, size, full: { w: W, h: H } };
}

/**
 * Pastes the generated crop back into the full image, but only inside a feathered area around
 * the marked piece. Everything outside that area stays pixel-identical to the original.
 */
export async function compositePatch(baseSrc: string, patchSrc: string, box: Rect, mark: Rect): Promise<Blob> {
  const [base, patch] = await Promise.all([loadImage(baseSrc), loadImage(patchSrc)]);
  const W = base.naturalWidth;
  const H = base.naturalHeight;
  const out = canvas(W, H);
  const g = out.getContext('2d')!;
  g.drawImage(base, 0, 0);

  // Generated crop at full resolution, masked to the region around the marked piece.
  const layer = canvas(W, H);
  const lg = layer.getContext('2d')!;
  lg.drawImage(patch, box.x, box.y, box.w, box.h);
  const mask = canvas(W, H);
  const mg = mask.getContext('2d')!;
  const feather = Math.max(8, Math.min(W, H) * 0.02);
  const ex = mark.w * W * 0.14;
  const ey = mark.h * H * 0.18;
  mg.filter = `blur(${feather}px)`;
  mg.fillStyle = '#000';
  mg.fillRect(mark.x * W - ex, mark.y * H - ey * 1.4, mark.w * W + ex * 2, mark.h * H + ey * 2.2);
  lg.globalCompositeOperation = 'destination-in';
  lg.drawImage(mask, 0, 0);
  g.drawImage(layer, 0, 0);

  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t save the preview.'))), 'image/jpeg', 0.92));
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

function edges(img: HTMLImageElement, w = 96, h = 64): Float32Array {
  const c = canvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + w] - lum[i - w];
      out[i] = Math.hypot(gx, gy);
    }
  return out;
}

/**
 * Rough check that a restyled image kept the room's structure: correlates the edge maps of the
 * outer band of both images (walls, ceiling line, window frame), ignoring the furniture zone.
 * Returns 0..1; below ~0.35 the walls or windows have likely moved.
 */
export async function structureSimilarity(aSrc: string, bSrc: string): Promise<number> {
  const [a, b] = await Promise.all([loadImage(aSrc), loadImage(bSrc)]);
  const w = 96;
  const h = 64;
  const ea = edges(a, w, h);
  const eb = edges(b, w, h);
  let sa = 0, sb = 0, n = 0;
  const use = (x: number, y: number) => y < h * 0.45 || x < w * 0.12 || x > w * 0.88;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (use(x, y)) { sa += ea[y * w + x]; sb += eb[y * w + x]; n++; }
  const ma = sa / n;
  const mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (!use(x, y)) continue;
      const da = ea[y * w + x] - ma;
      const db = eb[y * w + x] - mb;
      cov += da * db;
      va += da * da;
      vb += db * db;
    }
  return va && vb ? Math.max(0, cov / Math.sqrt(va * vb)) : 0;
}

/** Rasterises an SVG element (e.g. a product illustration) to a PNG data URL on white. */
export async function svgToPng(svg: SVGSVGElement, width = 768, height = 512): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const c = canvas(width, height);
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, width, height);
    const k = Math.min(width / img.width, height / img.height) * 0.9;
    g.drawImage(img, (width - img.width * k) / 2, (height - img.height * k) / 2, img.width * k, img.height * k);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
