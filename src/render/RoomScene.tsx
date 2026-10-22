import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { SAMPLE_ROOM } from '../design/generate';
import { mix, shade } from '../lib/color';
import type { Category, Decor, Design, ItemShape, Mark, Room } from '../types';
import { CATEGORIES, CATEGORY_LABEL } from '../types';
import { drawItem, type Ctx } from './items';
import {
  BACK_Z,
  bboxOf,
  CEILING,
  floorEllipse,
  floorQuad,
  P,
  pts,
  ROOM_HALF_W,
  roundRectPath,
  VIEW_H,
  VIEW_W,
  type BBox,
  type Pt,
} from './projection';
import { SceneDefs } from './SceneDefs';

export const ACCENT = '#136f63';

export interface SceneOverride {
  category: Category;
  shape: ItemShape;
}

export interface SceneLayout {
  width: number;
  height: number;
  bboxes: Partial<Record<Category, BBox>>;
}

// ---------------- Architecture (fixed across designs) ----------------

function Architecture({ ctx, wall, floor, decor, lighting }: { ctx: Ctx; wall: string; floor: { type: string; color: string }; decor: Decor | null; lighting: Design['lighting'] }) {
  const W = ROOM_HALF_W;
  const back = [P(-W, CEILING, BACK_Z), P(W, CEILING, BACK_Z), P(W, 0, BACK_Z), P(-W, 0, BACK_Z)];
  const left = [P(-W, CEILING, BACK_Z), P(-W, CEILING, 100), P(-W, 0, 100), P(-W, 0, BACK_Z)];
  const right = [P(W, CEILING, BACK_Z), P(W, CEILING, 100), P(W, 0, 100), P(W, 0, BACK_Z)];
  const ceiling = [P(-W, CEILING, BACK_Z), P(W, CEILING, BACK_Z), P(W, CEILING, 100), P(-W, CEILING, 100)];
  const floorPoly = floorQuad(-W, W, 100, BACK_Z);
  const els: ReactNode[] = [];

  els.push(<polygon key="ceil" points={pts(ceiling)} fill={shade(wall, 0.05)} />);
  els.push(<polygon key="left" points={pts(left)} fill={shade(wall, -0.07)} />);
  els.push(<polygon key="right" points={pts(right)} fill={shade(wall, -0.03)} />);
  els.push(<polygon key="back" points={pts(back)} fill={wall} />);

  // Floor
  const fc = floor.color;
  els.push(<polygon key="floor" points={pts(floorPoly)} fill={fc} />);
  const lines: ReactNode[] = [];
  if (floor.type === 'concrete') {
    for (let z = 200; z < BACK_Z; z += 120) {
      const a = P(-W, 0, z);
      const b = P(W, 0, z);
      lines.push(<line key={`c${z}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={shade(fc, -0.12)} strokeWidth={1} opacity={0.5} />);
    }
  } else if (floor.type === 'terracotta') {
    for (let x = -W; x <= W; x += 30) {
      const a = P(x, 0, BACK_Z);
      const b = P(x, 0, 100);
      lines.push(<line key={`tx${x}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={shade(fc, 0.25)} strokeWidth={1.4} />);
    }
    for (let z = 110; z < BACK_Z; z += 30) {
      const a = P(-W, 0, z);
      const b = P(W, 0, z);
      lines.push(<line key={`tz${z}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={shade(fc, 0.25)} strokeWidth={1.2} />);
    }
  } else {
    for (let x = -W; x <= W; x += 19) {
      const a = P(x, 0, BACK_Z);
      const b = P(x, 0, 100);
      lines.push(<line key={`p${x}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={shade(fc, -0.18)} strokeWidth={0.9} opacity={0.6} />);
      // staggered plank joints
      for (let z = 130 + ((x * 37) % 90 + 90) % 90; z < BACK_Z; z += 160) {
        const c = P(x, 0, z);
        const d = P(x + 19, 0, z);
        lines.push(<line key={`j${x}-${z}`} x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} stroke={shade(fc, -0.18)} strokeWidth={0.8} opacity={0.5} />);
      }
    }
  }
  els.push(<g key="floorlines">{lines}</g>);

  // Baseboards
  const bb = (a: Pt[]) => <polygon points={pts(a)} fill={shade(wall, 0.08)} />;
  els.push(<g key="base">{bb([P(-W, 9, BACK_Z), P(W, 9, BACK_Z), P(W, 0, BACK_Z), P(-W, 0, BACK_Z)])}{bb([P(-W, 9, BACK_Z), P(-W, 9, 100), P(-W, 0, 100), P(-W, 0, BACK_Z)])}{bb([P(W, 9, BACK_Z), P(W, 9, 100), P(W, 0, 100), P(W, 0, BACK_Z)])}</g>);

  // Window (fixed)
  const wx0 = -112;
  const wx1 = 78;
  const wy0 = 96;
  const wy1 = 206;
  const tl = P(wx0, wy1, BACK_Z);
  const br = P(wx1, wy0, BACK_Z);
  const fw = br[0] - tl[0];
  const fh = br[1] - tl[1];
  els.push(
    <g key="window">
      <rect x={tl[0] - 8} y={tl[1] - 8} width={fw + 16} height={fh + 16} fill={shade(wall, 0.12)} />
      <rect x={tl[0]} y={tl[1]} width={fw} height={fh} fill={`url(#${ctx.id}-sky)`} />
      <path d={`M${tl[0]},${tl[1] + fh * 0.78} q${fw * 0.2},${-fh * 0.18} ${fw * 0.45},${-fh * 0.06} t${fw * 0.55},${-fh * 0.02} V${br[1]} H${tl[0]}z`} fill="#a9b79c" opacity={0.55} />
      <rect x={tl[0] + fw / 2 - 3} y={tl[1]} width={6} height={fh} fill="#f6f4ef" />
      <rect x={tl[0]} y={tl[1] + fh * 0.42} width={fw} height={5} fill="#f6f4ef" />
      <rect x={tl[0]} y={tl[1]} width={fw} height={fh} fill="none" stroke="#f6f4ef" strokeWidth={6} />
      <rect x={tl[0] - 14} y={br[1] + 2} width={fw + 28} height={8} fill={shade(wall, 0.15)} />
    </g>,
  );

  // Curtains
  if (decor?.curtains) {
    const c = decor.curtains;
    for (const [x0, x1] of [
      [wx0 - 34, wx0 + 4],
      [wx1 - 4, wx1 + 34],
    ]) {
      const a = P(x0, 220, BACK_Z - 6);
      const b = P(x1, 1, BACK_Z - 6);
      const w = b[0] - a[0];
      els.push(
        <g key={`cur${x0}`}>
          <rect x={a[0]} y={a[1]} width={w} height={b[1] - a[1]} fill={c} opacity={0.94} />
          {[0.2, 0.45, 0.7].map((k) => (
            <rect key={k} x={a[0] + w * k} y={a[1]} width={w * 0.1} height={b[1] - a[1]} fill={shade(c, -0.12)} opacity={0.6} />
          ))}
        </g>,
      );
    }
    const r0 = P(wx0 - 40, 222, BACK_Z - 6);
    const r1 = P(wx1 + 40, 222, BACK_Z - 6);
    els.push(<line key="rod" x1={r0[0]} y1={r0[1]} x2={r1[0]} y2={r1[1]} stroke="#3a3632" strokeWidth={2.5} />);
  }

  // Door on the right wall (fixed)
  const door = [P(W, 205, 575), P(W, 205, 480), P(W, 0, 480), P(W, 0, 575)];
  const frame = [P(W, 212, 582), P(W, 212, 473), P(W, 0, 473), P(W, 0, 582)];
  const handle = P(W, 100, 490);
  els.push(
    <g key="door">
      <polygon points={pts(frame)} fill={shade(wall, 0.12)} />
      <polygon points={pts(door)} fill={shade(wall, -0.1)} />
      <circle cx={handle[0] - 3} cy={handle[1]} r={4} fill="#5a544d" />
    </g>,
  );

  // Daylight falling on the floor from the window
  els.push(
    <polygon
      key="daylight"
      points={pts(floorQuad(wx0 - 10, wx1 + 30, 470, BACK_Z - 5))}
      fill="#fffaf0"
      opacity={0.1 + lighting.brightness * 0.12}
      filter={`url(#${ctx.id}-blur20)`}
    />,
  );
  return <g aria-hidden="true">{els}</g>;
}

// ---------------- Decor (not selectable) ----------------

function WallArt({ decor }: { decor: Decor }) {
  if (decor.wallArt === 'none') return null;
  const tl = P(-196, 186, BACK_Z);
  const br = P(-132, 120, BACK_Z);
  const w = br[0] - tl[0];
  const h = br[1] - tl[1];
  const [a, b] = decor.artColors;
  const frame = '#2d2a26';
  let inner: ReactNode = null;
  switch (decor.wallArt) {
    case 'abstract':
      inner = (
        <>
          <rect x={tl[0]} y={tl[1]} width={w} height={h} fill="#f3efe7" />
          <circle cx={tl[0] + w * 0.38} cy={tl[1] + h * 0.42} r={w * 0.24} fill={a} />
          <rect x={tl[0] + w * 0.45} y={tl[1] + h * 0.5} width={w * 0.38} height={h * 0.32} fill={b} />
        </>
      );
      break;
    case 'botanical':
      inner = (
        <>
          <rect x={tl[0]} y={tl[1]} width={w} height={h} fill="#f5f2ea" />
          <path d={`M${tl[0] + w / 2},${tl[1] + h * 0.88} Q${tl[0] + w * 0.1},${tl[1] + h * 0.45} ${tl[0] + w / 2},${tl[1] + h * 0.1} Q${tl[0] + w * 0.9},${tl[1] + h * 0.45} ${tl[0] + w / 2},${tl[1] + h * 0.88}`} fill={a} />
          <line x1={tl[0] + w / 2} y1={tl[1] + h * 0.15} x2={tl[0] + w / 2} y2={tl[1] + h * 0.9} stroke={b} strokeWidth={1.5} />
        </>
      );
      break;
    case 'grid':
      inner = (
        <>
          <rect x={tl[0]} y={tl[1]} width={w} height={h} fill="#f3efe7" />
          {[0, 1].map((i) =>
            [0, 1].map((j) => <rect key={`${i}${j}`} x={tl[0] + w * (0.1 + i * 0.45)} y={tl[1] + h * (0.1 + j * 0.45)} width={w * 0.35} height={h * 0.35} fill={(i + j) % 2 ? a : b} />),
          )}
        </>
      );
      break;
    case 'arch':
      inner = (
        <>
          <rect x={tl[0]} y={tl[1]} width={w} height={h} fill="#f5efe4" />
          <path d={`M${tl[0] + w * 0.22},${tl[1] + h * 0.88} V${tl[1] + h * 0.45} A${w * 0.28},${w * 0.28} 0 0 1 ${tl[0] + w * 0.78},${tl[1] + h * 0.45} V${tl[1] + h * 0.88}Z`} fill={a} />
          <circle cx={tl[0] + w * 0.66} cy={tl[1] + h * 0.3} r={w * 0.08} fill={b} />
        </>
      );
      break;
    case 'sunburst': {
      const cx = tl[0] + w / 2;
      const cy = tl[1] + h / 2;
      const r = Math.min(w, h) * 0.5;
      return (
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const ang = (i / 16) * Math.PI * 2;
            return <line key={i} x1={cx + Math.cos(ang) * r * 0.45} y1={cy + Math.sin(ang) * r * 0.45} x2={cx + Math.cos(ang) * r} y2={cy + Math.sin(ang) * r} stroke={a} strokeWidth={2.5} />;
          })}
          <circle cx={cx} cy={cy} r={r * 0.42} fill={b} stroke={a} strokeWidth={3} />
          <circle cx={cx} cy={cy} r={r * 0.32} fill="#dfe6ea" opacity={0.7} />
        </g>
      );
    }
  }
  return (
    <g>
      <rect x={tl[0] - 4} y={tl[1] - 4} width={w + 8} height={h + 8} fill={frame} />
      {inner}
    </g>
  );
}

