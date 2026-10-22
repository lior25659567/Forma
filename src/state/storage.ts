import type { Project } from '../types';

// Projects are stored as JSON in localStorage. Room photos are stored as Blobs in IndexedDB,
// referenced by id, so revisions don't duplicate image data.

const INDEX_KEY = 'forma:projects';
const PROJECT_KEY = (id: string) => `forma:project:${id}`;

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  rooms: number;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function listProjects(): ProjectMeta[] {
  try {
    const list = JSON.parse(safeGet(INDEX_KEY) ?? '[]') as ProjectMeta[];
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function loadProject(id: string): Project | null {
  try {
    const raw = safeGet(PROJECT_KEY(id));
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

/** Throws a readable error if browser storage is full or unavailable. */
export function saveProject(p: Project) {
  const trimmed: Project = { ...p, revisions: p.revisions.slice(-25) };
  try {
    localStorage.setItem(PROJECT_KEY(p.id), JSON.stringify(trimmed));
    const list = listProjects().filter((m) => m.id !== p.id);
    list.push({ id: p.id, name: p.name, updatedAt: p.updatedAt, rooms: p.rooms.length });
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch (e) {
    throw new Error(
      e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'Browser storage is full. Delete an old project and try again.'
        : 'This browser is blocking local storage, so the project could not be saved.',
    );
  }
}

export function deleteProject(id: string) {
  try {
    localStorage.removeItem(PROJECT_KEY(id));
    localStorage.setItem(INDEX_KEY, JSON.stringify(listProjects().filter((m) => m.id !== id)));
  } catch {
    /* ignore */
  }
}

// ---- Images (IndexedDB) ----

const memory = new Map<string, string>();

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('forma', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(id: string, blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  memory.set(id, url);
  try {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction('images', 'readwrite');
      tx.objectStore('images').put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Still usable for this session; it just won't survive a reload.
  }
  return url;
}

export async function getImage(id: string): Promise<string | null> {
  const hit = memory.get(id);
  if (hit) return hit;
  try {
    const d = await db();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const req = d.transaction('images').objectStore('images').get(id);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    memory.set(id, url);
    return url;
  } catch {
    return null;
  }
}

/** Downscale an uploaded photo to at most `max` px on the long edge, as JPEG. */
export async function prepareImage(file: File, max = 1600): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * k);
  const height = Math.round(bitmap.height * k);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read this image.'))), 'image/jpeg', 0.88),
  );
  return { blob, width, height };
}
