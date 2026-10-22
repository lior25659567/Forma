import { useState } from 'react';
import { dominantColors } from '../../lib/color';
import type { Design, StyleId } from '../../types';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { StylePicker } from '../Setup';

export function DesignBar({
  designs,
  activeId,
  candidates,
  viewingId,
  comparing,
  canGenerate,
  onSelect,
  onView,
  onNew,
  onCompare,
}: {
  designs: Design[];
  activeId: string;
  candidates: Design[];
  viewingId: string | null;
  comparing: boolean;
  canGenerate: boolean;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
  onNew: () => void;
  onCompare: (id: string | null) => void;
}) {
  const [pickCompare, setPickCompare] = useState(false);
  const others = designs.filter((d) => d.id !== activeId);
  return (
    <div className="design-bar" onClick={(e) => e.stopPropagation()}>
      <div className="design-chips" role="radiogroup" aria-label="Design options">
        {designs.map((d) => (
          <button
            key={d.id}
            role="radio"
            aria-checked={d.id === activeId && !viewingId}
            className={`dchip${d.id === activeId && !viewingId ? ' is-on' : ''}`}
            onClick={() => onSelect(d.id)}
          >
            {d.name}
          </button>
        ))}
        {candidates.length > 0 && <span className="dchip-sep">New</span>}
        {candidates.map((d) => (
          <button key={d.id} role="radio" aria-checked={d.id === viewingId} className={`dchip dchip-new${d.id === viewingId ? ' is-on' : ''}`} onClick={() => onView(d.id)}>
            {d.name}
          </button>
        ))}
      </div>
      <div className="design-actions">
        {others.length > 0 && (
          <div className="popover-wrap">
            <button className={`btn btn-sm${comparing ? ' is-on' : ''}`} aria-expanded={pickCompare} onClick={() => (comparing ? onCompare(null) : setPickCompare(!pickCompare))}>
              <Icon name="compare" size={16} /> {comparing ? 'Exit compare' : 'Compare'}
            </button>
            {pickCompare && !comparing && (
              <div className="popover popover-up" role="menu">
                <p className="muted small">Compare current design with</p>
                {others.map((d) => (
                  <button
                    key={d.id}
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setPickCompare(false);
                      onCompare(d.id);
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="btn btn-sm" onClick={onNew} disabled={!canGenerate} title={canGenerate ? undefined : 'Needs an image-generation service for uploaded photos'}>
          <Icon name="sparkle" size={16} /> New direction
        </button>
      </div>
    </div>
  );
}

export interface DirectionRequest {
  style: StyleId;
  inspirationColors: string[];
  strength: number;
}

async function imageColors(file: File): Promise<string[]> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = 80;
  c.height = Math.max(1, Math.round((80 * bmp.height) / bmp.width));
  const g = c.getContext('2d')!;
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return dominantColors(g.getImageData(0, 0, c.width, c.height).data, 4);
}

export function DirectionsDialog({ open, initialStyle, onClose, onGenerate }: { open: boolean; initialStyle: StyleId; onClose: () => void; onGenerate: (r: DirectionRequest) => void }) {
  const [style, setStyle] = useState<StyleId>(initialStyle);
  const [refs, setRefs] = useState<{ name: string; url: string; colors: string[] }[]>([]);
  const [strength, setStrength] = useState(50);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New design direction"
      size="lg"
      footer={
        <>
          <span className="muted small">Creates 3 versions of this room to preview. Your current design isn’t changed until you choose one.</span>
          <span className="grow" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onGenerate({ style, inspirationColors: refs.flatMap((r) => r.colors), strength: refs.length ? strength / 100 : 0 })}
          >
            Generate 3 versions
          </button>
        </>
      }
    >
      <StylePicker value={style} onChange={setStyle} />
      <fieldset className="field inspo">
        <legend>Inspiration images (optional)</legend>
        <div className="inspo-row">
          {refs.map((r, i) => (
            <figure key={r.url} className="inspo-thumb">
              <img src={r.url} alt={r.name} />
              <span className="swatches">
                {r.colors.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <button className="icon-btn" aria-label={`Remove ${r.name}`} onClick={() => setRefs(refs.filter((_, j) => j !== i))}>
                <Icon name="close" size={14} />
              </button>
            </figure>
          ))}
          <label className="btn btn-sm">
            <Icon name="plus" size={16} /> Add image
            <input
              type="file"
              accept="image/*"
              hidden
              multiple
              onChange={async (e) => {
                setErr(null);
                const files = [...(e.target.files ?? [])].slice(0, 4 - refs.length);
                e.target.value = '';
                try {
                  const added = await Promise.all(files.map(async (f) => ({ name: f.name, url: URL.createObjectURL(f), colors: await imageColors(f) })));
                  setRefs((r) => [...r, ...added]);
                } catch {
                  setErr('Couldn’t read one of those images.');
                }
              }}
            />
          </label>
        </div>
        {err && <p className="form-error">{err}</p>}
        {refs.length > 0 && (
          <label className="range-field">
            <span>Influence</span>
            <input type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(Number(e.target.value))} aria-valuetext={`${strength}%`} />
            <span className="muted small">{strength < 34 ? 'Subtle' : strength < 67 ? 'Balanced' : 'Strong'}</span>
          </label>
        )}
        <p className="muted small">In this build, reference images influence the colour palette only (extracted from the image in your browser).</p>
      </fieldset>
    </Dialog>
  );
}
