import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { originalPhotoDesign, originalSampleDesign, SAMPLE_ROOM } from '../design/generate';
import { uid } from '../lib/id';
import type { Design, Project, Room, StyleId } from '../types';
import { saveProject } from './storage';

// ---- Factories ----

export function newProject(name = 'My home'): Project {
  const now = new Date().toISOString();
  return { id: uid('p'), name, createdAt: now, updatedAt: now, rooms: [], activeRoomId: '', revisions: [] };
}

function baseRoom(name: string, design: Design): Omit<Room, 'source'> {
  return {
    id: uid('r'),
    name,
    dims: { sofaWallCm: null, roomWidthCm: null, roomDepthCm: null, confirmed: false },
    preferences: { style: 'warm-minimal' as StyleId, changeFlooring: false, changeWalls: false, keep: [] },
    budget: { totalIls: 15000, allowances: {}, includeDecor: true },
    designs: [design],
    activeDesignId: design.id,
    marks: [],
    shortlist: [],
  };
}

export function newSampleRoom(): Room {
  const room: Room = { ...baseRoom('Sample living room', originalSampleDesign()), source: { kind: 'sample', sampleId: 'living' } };
  // Sample measurements are pre-filled but still shown to the user to confirm.
  room.dims = { ...SAMPLE_ROOM.dims, confirmed: false };
  return room;
}

export function newPhotoRoom(imageId: string, width: number, height: number, name = 'Living room'): Room {
  return { ...baseRoom(name, originalPhotoDesign()), source: { kind: 'photo', imageId, width, height } };
}

export function activeDesign(room: Room): Design {
  return room.designs.find((d) => d.id === room.activeDesignId) ?? room.designs[0];
}

// ---- Store with undo / redo ----

interface Snapshot {
  rooms: Room[];
  activeRoomId: string;
  label: string;
}

interface Store {
  project: Project | null;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: boolean;
  open: (p: Project) => void;
  close: () => void;
  /** Records an undoable change. */
  commit: (label: string, fn: (rooms: Room[]) => Room[], activeRoomId?: string) => void;
  updateRoom: (roomId: string, label: string, fn: (r: Room) => Room) => void;
  setActiveRoom: (id: string) => void;
  rename: (name: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  save: (label?: string) => void;
  restoreRevision: (revisionId: string) => void;
}

const Ctx = createContext<Store | null>(null);

interface State {
  project: Project | null;
  past: Snapshot[];
  future: Snapshot[];
  savedJson: string | null;
  lastLabel: string;
}

type Action =
  | { type: 'open'; project: Project }
  | { type: 'close' }
  | { type: 'commit'; label: string; fn: (rooms: Room[]) => Room[]; activeRoomId?: string }
  | { type: 'patch'; fn: (p: Project) => Project }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saved'; project: Project };

const initial: State = { project: null, past: [], future: [], savedJson: null, lastLabel: 'Changes' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'open':
      return { ...initial, project: a.project, savedJson: a.project.revisions.length ? JSON.stringify(a.project.rooms) : null };
    case 'close':
      return initial;
    case 'commit': {
      const p = s.project;
      if (!p) return s;
      return {
        ...s,
        project: { ...p, rooms: a.fn(p.rooms), activeRoomId: a.activeRoomId ?? p.activeRoomId },
        past: [...s.past.slice(-49), { rooms: p.rooms, activeRoomId: p.activeRoomId, label: a.label }],
        future: [],
        lastLabel: a.label,
      };
    }
    case 'patch':
      return s.project ? { ...s, project: a.fn(s.project) } : s;
    case 'undo': {
      const last = s.past[s.past.length - 1];
      const p = s.project;
      if (!last || !p) return s;
      return {
        ...s,
        past: s.past.slice(0, -1),
        future: [...s.future, { rooms: p.rooms, activeRoomId: p.activeRoomId, label: last.label }],
        project: { ...p, rooms: last.rooms, activeRoomId: last.activeRoomId },
      };
    }
    case 'redo': {
      const next = s.future[s.future.length - 1];
      const p = s.project;
      if (!next || !p) return s;
      return {
        ...s,
        future: s.future.slice(0, -1),
        past: [...s.past, { rooms: p.rooms, activeRoomId: p.activeRoomId, label: next.label }],
        project: { ...p, rooms: next.rooms, activeRoomId: next.activeRoomId },
      };
    }
    case 'saved':
      return { ...s, project: a.project, savedJson: JSON.stringify(a.project.rooms) };
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { project, past, future, savedJson, lastLabel } = state;

  const open = useCallback((p: Project) => dispatch({ type: 'open', project: p }), []);
  const close = useCallback(() => dispatch({ type: 'close' }), []);
  const commit = useCallback<Store['commit']>((label, fn, activeRoomId) => dispatch({ type: 'commit', label, fn, activeRoomId }), []);
  const updateRoom = useCallback<Store['updateRoom']>(
    (roomId, label, fn) => commit(label, (rooms) => rooms.map((r) => (r.id === roomId ? fn(r) : r))),
    [commit],
  );
  const setActiveRoom = useCallback((id: string) => dispatch({ type: 'patch', fn: (p) => ({ ...p, activeRoomId: id }) }), []);
  const rename = useCallback((name: string) => dispatch({ type: 'patch', fn: (p) => ({ ...p, name }) }), []);

  const undo = useCallback(() => {
    const label = past[past.length - 1]?.label ?? null;
    dispatch({ type: 'undo' });
    return label;
  }, [past]);
  const redo = useCallback(() => {
    const label = future[future.length - 1]?.label ?? null;
    dispatch({ type: 'redo' });
    return label;
  }, [future]);

  const save = useCallback(
    (label?: string) => {
      if (!project) return;
      const now = new Date().toISOString();
      const next: Project = {
        ...project,
        updatedAt: now,
        revisions: [
          ...project.revisions,
          { id: uid('rev'), at: now, label: label ?? lastLabel, rooms: project.rooms, activeRoomId: project.activeRoomId },
        ],
      };
      saveProject(next); // may throw; caller shows the message
      dispatch({ type: 'saved', project: next });
    },
    [project, lastLabel],
  );

  const restoreRevision = useCallback(
    (revisionId: string) => {
      const rev = project?.revisions.find((r) => r.id === revisionId);
      if (!rev) return;
      commit(`Reopened version from ${new Date(rev.at).toLocaleString('en-GB')}`, () => rev.rooms, rev.activeRoomId);
    },
    [project, commit],
  );

  const value = useMemo<Store>(
    () => ({
      project,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undoLabel: past[past.length - 1]?.label ?? null,
      redoLabel: future[future.length - 1]?.label ?? null,
      dirty: !!project && project.rooms.length > 0 && JSON.stringify(project.rooms) !== savedJson,
      open,
      close,
      commit,
      updateRoom,
      setActiveRoom,
      rename,
      undo,
      redo,
      save,
      restoreRevision,
    }),
    [project, past, future, savedJson, open, close, commit, updateRoom, setActiveRoom, rename, undo, redo, save, restoreRevision],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useProject outside ProjectProvider');
  return s;
}
