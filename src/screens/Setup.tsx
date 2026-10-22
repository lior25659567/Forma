import { useState } from 'react';
import { STYLES } from '../design/styles';
import type { Category, Preferences, Room, RoomDims, StyleId } from '../types';
import { CATEGORY_LABEL } from '../types';
import { Dialog } from '../ui/Dialog';

export interface SetupResult {
  preferences: Preferences;
  budgetIls: number;
  dims: RoomDims;
}

const PRESETS = [8000, 15000, 25000, 40000];

export function StylePicker({ value, onChange }: { value: StyleId; onChange: (s: StyleId) => void }) {
  return (
    <div className="style-grid" role="radiogroup" aria-label="Style">
      {STYLES.map((s) => (
        <button
          key={s.id}
          role="radio"
          aria-checked={value === s.id}
          className={`style-opt${value === s.id ? ' is-on' : ''}`}
          onClick={() => onChange(s.id)}
        >
          <span className="swatches" aria-hidden="true">
            {s.swatch.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          <b>{s.name}</b>
          <small>{s.blurb}</small>
        </button>
      ))}
    </div>
  );
}

export function Setup({ room, open, onCancel, onDone }: { room: Room; open: boolean; onCancel: () => void; onDone: (r: SetupResult) => void }) {
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<StyleId>(room.preferences.style);
  const [budget, setBudget] = useState(room.budget.totalIls);
  const [keep, setKeep] = useState<Category[]>(room.preferences.keep);
  const [floorChange, setFloorChange] = useState(room.preferences.changeFlooring);
  const [wallChange, setWallChange] = useState(room.preferences.changeWalls);
  const [wall, setWall] = useState<string>(room.dims.sofaWallCm?.toString() ?? '');
  const isSample = room.source.kind === 'sample';
  const original = room.designs.find((d) => d.style === 'original');
  const keepable = (Object.keys(original?.items ?? {}) as Category[]).filter(() => isSample);
  const budgetOk = budget >= 1000;

  const finish = () =>
    onDone({
      preferences: { style, keep, changeFlooring: floorChange, changeWalls: wallChange },
      budgetIls: budget,
      dims: { ...room.dims, sofaWallCm: wall ? Math.max(50, Number(wall)) : null, confirmed: !!wall },
    });

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={step === 0 ? 'Choose a style' : 'Budget and what stays'}
      size="lg"
      footer={
        <>
          <span className="step-dots" aria-label={`Step ${step + 1} of 2`}>
            <i className={step === 0 ? 'on' : ''} />
            <i className={step === 1 ? 'on' : ''} />
          </span>
          <span className="grow" />
          {step === 1 && (
            <button className="btn" onClick={() => setStep(0)}>
              Back
            </button>
          )}
          {step === 0 ? (
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Continue
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={!budgetOk}>
              {isSample ? 'Generate 3 designs' : 'Open room'}
            </button>
          )}
        </>
      }
    >
      {step === 0 ? (
        <>
          <p className="muted">You can try other styles later. Walls, windows, doors and the camera angle always stay as they are.</p>
          <StylePicker value={style} onChange={setStyle} />
        </>
      ) : (
        <div className="setup-grid">
          <label className="field">
            <span>Total budget for this room</span>
            <div className="money-input">
              <span>₪</span>
              <input
                type="number"
                inputMode="numeric"
                min={1000}
                step={500}
                value={budget || ''}
                onChange={(e) => setBudget(Number(e.target.value))}
                aria-describedby="budget-hint"
              />
            </div>
            <div className="chips">
              {PRESETS.map((p) => (
                <button key={p} type="button" className={`chip${budget === p ? ' is-on' : ''}`} onClick={() => setBudget(p)}>
                  ₪{(p / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
            <small id="budget-hint" className="muted">
              Includes delivery and assembly where stores list them. You can adjust per item later.
            </small>
          </label>

          <label className="field">
            <span>Length of the wall behind the sofa (optional)</span>
            <div className="money-input">
              <input type="number" inputMode="numeric" min={50} max={2000} value={wall} placeholder="e.g. 320" onChange={(e) => setWall(e.target.value)} />
              <span>cm</span>
            </div>
            <small className="muted">
              {isSample
                ? 'Pre-filled with the sample room’s measurement. Forma uses it to flag sofas that won’t fit.'
                : 'Forma can’t measure a room from one photo. Enter it to check whether a sofa fits.'}
            </small>
          </label>

          {keepable.length > 0 && (
            <fieldset className="field">
              <legend>Keep from the current room</legend>
              <div className="chips">
                {keepable.map((c) => (
                  <label key={c} className={`chip chip-check${keep.includes(c) ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={keep.includes(c)}
                      onChange={(e) => setKeep(e.target.checked ? [...keep, c] : keep.filter((k) => k !== c))}
                    />
                    {CATEGORY_LABEL[c]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {isSample && (
            <fieldset className="field">
              <legend>Fixed surfaces</legend>
              <label className="toggle">
                <input type="checkbox" checked={floorChange} onChange={(e) => setFloorChange(e.target.checked)} />
                Allow designs to change the flooring
              </label>
              <label className="toggle">
                <input type="checkbox" checked={wallChange} onChange={(e) => setWallChange(e.target.checked)} />
                Allow designs to change the wall colour
              </label>
            </fieldset>
          )}

          {!isSample && (
            <p className="notice">
              Whole-room redesign of uploaded photos needs an image-generation service, which isn’t connected in this build. You can still mark
              your sofa on the photo, browse alternatives and preview them as a rough overlay.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