function Pendant({ decor }: { decor: Decor }) {
  if (decor.pendant === 'none') return null;
  const X = -20;
  const Z = 505;
  const top = P(X, CEILING, Z);
  const y = 168;
  const [cx, cy] = P(X, y, Z);
  const r = P(X + 22, y, Z)[0] - cx;
  let shapeNode: ReactNode;
  switch (decor.pendant) {
    case 'globe':
      shapeNode = <circle cx={cx} cy={cy + r * 0.8} r={r * 0.85} fill="#f7f1e3" stroke="#d9cfbd" />;
      break;
    case 'dome':
      shapeNode = <path d={`M${cx - r},${cy + r * 0.6} Q${cx - r},${cy - r * 0.2} ${cx},${cy - r * 0.2} Q${cx + r},${cy - r * 0.2} ${cx + r},${cy + r * 0.6}Z`} fill="#2d2a26" />;
      break;
    case 'rattan':
      shapeNode = (
        <g>
          <ellipse cx={cx} cy={cy + r * 0.5} rx={r * 1.1} ry={r * 0.75} fill="#c9a272" />
          <ellipse cx={cx} cy={cy + r * 0.5} rx={r * 1.1} ry={r * 0.75} fill="none" stroke="#9c7a4f" strokeDasharray="3 3" />
        </g>
      );
      break;
    case 'linear':
      shapeNode = <rect x={cx - r * 2.4} y={cy} width={r * 4.8} height={r * 0.35} rx={r * 0.17} fill="#2d2a26" />;
      break;
  }
  return (
    <g>
      <line x1={top[0]} y1={Math.max(0, top[1])} x2={cx} y2={cy} stroke="#3a3632" strokeWidth={1.2} />
      {decor.pendant === 'linear' && <line x1={top[0] - r * 2} y1={Math.max(0, top[1])} x2={cx - r * 2} y2={cy} stroke="#3a3632" strokeWidth={1.2} />}
      {shapeNode}
    </g>
  );
}

