import type { ReactNode } from 'react';
import { shade } from '../lib/color';
import type { Decor, ItemShape, LampShape, Material, RugShape, SofaShape, TableShape } from '../types';
import { BBox, bboxOf, EYE, floorEllipse, floorQuad, P, Pt, pts, roundRectPath } from './projection';

export interface Ctx {
  /** Unique id prefix for this <svg> (patterns, clip paths, filters). */
  id: string;
  n: number;
}

export interface Drawn {
  node: ReactNode;
  bbox: BBox;
}

const key = (ctx: Ctx) => `${ctx.id}-${ctx.n++}`;

/** Texture overlay fill for a material, defined in <SceneDefs>. */
export function texFill(ctx: Ctx, m: Material): string | null {
  const known: Material[] = ['boucle', 'linen', 'velvet', 'leather', 'cotton', 'chenille', 'wood', 'stone', 'rattan', 'wool', 'jute', 'metal'];
  return known.includes(m) ? `url(#${ctx.id}-tex-${m})` : null;
}

interface BoxOpts {
  color: string;
  tex?: Material;
  /** Corner radius of the front face's top corners, in cm. */
  rTop?: number;
  rBottom?: number;
  /** How much lower (cm) the top edge is at the front than at the back (sloped arms). */
  slope?: number;
  opacity?: number;
}

/** Draws the visible faces of an axis-aligned box: one side, top, then front. */
function box(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, o: BoxOpts) {
  const els: ReactNode[] = [];
  const all: Pt[] = [];
  const yF = y1 - (o.slope ?? 0);
  const front = { tl: P(x0, yF, z0), br: P(x1, y0, z0) };
  const scale = (front.br[0] - front.tl[0]) / Math.max(1, x1 - x0); // px per cm at the front face
  const rt = (o.rTop ?? 0) * scale;
  const rb = (o.rBottom ?? 0) * scale;
  const tex = o.tex ? texFill(ctx, o.tex) : null;
  const op = o.opacity ?? 1;

  const face = (points: Pt[], fill: string) => {
    all.push(...points);
    els.push(<polygon key={key(ctx)} points={pts(points)} fill={fill} opacity={op} />);
    if (tex) els.push(<polygon key={key(ctx)} points={pts(points)} fill={tex} opacity={op} />);
  };

  if (x0 > 0) face([P(x0, y0, z1), P(x0, y1, z1), P(x0, yF, z0), P(x0, y0, z0)], shade(o.color, -0.16));
  if (x1 < 0) face([P(x1, y0, z1), P(x1, y1, z1), P(x1, yF, z0), P(x1, y0, z0)], shade(o.color, -0.16));
  if (y1 < EYE) {
    const a = P(x0, y1, z1);
    const b = P(x1, y1, z1);
    const c: Pt = [front.br[0] - rt * 0.7, front.tl[1]];
    const d: Pt = [front.tl[0] + rt * 0.7, front.tl[1]];
    face([a, b, c, d], shade(o.color, 0.1));
  }
  const fx = front.tl[0];
  const fy = front.tl[1];
  const fw = front.br[0] - fx;
  const fh = front.br[1] - fy;
  all.push(front.tl, front.br);
  const d = roundRectPath(fx, fy, fw, fh, rt, rb);
  els.push(<path key={key(ctx)} d={d} fill={o.color} opacity={op} />);
  if (tex) els.push(<path key={key(ctx)} d={d} fill={tex} opacity={op} />);
  return { els, pts: all, front: { x: fx, y: fy, w: fw, h: fh } };
}

// ---------------- Sofa ----------------

const LEG_H: Record<SofaShape['legs'], number> = { 'tapered-wood': 14, metal: 15, turned: 13, block: 5, hidden: 0 };

