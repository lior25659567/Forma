// One-point perspective camera for the sample room.
// Room coordinates are in centimetres: X across (0 = camera centre), Y up from the floor,
// Z distance from the camera. The back wall is at Z = 650 and the room is 420 cm wide.

export const VIEW_W = 1200;
export const VIEW_H = 800;
export const F = 1300; // focal length in px
export const CX = 600;
export const CY = 330;
export const EYE = 95; // camera height in cm
export const BACK_Z = 650;
export const ROOM_HALF_W = 210;
export const CEILING = 230;

export type Pt = [number, number];

export function P(X: number, Y: number, Z: number): Pt {
  return [CX + (F * X) / Z, CY + (F * (EYE - Y)) / Z];
}

export const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function bboxOf(points: Pt[]): BBox {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function unionBBox(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** Polygon for a horizontal rectangle on the floor (or at height Y). */
export function floorQuad(x0: number, x1: number, z0: number, z1: number, Y = 0): Pt[] {
  return [P(x0, Y, z1), P(x1, Y, z1), P(x1, Y, z0), P(x0, Y, z0)];
}

/** Ellipse on a horizontal plane, sampled as a polygon. */
export function floorEllipse(cx: number, cz: number, rx: number, rz: number, Y = 0, n = 48): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(P(cx + Math.cos(a) * rx, Y, cz + Math.sin(a) * rz));
  }
  return out;
}

export function roundRectPath(x: number, y: number, w: number, h: number, rTop: number, rBottom = rTop): string {
  const rt = Math.max(0, Math.min(rTop, w / 2, h / 2));
  const rb = Math.max(0, Math.min(rBottom, w / 2, h / 2));
  return [
    `M${x + rt},${y}`,
    `H${x + w - rt}`,
    rt ? `Q${x + w},${y} ${x + w},${y + rt}` : '',
    `V${y + h - rb}`,
    rb ? `Q${x + w},${y + h} ${x + w - rb},${y + h}` : '',
    `H${x + rb}`,
    rb ? `Q${x},${y + h} ${x},${y + h - rb}` : '',
    `V${y + rt}`,
    rt ? `Q${x},${y} ${x + rt},${y}` : '',
    'Z',
  ].join(' ');
}