function Plant({ decor }: { decor: Decor }) {
  if (decor.plant === 'none') return null;
  const X = -168;
  const Z = 420;
  const potTop = P(X - 20, 42, Z);
  const potBot = P(X + 20, 0, Z);
  const pw = potBot[0] - potTop[0];
  const s = pw / 40;
  const [cx, base] = P(X, 42, Z);
  const leaves: ReactNode[] = [];
  const green = decor.plant === 'olive' ? '#7f8c6a' : '#3f6b45';
  if (decor.plant === 'fiddle') {
    const spots: [number, number, number][] = [
      [-20, 95, -30], [18, 110, 25], [-8, 140, -10], [24, 150, 35], [-26, 160, -40], [4, 185, 5], [-14, 120, -20], [12, 80, 20],
    ];
    leaves.push(<line key="stem" x1={cx} y1={base} x2={cx} y2={base - 170 * s} stroke="#4b3a2b" strokeWidth={3} />);
    spots.forEach(([dx, dy, rot], i) => leaves.push(<ellipse key={i} cx={cx + dx * s} cy={base - dy * s} rx={13 * s} ry={20 * s} fill={i % 2 ? green : shade(green, 0.12)} transform={`rotate(${rot} ${cx + dx * s} ${base - dy * s})`} />));
  } else if (decor.plant === 'olive') {
    leaves.push(<path key="trunk" d={`M${cx},${base} q${-6 * s},${-60 * s} ${4 * s},${-110 * s}`} stroke="#5a4a3a" strokeWidth={3} fill="none" />);
    for (let i = 0; i < 70; i++) {
      const a = (i * 137.5 * Math.PI) / 180;
      const rr = Math.sqrt(i / 70) * 45 * s;
      leaves.push(<ellipse key={i} cx={cx + 4 * s + Math.cos(a) * rr} cy={base - 135 * s + Math.sin(a) * rr * 0.8} rx={2.5 * s} ry={6 * s} fill={i % 3 ? green : shade(green, 0.2)} transform={`rotate(${(i * 47) % 180} ${cx + 4 * s + Math.cos(a) * rr} ${base - 135 * s + Math.sin(a) * rr * 0.8})`} />);
    }
  } else if (decor.plant === 'palm') {
    for (let i = 0; i < 7; i++) {
      const ang = -150 + i * 20;
      const len = (62 + (i % 3) * 12) * s;
      const ex = cx + Math.cos((ang * Math.PI) / 180) * len;
      const ey = base - 70 * s + Math.sin((ang * Math.PI) / 180) * len;
      leaves.push(<path key={i} d={`M${cx},${base} L${cx},${base - 70 * s} Q${(cx + ex) / 2},${ey - 20 * s} ${ex},${ey}`} stroke={shade(green, (i % 2) * 0.1)} strokeWidth={6 * s} fill="none" strokeLinecap="round" strokeDasharray={`${2.5 * s} ${1.2 * s}`} />);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const dx = (i - 4) * 5 * s;
      const h = (100 + ((i * 29) % 50)) * s;
      leaves.push(<path key={i} d={`M${cx + dx - 5 * s},${base} Q${cx + dx * 1.6},${base - h * 0.6} ${cx + dx * 1.3},${base - h} Q${cx + dx * 1.6 + 6 * s},${base - h * 0.6} ${cx + dx + 5 * s},${base}Z`} fill={i % 2 ? '#3d6447' : '#5a7d4f'} />);
    }
  }
  return (
    <g aria-hidden="true">
      <polygon points={pts(floorEllipse(X, Z, 32, 32, 0, 24))} fill="#000" opacity={0.15} />
      {leaves}
      <path d={roundRectPath(potTop[0], potTop[1], pw, potBot[1] - potTop[1], 4, 10)} fill={decor.planter} />
      <rect x={potTop[0]} y={potTop[1]} width={pw} height={6} fill={shade(decor.planter, -0.15)} />
    </g>
  );
}