export function drawSofa(ctx: Ctx, s: SofaShape, X: number, Zb: number, decor?: Pick<Decor, 'cushions' | 'throwColor'> | null): Drawn {
  const els: ReactNode[] = [];
  const all: Pt[] = [];
  const add = (r: { els: ReactNode[]; pts: Pt[] }) => {
    els.push(...r.els);
    all.push(...r.pts);
  };
  const w = s.widthCm;
  const d = s.depthCm;
  const H = s.heightCm;
  const x0 = X - w / 2;
  const x1 = X + w / 2;
  const zf = Zb - d;
  const L = LEG_H[s.legs];
  const ches = s.silhouette === 'chesterfield';
  const curved = s.silhouette === 'curved';
  const modular = s.silhouette === 'modular';
  const arms = ches && s.arms === 'none' ? 'rolled' : s.arms;
  const aw = arms === 'none' ? 0 : ches ? 20 : { track: 15, rolled: 19, sloped: 14, curved: 21 }[arms];
  const armTop = ches ? H - 3 : Math.min({ track: 62, rolled: 62, sloped: 60, curved: 60, none: 0 }[arms], H - 10);
  const baseTop = Math.max(L + 13, 28);
  const seatTop = baseTop + 14;
  const backT = 16;
  const c = s.color;
  const m = s.material;
  const soft = curved ? 1 : 0;

  // Contact shadow
  els.push(
    <polygon
      key={key(ctx)}
      points={pts(floorQuad(x0 - 6, x1 + 6, zf - 8, Zb))}
      fill="#000"
      opacity={0.22}
      filter={`url(#${ctx.id}-blur8)`}
    />,
  );

  // Legs
  const legW = s.legs === 'block' ? 7 : s.legs === 'metal' ? 2.5 : 4.5;
  const legPositions: [number, number, boolean][] = [
    [x0 + 6, Zb - 8, true],
    [x1 - 6 - legW, Zb - 8, true],
    [x0 + 6, zf + 5, false],
    [x1 - 6 - legW, zf + 5, false],
  ];
  if (L > 0) {
    for (const [lx, lz, back] of legPositions) {
      const top = P(lx, L, lz);
      const bot = P(lx, 0, lz);
      const pw = ((P(lx + legW, 0, lz)[0] - bot[0]) as number) || 2;
      const col = back ? shade(s.legColor, -0.25) : s.legColor;
      if (s.legs === 'tapered-wood') {
        const poly: Pt[] = [top, [top[0] + pw, top[1]], [bot[0] + pw * 0.7, bot[1]], [bot[0] + pw * 0.3, bot[1]]];
        all.push(...poly);
        els.push(<polygon key={key(ctx)} points={pts(poly)} fill={col} />);
      } else if (s.legs === 'turned') {
        els.push(
          <path
            key={key(ctx)}
            d={`M${top[0]},${top[1]} h${pw} q${-pw * 0.4},${(bot[1] - top[1]) * 0.35} ${-pw * 0.1},${(bot[1] - top[1]) * 0.55} q${pw * 0.2},${(bot[1] - top[1]) * 0.3} ${-pw * 0.2},${(bot[1] - top[1]) * 0.45} h${-pw * 0.4} q${-pw * 0.4},${-(bot[1] - top[1]) * 0.15} ${-pw * 0.2},${-(bot[1] - top[1]) * 0.45} q${pw * 0.3},${-(bot[1] - top[1]) * 0.2} ${-pw * 0.1},${-(bot[1] - top[1]) * 0.55}z`}
            fill={col}
          />,
        );
        all.push(top, bot);
      } else {
        const poly: Pt[] = [top, [top[0] + pw, top[1]], [bot[0] + pw, bot[1]], bot];
        all.push(...poly);
        els.push(<polygon key={key(ctx)} points={pts(poly)} fill={col} />);
      }
    }
  }

  // Back frame
  add(box(ctx, x0 + (curved ? 2 : 0), x1 - (curved ? 2 : 0), L, H, Zb - backT, Zb, { color: shade(c, -0.05), tex: m, rTop: curved ? 26 : ches ? 6 : 4 }));

  // Chesterfield tufting on the back
  if (ches) {
    const yA = seatTop + 6;
    const yB = H - 8;
    for (let row = 0; row < 3; row++) {
      const yy = yA + ((yB - yA) * row) / 2;
      const off = row % 2 ? 9 : 0;
      for (let xx = x0 + aw + 8 + off; xx < x1 - aw - 4; xx += 18) {
        const [px, py] = P(xx, yy, Zb - backT);
        els.push(<circle key={key(ctx)} cx={px} cy={py} r={2.2} fill={shade(c, -0.35)} opacity={0.75} />);
      }
    }
  }

  // Back cushions
  if (!ches) {
    const n = s.seatCushions;
    const ix0 = x0 + aw;
    const ix1 = x1 - aw;
    const gap = modular ? 2.5 : 0.8;
    const cw = (ix1 - ix0 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const cx0 = ix0 + i * (cw + gap);
      add(box(ctx, cx0, cx0 + cw, seatTop - 4, H - 3, Zb - backT - 14, Zb - backT, { color: c, tex: m, rTop: curved ? 14 : 8, rBottom: 4 }));
    }
  }

  // Base
  add(box(ctx, x0, x1, L, baseTop, zf, Zb - backT, { color: shade(c, -0.08), tex: m, rTop: 2, rBottom: soft ? 10 : 2 }));

  // Seat cushions
  {
    const n = s.seatCushions;
    const ix0 = x0 + aw;
    const ix1 = x1 - aw;
    const gap = modular ? 2.5 : 0.8;
    const cw = (ix1 - ix0 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const cx0 = ix0 + i * (cw + gap);
      add(box(ctx, cx0, cx0 + cw, baseTop - 1, seatTop, zf - 1.5, Zb - backT - 12, { color: c, tex: m, rTop: curved ? 10 : 6, rBottom: 3 }));
    }
  }

  // Arms
  if (aw > 0) {
    const armOpts: BoxOpts = {
      color: shade(c, -0.02),
      tex: m,
      rTop: arms === 'rolled' ? aw * 0.55 : arms === 'curved' ? aw * 0.9 : 3,
      rBottom: curved ? 8 : 2,
      slope: arms === 'sloped' ? 10 : 0,
    };
    // Draw the far-from-camera arm first so the nearer one overlaps correctly.
    const left = () => add(box(ctx, x0, x0 + aw, L, armTop, zf - (arms === 'rolled' ? 2 : 0), Zb, armOpts));
    const right = () => add(box(ctx, x1 - aw, x1, L, armTop, zf - (arms === 'rolled' ? 2 : 0), Zb, armOpts));
    if (X < 0) {
      left();
      right();
    } else {
      right();
      left();
    }
    if (arms === 'rolled') {
      for (const ax of [x0, x1 - aw]) {
        const [px, py] = P(ax + aw / 2, armTop - aw * 0.35, zf - 2);
        const r = P(ax + aw, 0, zf)[0] - P(ax, 0, zf)[0];
        els.push(<ellipse key={key(ctx)} cx={px} cy={py} rx={r * 0.32} ry={r * 0.28} fill={shade(c, -0.12)} opacity={0.5} />);
      }
    }
    if (ches) {
      for (const ax of [x0, x1 - aw]) {
        for (let yy = L + 10; yy < armTop - 10; yy += 14) {
          const [px, py] = P(ax + aw / 2, yy, zf - 2);
          els.push(<circle key={key(ctx)} cx={px} cy={py} r={2} fill={shade(c, -0.35)} opacity={0.7} />);
        }
      }
    }
  }

  // Decor cushions and throw
  if (decor) {
    const cs = decor.cushions.slice(0, 3);
    const zc = Zb - backT - 18;
    const spots = [x0 + aw + 4, x1 - aw - 46, x0 + aw + 40];
    cs.forEach((col, i) => {
      const cx0 = spots[i];
      if (cx0 == null || cx0 + 42 > x1 - aw + 2) return;
      const tl = P(cx0, seatTop + 40, zc);
      const br = P(cx0 + 42, seatTop - 1, zc);
      const rot = i === 1 ? 7 : -7;
      els.push(
        <path
          key={key(ctx)}
          d={roundRectPath(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], 10)}
          fill={col}
          transform={`rotate(${rot} ${(tl[0] + br[0]) / 2} ${(tl[1] + br[1]) / 2})`}
        />,
      );
      els.push(
        <path
          key={key(ctx)}
          d={roundRectPath(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], 10)}
          fill={`url(#${ctx.id}-cushionshade)`}
          transform={`rotate(${rot} ${(tl[0] + br[0]) / 2} ${(tl[1] + br[1]) / 2})`}
        />,
      );
    });
    if (decor.throwColor && aw > 0) {
      const tx0 = X < 0 ? x1 - aw - 4 : x0 - 2;
      const tl = P(tx0, armTop + 1, zf - 3);
      const br = P(tx0 + aw + 6, L + 8, zf - 3);
      els.push(<path key={key(ctx)} d={roundRectPath(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], 6, 2)} fill={decor.throwColor} opacity={0.95} />);
      for (let k = 1; k < 4; k++) {
        const xx = tl[0] + ((br[0] - tl[0]) * k) / 4;
        els.push(<line key={key(ctx)} x1={xx} y1={tl[1] + 6} x2={xx} y2={br[1]} stroke={shade(decor.throwColor, -0.2)} strokeWidth={1} opacity={0.5} />);
      }
    }
  }

  return { node: <>{els}</>, bbox: bboxOf(all) };
}

