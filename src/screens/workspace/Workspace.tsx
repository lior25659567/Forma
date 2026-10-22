import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { productShape } from '../../catalog/catalog';
import { RETAILERS } from '../../catalog/retailers';
import { generateDesign } from '../../design/generate';
import { STYLE_BY_ID } from '../../design/styles';
import { formatIls, formatSignedIls } from '../../lib/format';
import { capFor, lineFor, projectedTotal, summarize } from '../../logic/budget';
import type { SceneOverride } from '../../render/RoomScene';
import { activeDesign, useProject } from '../../state/project';
import { getImage } from '../../state/storage';
import type { Category, Design, ItemShape, Mark, PlacedItem, Product, Room } from '../../types';
import { CATEGORIES, CATEGORY_LABEL } from '../../types';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { Canvas, type CompareSpec } from './Canvas';
import { RoomNav, TopBar } from './Chrome';
import { DesignBar, DirectionsDialog, type DirectionRequest } from './DesignBar';
import { AboutDialog, HistoryDialog, ShoppingListDialog } from './Dialogs';
import { ItemPanel } from './ItemPanel';
import { sampleMark } from './sampling';

type Preview =
  | { status: 'generating'; category: Category; product: Product; variantId: string; progress: number }
  | { status: 'ready'; category: Category; product: Product; variantId: string; shape: ItemShape }
  | { status: 'failed'; category: Category; product: Product; variantId: string; reason: string };

/** Shape standing in for a piece on an uploaded photo: only colour and (optional) width are known. */
function photoTarget(m: Mark): ItemShape {
  const w = m.currentWidthCm ?? 210;
  switch (m.category) {
    case 'sofa':
      return { kind: 'sofa', widthCm: w, depthCm: 92, heightCm: 80, arms: 'track', legs: 'block', silhouette: 'straight', seatCushions: 2, color: m.color, material: 'cotton', legColor: '#333' };
    case 'coffeeTable':
      return { kind: 'coffeeTable', widthCm: m.currentWidthCm ?? 110, depthCm: 60, heightCm: 42, top: 'rect', base: 'four-legs', color: m.color, material: 'wood', legColor: m.color };
    case 'rug':
      return { kind: 'rug', widthCm: m.currentWidthCm ?? 240, depthCm: 170, pattern: 'solid', shape: 'rect', color: m.color, accent: m.color, material: 'wool' };
    case 'floorLamp':
      return { kind: 'floorLamp', heightCm: 155, shade: 'drum', color: m.color, baseColor: '#333', material: 'linen' };
  }
}

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = () => setM(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [q]);
  return m;
}