function Armchair({ decor, ctx }: { decor: Decor; ctx: Ctx }) {
  if (!decor.armchair) return null;
  const { color, style } = decor.armchair;
  const X = 150;
  const Z0 = 400;
  const Z1 = 475;
  const w = 72;
  const x0 = X - w / 2;
  const x1 = X + w / 2;
  const els: ReactNode[] = [];
  const quad = (a: Pt[], fill: string, k: string) => <polygon key={k} points={pts(a)} fill={fill} />;
  const legH = style === 'lounge' || style === 'sling' ? 14 : 8;
  els.push(<polygon key="sh" points={pts(floorQuad(x0 - 4, x1 + 4, Z0 - 4, Z1))} fill="#000" opacity={0.18} filter={`url(#${ctx.id}-blur8)`} />);
  const backH = style === 'wingback' ? 105 : style === 'rattan' ? 80 : 72;
  // back
  els.push(quad([P(x0, backH, Z1), P(x1, backH, Z1), P(x1, legH, Z1), P(x0, legH, Z1)], shade(color, -0.04), 'back'));
  // seat
  els.push(quad([P(x0, 42, Z1 - 12), P(x1, 42, Z1 - 12), P(x1, 42, Z0), P(x0, 42, Z0)], shade(color, 0.1), 'seattop'));
  const sf1 = P(x0, 42, Z0);
  const sf2 = P(x1, legH, Z0);
  els.push(<path key="seatfront" d={roundRectPath(sf1[0], sf1[1], sf2[0] - sf1[0], sf2[1] - sf1[1], 6, 3)} fill={color} />);
  // arms
  const armTop = style === 'wingback' ? 64 : 58;
  for (const ax of [x0, x1 - 10]) {
    const t1 = P(ax, armTop, Z0);
    const b1 = P(ax + 10, legH, Z0);
    els.push(<path key={`arm${ax}`} d={roundRectPath(t1[0], t1[1], b1[0] - t1[0], b1[1] - t1[1], style === 'rattan' ? 10 : 6, 2)} fill={shade(color, -0.06)} />);
  }
  if (x0 > 0) els.push(quad([P(x0, armTop, Z1), P(x0, armTop, Z0), P(x0, legH, Z0), P(x0, legH, Z1)], shade(color, -0.18), 'side'));
  if (style === 'rattan') {
    const bb = bboxOf([P(x0, backH, Z1), P(x1, legH, Z0)]);
    els.push(<rect key="weave" x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={`url(#${ctx.id}-tex-rattan)`} opacity={0.7} />);
  }
  // legs
  for (const lx of [x0 + 4, x1 - 7]) {
    const t1 = P(lx, legH, Z0 + 3);
    const b1 = P(lx + 3, 0, Z0 + 3);
    els.push(<rect key={`leg${lx}`} x={t1[0]} y={t1[1]} width={Math.max(2, b1[0] - t1[0])} height={b1[1] - t1[1]} fill={style === 'sling' ? '#1f1f20' : '#4a3b30'} />);
  }
  return <g aria-hidden="true">{els}</g>;
}