// ---------------- Coffee table ----------------

export function drawTable(ctx: Ctx, t: TableShape, X: number, Zc: number): Drawn {
  const els: ReactNode[] = [];
  const all: Pt[] = [];
  const add = (r: { els: ReactNode[]; pts: Pt[] }) => {
    els.push(...r.els);
    all.push(...r.pts);
  };
  const w = t.widthCm;
  const d = t.depthCm;
  const x0 = X - w / 2;
  const x1 = X + w / 2;
  const zf = Zc - d / 2;
  const zb = Zc + d / 2;
  const th = { stone: 5, wood: 4, glass: 1.5, metal: 2.5, rattan: 6 }[t.material as 'wood'] ?? 4;
  const top = t.heightCm;
  const glass = t.material === 'glass';
  const topColor = glass ? '#cfe0e3' : t.color;

  els.push(
    <polygon
      key={key(ctx)}
      points={pts(t.top === 'rect' ? floorQuad(x0 - 4, x1 + 4, zf - 4, zb + 4) : floorEllipse(X, Zc, w / 2 + 4, d / 2 + 4))}
      fill="#000"
      opacity={0.16}
      filter={`url(#${ctx.id}-blur8)`}
    />,
  );

  // Base
  const baseCol = t.legColor;
  if (t.base === 'four-legs') {
    const inset = t.top === 'rect' ? 6 : w * 0.18;
    const insetZ = t.top === 'rect' ? 6 : d * 0.18;
    const legs: [number, number][] = [
      [x0 + inset, zb - insetZ],
      [x1 - inset - 3.5, zb - insetZ],
      [x0 + inset, zf + insetZ],
      [x1 - inset - 3.5, zf + insetZ],
    ];
    legs.forEach(([lx, lz], i) => add(box(ctx, lx, lx + 3.5, 0, top - th, lz - 3.5, lz, { color: i < 2 ? shade(baseCol, -0.2) : baseCol })));
  } else if (t.base === 'pedestal') {
    const pw = Math.max(18, w * 0.32);
    const pd = Math.max(18, d * 0.32);
    els.push(<polygon key={key(ctx)} points={pts(floorEllipse(X, Zc, pw / 1.6, pd / 1.6, 0.5))} fill={shade(baseCol, -0.1)} />);
    add(box(ctx, X - pw / 2, X + pw / 2, 0, top - th, Zc - pd / 2, Zc + pd / 2, { color: baseCol, tex: t.material === 'glass' ? undefined : t.material, rTop: 2, rBottom: 2 }));
  } else if (t.base === 'sled') {
    for (const sx of [x0 + 3, x1 - 5.5]) {
      add(box(ctx, sx, sx + 2.5, 0, 2.5, zf + 2, zb - 2, { color: shade(baseCol, -0.1) }));
      add(box(ctx, sx, sx + 2.5, 0, top - th, zf + 2, zf + 4.5, { color: baseCol }));
    }
  } else {
    const ix = w * 0.12;
    const iz = d * 0.15;
    add(box(ctx, x0 + ix, x1 - ix, 0, top - th, zf + iz, zb - iz, { color: shade(t.color, -0.12), tex: t.material, rTop: 2, rBottom: 2 }));
  }

  // Top
  if (t.top === 'rect') {
    add(box(ctx, x0, x1, top - th, top, zf, zb, { color: topColor, tex: glass ? undefined : t.material, opacity: glass ? 0.55 : 1, rTop: 1 }));
  } else {
    const rx = w / 2;
    const rz = d / 2;
    const lower = floorEllipse(X, Zc, rx, rz, top - th);
    const upper = floorEllipse(X, Zc, rx, rz, top);
    all.push(...lower, ...upper);
    els.push(<polygon key={key(ctx)} points={pts(lower)} fill={shade(topColor, -0.18)} opacity={glass ? 0.6 : 1} />);
    els.push(<polygon key={key(ctx)} points={pts(upper)} fill={shade(topColor, 0.06)} opacity={glass ? 0.5 : 1} />);
    const tex = texFill(ctx, t.material);
    if (tex && !glass) els.push(<polygon key={key(ctx)} points={pts(upper)} fill={tex} />);
    if (glass) els.push(<polygon key={key(ctx)} points={pts(upper)} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1.2} />);
  }

  // A few objects on the table make it read as styled.
  const [bx, by] = P(X - w * 0.18, top, Zc);
  const s = P(X - w * 0.18 + 22, top, Zc)[0] - bx;
  els.push(<rect key={key(ctx)} x={bx - s / 2} y={by - s * 0.22} width={s} height={s * 0.22} rx={1.5} fill="#e9e3d6" />);
  els.push(<rect key={key(ctx)} x={bx - s * 0.45} y={by - s * 0.36} width={s * 0.9} height={s * 0.14} rx={1.5} fill="#5b5550" />);

  return { node: <>{els}</>, bbox: bboxOf(all) };
}

