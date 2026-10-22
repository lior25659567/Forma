import { useRef, useState, type ReactNode } from 'react';
import { RoomScene, sceneSize, useSceneLayout, type Interaction, type SceneOverride } from '../../render/RoomScene';
import type { Category, Design, Room } from '../../types';
import { CATEGORY_LABEL } from '../../types';

export interface CompareSpec {
  before: { design: Design; override?: SceneOverride | null; label: string };
  after: { design: Design; override?: SceneOverride | null; label: string };
}

export interface CanvasProps {
  room: Room;
  design: Design;
  photoUrl: string | null;
  override: SceneOverride | null;
  compare: CompareSpec | null;
  interaction: Interaction | null;
  progress: { category: Category; value: number; onCancel: () => void } | null;
  marking: boolean;
  onMarked: (rect: { x: number; y: number; w: number; h: number }) => void;
  children?: ReactNode;
  banner?: ReactNode;
}

function MarkLayer({ onMarked }: { onMarked: CanvasProps['onMarked'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [cur, setCur] = useState<{ x: number; y: number } | null>(null);
  const rel = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const rect = start && cur ? { x: Math.min(start.x, cur.x), y: Math.min(start.y, cur.y), w: Math.abs(cur.x - start.x), h: Math.abs(cur.y - start.y) } : null;
  return (
    <div
      ref={ref}
      className="mark-layer"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const p = rel(e);
        setStart(p);
        setCur(p);
      }}
      onPointerMove={(e) => start && setCur(rel(e))}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (rect && rect.w > 0.03 && rect.h > 0.03) onMarked(rect);
        setStart(null);
        setCur(null);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {rect && <div className="mark-rect" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }} />}
      {!rect && <p className="mark-hint">Drag a box around the piece of furniture</p>}
    </div>
  );
}

export function Canvas(props: CanvasProps) {
  const { room, design, photoUrl, override, compare, interaction, progress } = props;
  const { width, height } = sceneSize(room);
  const layout = useSceneLayout(room, design, override);
  const [pos, setPos] = useState(50);
  const ratio = width / height;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const hovered = interaction?.hovered;
  const hoverBox = hovered && hovered !== interaction?.selected ? layout.bboxes[hovered] : null;
  const progBox = progress ? layout.bboxes[progress.category] : null;

  return (
    <div className="stage" onClick={() => interaction?.onSelect(null)}>
      {props.banner}
      <div className="stage-area">
      <div className="frame" style={{ width: `min(100cqw, calc(100cqh * ${ratio}))`, aspectRatio: `${width} / ${height}` }}>
        {compare ? (
          <>
            <RoomScene room={room} design={compare.after.design} override={compare.after.override} photoUrl={photoUrl} idPrefix="cmpA" className="scene" title={compare.after.label} />
            <div className="compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
              <RoomScene room={room} design={compare.before.design} override={compare.before.override} photoUrl={photoUrl} idPrefix="cmpB" className="scene" title={compare.before.label} />
            </div>
            <div className="compare-line" style={{ left: `${pos}%` }} aria-hidden="true">
              <span />
            </div>
            <span className="compare-tag left">{compare.before.label}</span>
            <span className="compare-tag right">{compare.after.label}</span>
            <input
              className="compare-range"
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Comparison slider: ${compare.before.label} on the left, ${compare.after.label} on the right`}
            />
          </>
        ) : (
          <RoomScene
            room={room}
            design={design}
            override={override}
            photoUrl={photoUrl}
            idPrefix="main"
            className="scene"
            interaction={interaction ?? undefined}
            title="Room"
          />
        )}

        {hoverBox && hovered && !compare && (
          <span className="item-label" style={{ left: pct(hoverBox.x + hoverBox.w / 2, width), top: pct(Math.max(0, hoverBox.y), height) }}>
            {CATEGORY_LABEL[hovered]}
          </span>
        )}

        {progress && progBox && (
          <div
            className="progress-pill"
            role="status"
            style={{ left: pct(progBox.x + progBox.w / 2, width), top: pct(progBox.y + progBox.h / 2, height) }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="spinner" aria-hidden="true" />
            Rendering preview… {Math.round(progress.value)}%
            <button className="link-btn" onClick={progress.onCancel}>
              Cancel
            </button>
          </div>
        )}

        {props.marking && <MarkLayer onMarked={props.onMarked} />}
      </div>
      </div>
      <div className="stage-bottom">{props.children}</div>
    </div>
  );
}