function Lighting({ lighting }: { lighting: Design['lighting'] }) {
  const tint = mix('#cfe0ff', '#ffc47a', lighting.warmth);
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect width={VIEW_W} height={VIEW_H} fill={tint} opacity={0.16} style={{ mixBlendMode: 'soft-light' }} />
      <rect width={VIEW_W} height={VIEW_H} fill="#1a1410" opacity={(1 - lighting.brightness) * 0.32} style={{ mixBlendMode: 'multiply' }} />
    </g>
  );
}

// ---------------- Photo rooms ----------------

/** Draws a product into a user-marked region of an uploaded photo. */
function PhotoOverlay({ ctx, mark, shape, width, height }: { ctx: Ctx; mark: Mark; shape: ItemShape; width: number; height: number }) {
  const R = { x: mark.rect.x * width, y: mark.rect.y * height, w: mark.rect.w * width, h: mark.rect.h * height };
  const drawn = drawItem(ctx, shape, { at: { X: 0, Z: 600 }, glow: 0.4 });
  const b = drawn.bbox;
  let targetW = R.w;
  if (mark.currentWidthCm && 'widthCm' in shape) targetW = (R.w * shape.widthCm) / mark.currentWidthCm;
  let scale = targetW / Math.max(1, b.w);
  if (shape.kind === 'floorLamp') scale = R.h / Math.max(1, b.h);
  const tx = R.x + R.w / 2 - (b.x + b.w / 2) * scale;
  const ty = R.y + R.h - (b.y + b.h) * scale;
  const gid = `${ctx.id}-patch-${mark.id}`;
  return (
    <g>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mark.patch.top} />
        <stop offset="1" stopColor={mark.patch.bottom} />
      </linearGradient>
      <rect x={R.x - R.w * 0.03} y={R.y - R.h * 0.04} width={R.w * 1.06} height={R.h * 1.08} fill={`url(#${gid})`} filter={`url(#${ctx.id}-patchblur)`} />
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>{drawn.node}</g>
    </g>
  );
}