// ---------------- Rug ----------------

export function drawRug(ctx: Ctx, r: RugShape, X: number, Zc: number): Drawn {
  const els: ReactNode[] = [];
  const w = r.widthCm;
  const d = r.depthCm;
  const x0 = X - w / 2;
  const x1 = X + w / 2;
  const zf = Zc - d / 2;
  const zb = Zc + d / 2;
  const outline = r.shape === 'round' ? floorEllipse(X, Zc, w / 2, d / 2, 0.4, 64) : floorQuad(x0, x1, zf, zb, 0.4);
  const clip = `${ctx.id}-rugclip-${ctx.n++}`;
  els.push(
    <clipPath key={key(ctx)} id={clip}>
      <polygon points={pts(outline)} />
    </clipPath>,
  );
  els.push(<polygon key={key(ctx)} points={pts(outline)} fill={r.color} />);
  const tex = texFill(ctx, r.material);
  const pat: ReactNode[] = [];
  const acc = r.accent;
  const inset = (k: number) =>
    r.shape === 'round' ? floorEllipse(X, Zc, w / 2 - k, d / 2 - k, 0.4, 64) : floorQuad(x0 + k, x1 - k, zf + k, zb - k, 0.4);
  switch (r.pattern) {
    case 'border':
      pat.push(<polygon key={key(ctx)} points={pts(inset(10))} fill="none" stroke={acc} strokeWidth={7} />);
      pat.push(<polygon key={key(ctx)} points={pts(inset(20))} fill="none" stroke={acc} strokeWidth={2} opacity={0.8} />);
      break;
    case 'stripe':
      if (r.shape === 'round') {
        for (let k = 12; k < w / 2; k += 22) pat.push(<polygon key={key(ctx)} points={pts(inset(k))} fill="none" stroke={acc} strokeWidth={3} opacity={0.75} />);
      } else {
        for (let xx = x0 + 18; xx < x1; xx += 34) pat.push(<polygon key={key(ctx)} points={pts(floorQuad(xx, xx + 8, zf, zb, 0.4))} fill={acc} opacity={0.7} />);
      }
      break;
    case 'geometric':
      for (let xx = x0 - d; xx < x1 + d; xx += 36) {
        const a = P(xx, 0.4, zf);
        const b = P(xx + d, 0.4, zb);
        const c = P(xx + d, 0.4, zf);
        const e = P(xx, 0.4, zb);
        pat.push(<line key={key(ctx)} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={acc} strokeWidth={2.2} opacity={0.8} />);
        pat.push(<line key={key(ctx)} x1={c[0]} y1={c[1]} x2={e[0]} y2={e[1]} stroke={acc} strokeWidth={2.2} opacity={0.8} />);
      }
      break;
    case 'medallion':
      pat.push(<polygon key={key(ctx)} points={pts(inset(14))} fill="none" stroke={acc} strokeWidth={10} opacity={0.9} />);
      pat.push(<polygon key={key(ctx)} points={pts(floorEllipse(X, Zc, w * 0.18, d * 0.22, 0.4))} fill={acc} opacity={0.9} />);
      pat.push(<polygon key={key(ctx)} points={pts(floorEllipse(X, Zc, w * 0.1, d * 0.12, 0.4))} fill={shade(r.color, 0.2)} opacity={0.9} />);
      break;
    case 'solid':
      break;
  }
  els.push(
    <g key={key(ctx)} clipPath={`url(#${clip})`}>
      {tex && <polygon points={pts(outline)} fill={tex} />}
      {pat}
    </g>,
  );
  return { node: <>{els}</>, bbox: bboxOf(outline) };
}

