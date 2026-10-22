import { rgbToHex } from '../../lib/color';

/**
 * Samples colours from an uploaded photo around a marked rectangle:
 * the piece itself (for matching) and bands just above and below it (to cover the old piece
 * when overlaying a replacement). Runs entirely in the browser.
 */
export async function sampleMark(url: string, r: { x: number; y: number; w: number; h: number }) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const W = 400;
  const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, W, H);
  const avg = (x: number, y: number, w: number, h: number) => {
    const x0 = Math.max(0, Math.floor(x * W));
    const y0 = Math.max(0, Math.floor(y * H));
    const x1 = Math.min(W, Math.ceil((x + w) * W));
    const y1 = Math.min(H, Math.ceil((y + h) * H));
    if (x1 <= x0 || y1 <= y0) return null;
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let rr = 0, gg = 0, bb = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      rr += d[i];
      gg += d[i + 1];
      bb += d[i + 2];
      n++;
    }
    return rgbToHex([rr / n, gg / n, bb / n]);
  };
  const color = avg(r.x + r.w * 0.2, r.y + r.h * 0.3, r.w * 0.6, r.h * 0.4) ?? '#999999';
  const band = Math.max(0.01, r.h * 0.08);
  const top = avg(r.x, r.y - band, r.w, band) ?? color;
  const bottom = avg(r.x, r.y + r.h, r.w, band) ?? top;
  return { color, top, bottom };
}