// ---------------- Scene ----------------

export interface Interaction {
  selectable: Category[];
  hovered: Category | null;
  selected: Category | null;
  focusable: boolean;
  onHover: (c: Category | null) => void;
  onSelect: (c: Category | null) => void;
}

export interface RoomSceneProps {
  room: Room;
  design: Design;
  photoUrl?: string | null;
  override?: SceneOverride | null;
  idPrefix: string;
  interaction?: Interaction;
  className?: string;
  title?: string;
}

export function sceneSize(room: Room) {
  if (room.source.kind === 'photo') return { width: VIEW_W, height: Math.round((VIEW_W * room.source.height) / room.source.width) };
  return { width: VIEW_W, height: VIEW_H };
}

function shapeFor(design: Design, c: Category, override?: SceneOverride | null): ItemShape | null {
  if (override && override.category === c) return override.shape;
  return design.items[c]?.shape ?? null;
}

export function useSceneLayout(room: Room, design: Design, override?: SceneOverride | null): SceneLayout {
  return useMemo(() => {
    const { width, height } = sceneSize(room);
    const bboxes: SceneLayout['bboxes'] = {};
    if (room.source.kind === 'photo') {
      for (const m of room.marks) bboxes[m.category] = { x: m.rect.x * width, y: m.rect.y * height, w: m.rect.w * width, h: m.rect.h * height };
    } else {
      const ctx: Ctx = { id: 'layout', n: 0 };
      for (const c of CATEGORIES) {
        const s = shapeFor(design, c, override);
        if (s) bboxes[c] = drawItem(ctx, s, { decor: design.decor }).bbox;
      }
    }
    return { width, height, bboxes };
  }, [room, design, override]);
}