// ---------------- Floor lamp ----------------

export function drawLamp(ctx: Ctx, l: LampShape, X: number, Z: number, glow: number): Drawn {
  const els: ReactNode[] = [];
  const all: Pt[] = [];
  const H = l.heightCm;
  const base = floorEllipse(X, Z, 15, 15, 0.5, 32);
  all.push(...base);
  const arc = l.shade === 'arc';
  const shadeH = { drum: 30, cone: 28, globe: 34, paper: 50, arc: 22 }[l.shade];
  const shadeX = arc ? X - 85 : X;
  const shadeBottomY = H - shadeH;
  els.push(<polygon key={key(ctx)} points={pts(floorEllipse(X, Z, 22, 22, 0, 32))} fill="#000" opacity={0.15} filter={`url(#${ctx.id}-blur8)`} />);

  // Glow
  const [gx, gy] = P(shadeX, shadeBottomY + shadeH / 2, Z);
  const gr = P(shadeX + 70, 0, Z)[0] - P(shadeX, 0, Z)[0];
  els.push(<circle key={key(ctx)} cx={gx} cy={gy} r={gr} fill={`url(#${ctx.id}-glow)`} opacity={glow} pointerEvents="none" />);

  if (l.shade === 'cone') {
    // tripod
    const apex = P(X, H - shadeH + 4, Z);
    for (const [dx, dz] of [[-22, -10], [22, -10], [0, 18]] as [number, number][]) {
      const foot = P(X + dx, 0, Z + dz);
      all.push(foot);
      els.push(<line key={key(ctx)} x1={apex[0]} y1={apex[1]} x2={foot[0]} y2={foot[1]} stroke={l.baseColor} strokeWidth={3} strokeLinecap="round" />);
    }
  } else {
    els.push(<polygon key={key(ctx)} points={pts(base)} fill={l.baseColor} />);
    const bottom = P(X, 0, Z);
    const top = P(X, arc ? H : shadeBottomY, Z);
    all.push(top);
    if (arc) {
      const end = P(shadeX, H - 6, Z);
      els.push(
        <path
          key={key(ctx)}
          d={`M${bottom[0]},${bottom[1]} L${top[0]},${top[1] + 40} Q${top[0] - 10},${top[1] - 30} ${end[0]},${end[1]}`}
          fill="none"
          stroke={l.baseColor}
          strokeWidth={3}
          strokeLinecap="round"
        />,
      );
      all.push(end);
    } else {
      els.push(<line key={key(ctx)} x1={bottom[0]} y1={bottom[1]} x2={top[0]} y2={top[1]} stroke={l.baseColor} strokeWidth={3} />);
    }
  }

  // Shade
  const sx = (cm: number) => P(shadeX + cm, 0, Z)[0] - P(shadeX, 0, Z)[0];
  const [cx, yb] = P(shadeX, shadeBottomY, Z);
  const yt = P(shadeX, shadeBottomY + shadeH, Z)[1];
  const fill = l.color;
  const lit = `url(#${ctx.id}-shadelight)`;
  let shapeNode: ReactNode;
  if (l.shade === 'drum' || l.shade === 'cone') {
    const rt = sx(l.shade === 'drum' ? 21 : 9);
    const rbt = sx(l.shade === 'drum' ? 23 : 25);
    const poly: Pt[] = [
      [cx - rt, yt],
      [cx + rt, yt],
      [cx + rbt, yb],
      [cx - rbt, yb],
    ];
    all.push(...poly);
    shapeNode = (
      <>
        <polygon points={pts(poly)} fill={fill} />
        <polygon points={pts(poly)} fill={lit} />
      </>
    );
  } else if (l.shade === 'globe') {
    const r = sx(17);
    all.push([cx - r, yt], [cx + r, yb]);
    shapeNode = (
      <>
        <circle cx={cx} cy={(yt + yb) / 2} r={r} fill={fill} />
        <circle cx={cx} cy={(yt + yb) / 2} r={r} fill={lit} />
      </>
    );
  } else if (l.shade === 'paper') {
    const r = sx(20);
    all.push([cx - r, yt], [cx + r, yb]);
    shapeNode = (
      <>
        <ellipse cx={cx} cy={(yt + yb) / 2} rx={r} ry={(yb - yt) / 2} fill={fill} />
        {[0.3, 0.5, 0.7].map((k) => (
          <line key={k} x1={cx - r * 0.95} y1={yt + (yb - yt) * k} x2={cx + r * 0.95} y2={yt + (yb - yt) * k} stroke={shade(fill, -0.15)} strokeWidth={0.8} />
        ))}
        <ellipse cx={cx} cy={(yt + yb) / 2} rx={r} ry={(yb - yt) / 2} fill={lit} />
      </>
    );
  } else {
    const r = sx(20);
    all.push([cx - r, yt], [cx + r, yb]);
    shapeNode = (
      <>
        <path d={`M${cx - r},${yb} Q${cx - r},${yt} ${cx},${yt} Q${cx + r},${yt} ${cx + r},${yb} Z`} fill={fill} />
        <ellipse cx={cx} cy={yb} rx={r} ry={r * 0.12} fill="#fff6dd" opacity={0.85} />
      </>
    );
  }
  els.push(<g key={key(ctx)}>{shapeNode}</g>);
  return { node: <>{els}</>, bbox: bboxOf(all) };
}

// ---------------- Dispatcher ----------------

/** Where each selectable piece sits in the sample room (cm, room coordinates). */
export const PLACEMENT = {
  sofa: { X: -20, Z: 645 },
  coffeeTable: { X: -20, Z: 478 },
  rug: { X: -20, Z: 525 },
  floorLamp: { X: 152, Z: 610 },
};

export function drawItem(ctx: Ctx, shape: ItemShape, opts: { glow?: number; decor?: Decor | null; at?: { X: number; Z: number } } = {}): Drawn {
  switch (shape.kind) {
    case 'sofa': {
      const p = opts.at ?? PLACEMENT.sofa;
      return drawSofa(ctx, shape, p.X, p.Z, opts.decor ?? null);
    }
    case 'coffeeTable': {
      const p = opts.at ?? PLACEMENT.coffeeTable;
      return drawTable(ctx, shape, p.X, p.Z);
    }
    case 'rug': {
      const p = opts.at ?? PLACEMENT.rug;
      return drawRug(ctx, shape, p.X, p.Z);
    }
    case 'floorLamp': {
      const p = opts.at ?? PLACEMENT.floorLamp;
      return drawLamp(ctx, shape, p.X, p.Z, opts.glow ?? 0.5);
    }
  }
}