export function Workspace({ onHome, onAddRoom }: { onHome: () => void; onAddRoom: () => void }) {
  const store = useProject();
  const project = store.project!;
  const room = project.rooms.find((r) => r.id === project.activeRoomId) ?? project.rooms[0];
  const design = activeDesign(room);
  const isPhoto = room.source.kind === 'photo';
  const mobile = useMedia('(max-width: 720px)');
  const wide = useMedia('(min-width: 1100px)');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [hovered, setHovered] = useState<Category | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewCompare, setPreviewCompare] = useState(false);
  const [candidates, setCandidates] = useState<Design[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(wide);
  const [dialog, setDialog] = useState<null | 'list' | 'history' | 'about' | 'directions' | 'wall'>(null);
  const [marking, setMarking] = useState(false);
  const [pendingMark, setPendingMark] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: boolean } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  // Reset transient UI when switching rooms.
  useEffect(() => {
    setSelected(null);
    setHovered(null);
    setPreview(null);
    setCandidates([]);
    setViewingId(null);
    setCompareId(null);
    setMarking(false);
    setPhotoUrl(null);
    if (room.source.kind === 'photo') getImage(room.source.imageId).then(setPhotoUrl);
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (store.dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [store.dirty]);

  const updateRoom = useCallback((label: string, fn: (r: Room) => Room) => store.updateRoom(room.id, label, fn), [store, room.id]);
  const updateDesign = useCallback(
    (label: string, fn: (d: Design) => Design) => updateRoom(label, (r) => ({ ...r, designs: r.designs.map((d) => (d.id === r.activeDesignId ? fn(d) : d)) })),
    [updateRoom],
  );

  // ---- Preview lifecycle ----

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);

  const cancelPreview = useCallback(() => {
    stopTimer();
    setPreview(null);
    setPreviewCompare(false);
  }, []);

  const startPreview = (product: Product, variantId: string) => {
    if (!selected) return;
    stopTimer();
    const category = selected;
    setPreviewCompare(false);
    setPreview({ status: 'generating', category, product, variantId, progress: 0 });
    const res = productShape(product, variantId);
    const current = design.items[category]?.shape;
    let progress = 0;
    timer.current = window.setInterval(() => {
      progress += 9 + Math.random() * 8;
      if (progress < 100) {
        setPreview((p) => (p && p.status === 'generating' ? { ...p, progress } : p));
        return;
      }
      stopTimer();
      if (!res.ok) {
        setPreview({ status: 'failed', category, product, variantId, reason: res.reason });
      } else if (current && JSON.stringify(current) === JSON.stringify(res.shape) && !isPhoto) {
        setPreview({ status: 'failed', category, product, variantId, reason: 'It would look identical to what’s already in your room.' });
      } else {
        setPreview({ status: 'ready', category, product, variantId, shape: res.shape });
      }
    }, 90);
  };

  const applyPreview = () => {
    if (!preview || preview.status !== 'ready') return;
    const { category, product, variantId, shape } = preview;
    updateDesign(`Applied ${product.name}`, (d) => ({
      ...d,
      items: { ...d.items, [category]: { category, shape, source: { type: 'product', productId: product.id, variantId } } as PlacedItem },
    }));
    cancelPreview();
    setToast({ text: `Applied ${product.name}.`, undo: true });
  };

  const select = (c: Category | null) => {
    if (preview && c !== preview.category) cancelPreview();
    setSelected(c);
  };

  // ---- Keyboard ----

  const undo = useCallback(() => {
    cancelPreview();
    const l = store.undo();
    if (l) setToast({ text: `Undid: ${l}` });
  }, [store, cancelPreview]);
  const redo = useCallback(() => {
    cancelPreview();
    const l = store.redo();
    if (l) setToast({ text: `Redid: ${l}` });
  }, [store, cancelPreview]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
      if (e.key === 'Escape') {
        if (marking) setMarking(false);
        else if (preview) cancelPreview();
        else if (compareId) setCompareId(null);
        else if (viewingId) setViewingId(null);
        else if (selected) setSelected(null);
        return;
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [marking, preview, compareId, viewingId, selected, undo, redo, cancelPreview]);

  // ---- Derived ----

  const viewing = candidates.find((d) => d.id === viewingId) ?? null;
  const shown = viewing ?? design;
  const selectable: Category[] = isPhoto ? room.marks.map((m) => m.category) : CATEGORIES.filter((c) => shown.items[c]);
  const override: SceneOverride | null = preview?.status === 'ready' ? { category: preview.category, shape: preview.shape } : null;

  const compare: CompareSpec | null = useMemo(() => {
    if (preview?.status === 'ready' && previewCompare) {
      return { before: { design, label: 'Before' }, after: { design, override, label: 'After' } };
    }
    const other = room.designs.find((d) => d.id === compareId);
    if (other && !viewing) return { before: { design, label: design.name }, after: { design: other, label: other.name } };
    return null;
  }, [preview, previewCompare, design, override, room.designs, compareId, viewing]);

  const interactive = !compare && !viewing && !marking;
  const summary = summarize(design, room.budget);

  const panelData = useMemo(() => {
    if (!selected || viewing) return null;
    const item = design.items[selected];
    const mark = room.marks.find((m) => m.category === selected);
    let target: ItemShape | null = item?.shape ?? null;
    let partial: { knownWidth: boolean } | null = null;
    if (isPhoto && mark && item?.source.type !== 'product') {
      target = photoTarget(mark);
      partial = { knownWidth: mark.currentWidthCm != null };
    }
    if (!target) return null;
    return {
      target,
      partial,
      cap: capFor(design, room.budget, selected),
      line: item ? lineFor(item as PlacedItem) : null,
      currentProductId: item?.source.type === 'product' ? item.source.productId : null,
    };
  }, [selected, viewing, design, room, isPhoto]);

  // ---- Actions ----

  const generateDirections = (req: DirectionRequest) => {
    setDialog(null);
    const n = room.designs.filter((d) => d.style === req.style).length;
    const list = [0, 1, 2].map((i) => generateDesign(room, req.style, n + i, { inspirationColors: req.inspirationColors, inspirationStrength: req.strength }));
    setCandidates(list);
    setViewingId(list[0].id);
    setSelected(null);
    cancelPreview();
  };

  const useCandidate = () => {
    if (!viewing) return;
    updateRoom(`Switched to ${viewing.name}`, (r) => ({ ...r, designs: [...r.designs, viewing], activeDesignId: viewing.id, preferences: { ...r.preferences, style: viewing.style as never } }));
    setCandidates((c) => c.filter((d) => d.id !== viewing.id));
    setViewingId(null);
    setToast({ text: `Now using ${viewing.name}.`, undo: true });
  };

  const save = () => {
    try {
      store.save();
      setSaveError(null);
      setToast({ text: 'Saved. You can reopen this version from Saved versions.' });
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  const finishMark = async (category: Category, widthCm: number | null) => {
    const rect = pendingMark!;
    setPendingMark(null);
    setMarking(false);
    const sampled = photoUrl ? await sampleMark(photoUrl, rect) : { color: '#999999', top: '#cccccc', bottom: '#aaaaaa' };
    const mark: Mark = { id: `m${Date.now()}`, category, rect, color: sampled.color, patch: { top: sampled.top, bottom: sampled.bottom }, currentWidthCm: widthCm };
    updateRoom(`Marked ${CATEGORY_LABEL[category].toLowerCase()}`, (r) => ({
      ...r,
      marks: [...r.marks.filter((m) => m.category !== category), mark],
      designs: r.designs.map((d) => ({ ...d, items: { ...d.items, [category]: { category, shape: photoTarget(mark), source: { type: 'original' } } as PlacedItem } })),
    }));
    setSelected(category);
  };

  // ---- Render ----

  const previewInfo = preview && preview.status !== 'generating' ? projectedTotal(design, room.budget, preview.category, preview.product, preview.variantId) : null;
  const showPanel = !!panelData && !!selected;
  const styleDef = design.style !== 'original' ? STYLE_BY_ID[design.style] : null;

  const banner = viewing ? (
    <div className="banner" onClick={(e) => e.stopPropagation()}>
      <span>
        Previewing <b>{viewing.name}</b> — your current design is unchanged.
        {viewing.inspiration && <span className="muted"> Colours influenced by your images.</span>}
      </span>
      <span className="grow" />
      <button className="btn btn-sm" onClick={() => setViewingId(null)}>
        Back to current
      </button>
      <button className="btn btn-sm btn-primary" onClick={useCandidate}>
        Use this design
      </button>
    </div>
  ) : compare && !previewCompare ? (
    <div className="banner" onClick={(e) => e.stopPropagation()}>
      <span>Drag the slider to compare designs.</span>
      <span className="grow" />
      <button className="btn btn-sm" onClick={() => setCompareId(null)}>
        Done
      </button>
    </div>
  ) : marking ? (
    <div className="banner" onClick={(e) => e.stopPropagation()}>
      <span>Drag a box around a piece of furniture you want to replace or keep.</span>
      <span className="grow" />
      <button className="btn btn-sm" onClick={() => setMarking(false)}>
        Cancel
      </button>
    </div>
  ) : isPhoto && room.marks.length === 0 ? (
    <div className="banner banner-hint" onClick={(e) => e.stopPropagation()}>
      <span>Forma can’t detect furniture in uploaded photos yet. Mark your sofa to find alternatives.</span>
      <span className="grow" />
      <button className="btn btn-sm btn-primary" onClick={() => setMarking(true)}>
        <Icon name="mark" size={16} /> Mark sofa
      </button>
    </div>
  ) : null;

  return (
    <div className={`workspace${navOpen ? ' nav-open' : ''}${showPanel ? ' panel-open' : ''}`}>
      <TopBar
        project={project}
        room={room}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        undoLabel={store.undoLabel}
        redoLabel={store.redoLabel}
        dirty={store.dirty}
        onHome={() => {
          if (store.dirty) setLeaving(true);
          else onHome();
        }}
        onRename={store.rename}
        onUndo={undo}
        onRedo={redo}
        onSave={save}
        onList={() => setDialog('list')}
        onHistory={() => setDialog('history')}
        onAbout={() => setDialog('about')}
        onToggleNav={() => setNavOpen(!navOpen)}
        navOpen={navOpen}
      />
      {saveError && (
        <div className="error-bar" role="alert">
          <Icon name="alert" size={16} /> {saveError}
          <button className="link-btn" onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="ws-body">
        <RoomNav
          project={project}
          open={navOpen}
          onPick={(id) => {
            store.setActiveRoom(id);
            if (!wide) setNavOpen(false);
          }}
          onAdd={onAddRoom}
          onClose={() => setNavOpen(false)}
        />

        <main className="ws-main" aria-label="Room">
          <Canvas
            room={room}
            design={shown}
            photoUrl={photoUrl}
            override={override}
            compare={compare}
            interaction={
              interactive
                ? { selectable, hovered, selected, focusable: true, onHover: setHovered, onSelect: select }
                : null
            }
            progress={preview?.status === 'generating' ? { category: preview.category, value: preview.progress, onCancel: cancelPreview } : null}
            marking={marking}
            onMarked={setPendingMark}
            banner={banner}
          >
            {!preview && !viewing && !compare && !marking && (
              <div className="canvas-hint" aria-live="polite">
                {selected
                  ? null
                  : selectable.length > 0
                    ? `Click ${selectable.includes('sofa') ? 'the sofa' : 'a marked piece'} to see options you can afford.`
                    : null}
              </div>
            )}

            {preview && preview.status !== 'generating' && (
              <div className={`preview-bar${preview.status === 'failed' ? ' is-failed' : ''}`} role="region" aria-label="Preview" onClick={(e) => e.stopPropagation()}>
                {preview.status === 'failed' ? (
                  <>
                    <Icon name="alert" />
                    <div className="pb-text">
                      <b>Couldn’t preview {preview.product.name}.</b>
                      <span>{preview.reason} Your design hasn’t changed.</span>
                    </div>
                    <div className="pb-actions">
                      <button className="btn btn-sm" onClick={cancelPreview}>
                        Dismiss
                      </button>
                      <button className="btn btn-sm" onClick={() => startPreview(preview.product, preview.variantId)}>
                        Try again
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pb-text">
                      <b>
                        {preview.product.name} <span className="muted">· {RETAILERS[preview.product.retailer].name}</span>
                      </b>
                      {previewInfo?.priceKnown ? (
                        <span>
                          <span className={previewInfo.delta > 0 ? 'up' : 'down'}>{formatSignedIls(previewInfo.delta)}</span> · Room total {formatIls(previewInfo.after)} of{' '}
                          {formatIls(room.budget.totalIls)}
                          {previewInfo.after > room.budget.totalIls && <span className="neg"> · {formatIls(previewInfo.after - room.budget.totalIls)} over budget</span>}
                        </span>
                      ) : (
                        <span>Price not listed — the room total can’t be updated.</span>
                      )}
                      <span className="muted small">
                        {isPhoto ? 'Rough overlay on your photo.' : 'Visualization from listed size, colour and shape.'} Not a guarantee of exact look or fit.
                      </span>
                    </div>
                    <div className="pb-actions">
                      <button className={`btn btn-sm${previewCompare ? ' is-on' : ''}`} aria-pressed={previewCompare} onClick={() => setPreviewCompare(!previewCompare)}>
                        <Icon name="compare" size={16} /> Before / After
                      </button>
                      <button className="btn btn-sm" onClick={cancelPreview}>
                        Cancel
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={applyPreview}>
                        <Icon name="check" size={16} /> Apply
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {!preview && (
              <DesignBar
                designs={room.designs}
                activeId={room.activeDesignId}
                candidates={candidates}
                viewingId={viewingId}
                comparing={!!compareId}
                canGenerate={!isPhoto}
                onSelect={(id) => {
                  setViewingId(null);
                  setCompareId(null);
                  if (id !== room.activeDesignId) {
                    const d = room.designs.find((x) => x.id === id)!;
                    updateRoom(`Switched to ${d.name}`, (r) => ({ ...r, activeDesignId: id }));
                  }
                }}
                onView={(id) => {
                  setCompareId(null);
                  setSelected(null);
                  setViewingId(id);
                }}
                onNew={() => setDialog('directions')}
                onCompare={(id) => {
                  setSelected(null);
                  setCompareId(id);
                }}
              />
            )}

            {isPhoto && room.marks.length > 0 && !marking && !preview && (
              <button className="btn btn-sm mark-btn" onClick={(e) => (e.stopPropagation(), setSelected(null), setMarking(true))}>
                <Icon name="mark" size={16} /> Mark furniture
              </button>
            )}
          </Canvas>
          <p className="sr-only" aria-live="polite">
            {summary.remaining < 0 ? `Room is ${formatIls(-summary.remaining)} over budget.` : ''}
          </p>
        </main>

        {showPanel && panelData && selected && (
          <aside
            className={`panel${mobile ? ' sheet' : ''}${preview ? ' has-preview' : ''}`}
            aria-labelledby="panel-title"
            role={mobile ? 'dialog' : 'complementary'}
            aria-modal={mobile ? false : undefined}
          >
            {mobile && <span className="sheet-handle" aria-hidden="true" />}
            <ItemPanel
              key={`${room.id}-${selected}`}
              category={selected}
              target={panelData.target}
              partial={panelData.partial}
              cap={panelData.cap}
              currentLine={panelData.line}
              currentProductId={panelData.currentProductId}
              designName={design.name}
              wallCm={room.dims.sofaWallCm}
              shortlist={room.shortlist}
              previewBusy={preview?.status === 'generating'}
              canKeepExisting={!isPhoto && design.style !== 'original' && !!room.designs.find((d) => d.style === 'original')?.items[selected]}
              onClose={() => select(null)}
              onPreview={startPreview}
              onSetAllowance={(n) =>
                updateRoom(`Set ${CATEGORY_LABEL[selected].toLowerCase()} budget to ${formatIls(n)}`, (r) => ({ ...r, budget: { ...r.budget, allowances: { ...r.budget.allowances, [selected]: n } } }))
              }
              onToggleShortlist={(id) =>
                updateRoom(room.shortlist.includes(id) ? 'Removed from shortlist' : 'Added to shortlist', (r) => ({
                  ...r,
                  shortlist: r.shortlist.includes(id) ? r.shortlist.filter((x) => x !== id) : [...r.shortlist, id],
                }))
              }
              onKeepExisting={() => {
                const orig = room.designs.find((d) => d.style === 'original')?.items[selected];
                if (orig) updateDesign(`Kept existing ${CATEGORY_LABEL[selected].toLowerCase()}`, (d) => ({ ...d, items: { ...d.items, [selected]: { ...orig, source: { type: 'kept' } } } }));
              }}
              onEnterWall={() => setDialog('wall')}
            />
          </aside>
        )}
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.undo && store.canUndo && (
            <button className="link-btn" onClick={() => (undo(), setToast(null))}>
              Undo
            </button>
          )}
        </div>
      )}

      <ShoppingListDialog
        open={dialog === 'list'}
        onClose={() => setDialog(null)}
        project={project}
        onToggleDecor={(roomId, v) => store.updateRoom(roomId, v ? 'Included decor estimate' : 'Removed decor estimate', (r) => ({ ...r, budget: { ...r.budget, includeDecor: v } }))}
      />
      <HistoryDialog
        open={dialog === 'history'}
        onClose={() => setDialog(null)}
        project={project}
        onRestore={(id) => {
          cancelPreview();
          setSelected(null);
          store.restoreRevision(id);
          setDialog(null);
          setToast({ text: 'Reopened saved version.', undo: true });
        }}
      />
      <AboutDialog open={dialog === 'about'} onClose={() => setDialog(null)} />
      {dialog === 'directions' && (
        <DirectionsDialog open onClose={() => setDialog(null)} initialStyle={styleDef?.id ?? room.preferences.style} onGenerate={generateDirections} />
      )}
      {dialog === 'wall' && (
        <WallDialog
          initial={room.dims.sofaWallCm}
          onClose={() => setDialog(null)}
          onSave={(cm) => {
            updateRoom('Updated wall length', (r) => ({ ...r, dims: { ...r.dims, sofaWallCm: cm, confirmed: true } }));
            setDialog(null);
          }}
        />
      )}
      <Dialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave without saving?"
        size="sm"
        footer={
          <>
            <button className="btn" onClick={() => setLeaving(false)}>
              Stay
            </button>
            <button className="btn" onClick={() => (setLeaving(false), onHome())}>
              Leave
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                try {
                  store.save();
                  setLeaving(false);
                  onHome();
                } catch (e) {
                  setLeaving(false);
                  setSaveError((e as Error).message);
                }
              }}
            >
              Save and leave
            </button>
          </>
        }
      >
        <p>Your unsaved changes will be lost if you leave now.</p>
      </Dialog>
      {pendingMark && <MarkDialog taken={room.marks.map((m) => m.category)} onCancel={() => setPendingMark(null)} onSave={finishMark} />}
    </div>
  );
}

function WallDialog({ initial, onClose, onSave }: { initial: number | null; onClose: () => void; onSave: (cm: number) => void }) {
  const [v, setV] = useState(initial?.toString() ?? '');
  const n = Number(v);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Wall length"
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!(n >= 50)} onClick={() => onSave(Math.round(n))}>
            Save
          </button>
        </>
      }
    >
      <label className="field">
        <span>Free wall length where the sofa goes</span>
        <div className="money-input">
          <input type="number" min={50} autoFocus value={v} onChange={(e) => setV(e.target.value)} />
          <span>cm</span>
        </div>
        <small className="muted">Measure it with a tape — Forma can’t measure from a photo.</small>
      </label>
    </Dialog>
  );
}

function MarkDialog({ taken, onCancel, onSave }: { taken: Category[]; onCancel: () => void; onSave: (c: Category, w: number | null) => void }) {
  const [cat, setCat] = useState<Category>(taken.includes('sofa') ? (CATEGORIES.find((c) => !taken.includes(c)) ?? 'sofa') : 'sofa');
  const [w, setW] = useState('');
  return (
    <Dialog
      open
      onClose={onCancel}
      title="What did you mark?"
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onSave(cat, w ? Math.max(20, Number(w)) : null)}>
            Save
          </button>
        </>
      }
    >
      <div className="chips" role="radiogroup" aria-label="Furniture type">
        {CATEGORIES.map((c) => (
          <button key={c} role="radio" aria-checked={cat === c} className={`chip${cat === c ? ' is-on' : ''}`} onClick={() => setCat(c)}>
            {CATEGORY_LABEL[c]}
            {taken.includes(c) ? ' (replace mark)' : ''}
          </button>
        ))}
      </div>
      {cat !== 'floorLamp' && (
        <label className="field">
          <span>Its current width (optional)</span>
          <div className="money-input">
            <input type="number" min={20} value={w} onChange={(e) => setW(e.target.value)} placeholder="e.g. 200" />
            <span>cm</span>
          </div>
          <small className="muted">Used to draw replacements at the right size relative to it.</small>
        </label>
      )}
    </Dialog>
  );
}
