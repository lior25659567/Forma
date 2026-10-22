import { useEffect, useState } from 'react';
import { formatIls } from '../../lib/format';
import { summarize } from '../../logic/budget';
import { RoomScene } from '../../render/RoomScene';
import { activeDesign } from '../../state/project';
import { getImage } from '../../state/storage';
import type { Project, Room } from '../../types';
import { Icon, Logo } from '../../ui/Icon';

export function TopBar({
  project,
  room,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  dirty,
  onHome,
  onRename,
  onUndo,
  onRedo,
  onSave,
  onList,
  onHistory,
  onAbout,
  onToggleNav,
  navOpen,
}: {
  project: Project;
  room: Room;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: boolean;
  onHome: () => void;
  onRename: (n: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onList: () => void;
  onHistory: () => void;
  onAbout: () => void;
  onToggleNav: () => void;
  navOpen: boolean;
}) {
  const s = summarize(activeDesign(room), room.budget);
  return (
    <header className="topbar">
      <button className="icon-btn brand-btn" onClick={onHome} aria-label="Forma home">
        <Logo />
      </button>
      <button className="icon-btn" onClick={onToggleNav} aria-expanded={navOpen} aria-controls="room-nav" aria-label={navOpen ? 'Hide rooms' : 'Show rooms'}>
        <Icon name="rooms" />
      </button>
      <input className="project-name" value={project.name} onChange={(e) => onRename(e.target.value)} aria-label="Project name" />
      <div className="tb-group">
        <button className="icon-btn" onClick={onUndo} disabled={!canUndo} aria-label={undoLabel ? `Undo: ${undoLabel}` : 'Undo'} title={undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Undo'}>
          <Icon name="undo" />
        </button>
        <button className="icon-btn" onClick={onRedo} disabled={!canRedo} aria-label={redoLabel ? `Redo: ${redoLabel}` : 'Redo'} title={redoLabel ? `Redo: ${redoLabel} (Ctrl+Shift+Z)` : 'Redo'}>
          <Icon name="redo" />
        </button>
      </div>
      <span className="grow" />
      <button className="demo-badge" onClick={onAbout}>
        Demo data
      </button>
      <button className="icon-btn hide-xs" onClick={onHistory} aria-label="Saved versions" title="Saved versions">
        <Icon name="history" />
      </button>
      <button className={`btn btn-sm list-btn${s.remaining < 0 ? ' is-over' : ''}`} onClick={onList}>
        <Icon name="bag" size={16} />
        <span className="hide-sm">List</span> {formatIls(s.total)}
        <span className="muted hide-sm">/ {formatIls(s.budget)}</span>
      </button>
      <button className="btn btn-sm btn-primary save-btn" onClick={onSave} disabled={!dirty} aria-describedby="save-state">
        <Icon name="save" size={16} /> <span className="hide-sm">Save</span>
      </button>
      <span id="save-state" className={`save-state${dirty ? ' is-dirty' : ''}`} role="status">
        {dirty ? 'Unsaved changes' : project.revisions.length ? 'Saved' : ''}
      </span>
    </header>
  );
}

function RoomThumb({ room }: { room: Room }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (room.source.kind === 'photo') getImage(room.source.imageId).then(setUrl);
  }, [room.source]);
  if (room.source.kind === 'photo') return url ? <img src={url} alt="" /> : <span />;
  return <RoomScene room={room} design={activeDesign(room)} idPrefix={`nav${room.id.replace(/\W/g, '')}`} />;
}

export function RoomNav({ project, open, onPick, onAdd, onClose }: { project: Project; open: boolean; onPick: (id: string) => void; onAdd: () => void; onClose: () => void }) {
  return (
    <nav id="room-nav" className={`room-nav${open ? ' is-open' : ''}`} aria-label="Rooms" hidden={!open}>
      <div className="room-nav-head">
        <h2>Rooms</h2>
        <button className="icon-btn nav-close" onClick={onClose} aria-label="Hide rooms">
          <Icon name="chevronLeft" />
        </button>
      </div>
      <ul>
        {project.rooms.map((r) => (
          <li key={r.id}>
            <button className={`room-item${r.id === project.activeRoomId ? ' is-on' : ''}`} aria-current={r.id === project.activeRoomId} onClick={() => onPick(r.id)}>
              <span className="room-thumb">
                <RoomThumb room={r} />
              </span>
              <span className="room-meta">
                <b>{r.name}</b>
                <small>{activeDesign(r).name}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className="btn btn-sm add-room" onClick={onAdd}>
        <Icon name="plus" size={16} /> Add room
      </button>
      <p className="muted small nav-note">Whole-home scanning and 3D are planned for later.</p>
    </nav>
  );
}
