import { Project, Frame, Layer } from '../types';

const DB_NAME = 'SpriteLabDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const AUTOSAVE_KEY = 'spritelab_autosave';
const RECENT_KEY = 'spritelab_recent_list';

export function uint8ToBase64(bytes: Uint8ClampedArray): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8ClampedArray {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Serialized Project format for JSON storage & export
 */
export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  dataBase64: string;
}

export interface SerializedFrame {
  id: string;
  duration: number;
  layers: SerializedLayer[];
}

export interface SerializedProject {
  formatVersion: number;
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  palette: string[];
  frames: SerializedFrame[];
  createdAt: number;
  updatedAt: number;
}

export function serializeProject(project: Project): SerializedProject {
  return {
    formatVersion: 1,
    id: project.id,
    name: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    palette: [...project.palette],
    createdAt: project.createdAt,
    updatedAt: Date.now(),
    frames: project.frames.map((frame) => ({
      id: frame.id,
      duration: frame.duration,
      layers: frame.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        locked: layer.locked,
        dataBase64: uint8ToBase64(layer.data),
      })),
    })),
  };
}

export function deserializeProject(serialized: SerializedProject): Project {
  const expectedLength = serialized.width * serialized.height * 4;

  const frames: Frame[] = serialized.frames.map((sf) => ({
    id: sf.id,
    duration: sf.duration || 100,
    layers: sf.layers.map((sl) => {
      let data: Uint8ClampedArray;
      try {
        data = base64ToUint8(sl.dataBase64);
        if (data.length !== expectedLength) {
          // Adjust if mismatch
          const fixed = new Uint8ClampedArray(expectedLength);
          fixed.set(data.subarray(0, expectedLength));
          data = fixed;
        }
      } catch {
        data = new Uint8ClampedArray(expectedLength);
      }
      return {
        id: sl.id,
        name: sl.name,
        visible: sl.visible !== false,
        opacity: sl.opacity ?? 1,
        locked: sl.locked ?? false,
        data,
      };
    }),
  }));

  return {
    id: serialized.id || `project-${Date.now()}`,
    name: serialized.name || 'Untitled Project',
    width: serialized.width || 32,
    height: serialized.height || 32,
    fps: serialized.fps || 10,
    palette: serialized.palette || [],
    frames,
    createdAt: serialized.createdAt || Date.now(),
    updatedAt: serialized.updatedAt || Date.now(),
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToDB(project: Project): Promise<void> {
  const serialized = serializeProject(project);

  // Always update localStorage recent list
  updateRecentList(project.id, project.name, project.width, project.height, project.frames.length);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(serialized);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    try {
      localStorage.setItem(`spritelab_proj_${project.id}`, JSON.stringify(serialized));
    } catch {
      // Storage full
    }
  }
}

export async function loadProjectFromDB(id: string): Promise<Project | null> {
  try {
    const db = await openDB();
    const serialized = await new Promise<SerializedProject | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (serialized) {
      return deserializeProject(serialized);
    }
  } catch {
    // Fallback to localStorage
    const item = localStorage.getItem(`spritelab_proj_${id}`);
    if (item) {
      return deserializeProject(JSON.parse(item));
    }
  }
  return null;
}

export async function listSavedProjects(): Promise<Array<{ id: string; name: string; width: number; height: number; framesCount: number; updatedAt: number }>> {
  try {
    const db = await openDB();
    const all = await new Promise<SerializedProject[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return all.map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      framesCount: p.frames.length,
      updatedAt: p.updatedAt,
    }));
  } catch {
    // Try localStorage
    const recent = getRecentList();
    return recent;
  }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem(`spritelab_proj_${id}`);
  }

  // Remove from recent
  const list = getRecentList().filter((p) => p.id !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export function saveAutosave(project: Project): void {
  try {
    const serialized = serializeProject(project);
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serialized));
  } catch {
    // quota exceeded or disabled
  }
}

export function loadAutosave(): Project | null {
  try {
    const item = localStorage.getItem(AUTOSAVE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item);
    return deserializeProject(parsed);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

function updateRecentList(
  id: string,
  name: string,
  width: number,
  height: number,
  framesCount: number
) {
  try {
    let list = getRecentList();
    list = list.filter((p) => p.id !== id);
    list.unshift({ id, name, width, height, framesCount, updatedAt: Date.now() });
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function getRecentList(): Array<{ id: string; name: string; width: number; height: number; framesCount: number; updatedAt: number }> {
  try {
    const item = localStorage.getItem(RECENT_KEY);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
}