export function RoomScene({ room, design, photoUrl, override, idPrefix, interaction, className, title }: RoomSceneProps) {
  const ctx: Ctx = { id: idPrefix, n: 0 };
  const { width, height } = sceneSize(room);
  const ix = interaction;

  const itemProps = (c: Category) => {
    if (!ix || !ix.selectable.includes(c)) return { 'aria-hidden': true as const };
    return {
      role: 'button',
      tabIndex: ix.focusable ? 0 : -1,
      'aria-label': `${CATEGORY_LABEL[c]}${ix.selected === c ? ' (selected)' : ''}`,
      'aria-pressed': ix.selected === c,
      className: 'scene-item',
      onPointerEnter: () => ix.onHover(c),
      onPointerLeave: () => ix.onHover(null),
      onFocus: () => ix.onHover(c),
      onBlur: () => ix.onHover(null),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        ix.onSelect(c);
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ix.onSelect(c);
        }
      },
    };
  };

  let body: ReactNode;
  if (room.source.kind === 'photo') {
    const marks = room.marks;
    body = (
      <>
        {photoUrl ? <image href={photoUrl} x={0} y={0} width={width} height={height} preserveAspectRatio="none" /> : <rect width={width} height={height} fill="#ddd" />}
        {marks.map((m) => {
          const s = shapeFor(design, m.category, override);
          const it = design.items[m.category];
          const replaced = (override && override.category === m.category) || (it?.source.type === 'product' && !it.inImage);
          return replaced && s ? <PhotoOverlay key={`ov-${m.id}`} ctx={ctx} mark={m} shape={s} width={width} height={height} /> : null;
        })}
        {marks.map((m) => {
          const R = { x: m.rect.x * width, y: m.rect.y * height, w: m.rect.w * width, h: m.rect.h * height };
          const hot = ix && (ix.hovered === m.category || ix.selected === m.category);
          return (
            <g key={`hit-${m.id}`} {...itemProps(m.category)}>
              <rect x={R.x} y={R.y} width={R.w} height={R.h} fill="transparent" />
              {hot && (
                <rect
                  x={R.x}
                  y={R.y}
                  width={R.w}
                  height={R.h}
                  rx={6}
                  fill="none"
                  stroke={ix!.selected === m.category ? ACCENT : '#ffffff'}
                  strokeWidth={ix!.selected === m.category ? 4 : 2.5}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </>
    );
  } else {
    const wall = design.wallColor ?? SAMPLE_ROOM.wallColor;
    const floor = design.floor ?? SAMPLE_ROOM.floor;
    const glow = 0.25 + (1 - design.lighting.brightness) * 0.9;
    const item = (c: Category) => {
      const s = shapeFor(design, c, override);
      if (!s) return null;
      const d = drawItem(ctx, s, { decor: c === 'sofa' ? design.decor : null, glow });
      return (
        <g key={c} id={`${idPrefix}-item-${c}`} {...itemProps(c)}>
          {d.node}
        </g>
      );
    };
    const outline = (c: Category | null, kind: 'hover' | 'selected') =>
      c && ix?.selectable.includes(c) && shapeFor(design, c, override) ? (
        <use href={`#${idPrefix}-item-${c}`} filter={`url(#${idPrefix}-outline-${kind})`} pointerEvents="none" />
      ) : null;
    body = (
      <>
        <Architecture ctx={ctx} wall={wall} floor={floor} decor={design.decor} lighting={design.lighting} />
        {design.decor && <WallArt decor={design.decor} />}
        {item('rug')}
        {item('floorLamp')}
        {item('sofa')}
        {design.decor && <Armchair decor={design.decor} ctx={ctx} />}
        {item('coffeeTable')}
        {design.decor && <Pendant decor={design.decor} />}
        {design.decor && <Plant decor={design.decor} />}
        <Lighting lighting={design.lighting} />
        <rect width={VIEW_W} height={VIEW_H} fill={`url(#${idPrefix}-vignette)`} pointerEvents="none" />
        {ix && ix.hovered !== ix.selected && outline(ix.hovered, 'hover')}
        {ix && outline(ix.selected, 'selected')}
      </>
    );
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role={ix ? 'group' : title ? 'img' : undefined}
      aria-label={title}
      onClick={ix ? () => ix.onSelect(null) : undefined}
    >
      <SceneDefs id={idPrefix} accent={ACCENT} />
      {body}
    </svg>
  );
}
