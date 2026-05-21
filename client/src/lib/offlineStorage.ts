/**
 * Offline Storage — IndexedDB CRUD layer for downloaded tracks.
 *
 * Uses the `idb` library (a 1 kB promise wrapper around IndexedDB) for
 * a simple async API. Two object stores:
 *
 *   - `tracks`         — audio blob + full track metadata (keyed by track id)
 *   - `downloads_meta` — download progress / status per track (keyed by track id)
 *
 * All public functions are safe to call before the DB is ready — the first
 * call lazily opens (or creates) the database.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Track } from "@shared/schema";

// ─── Schema Types ───────────────────────────────────────────────────────────

/** Raw value stored in the `tracks` object store. */
interface StoredTrack {
  id: string;
  track: Track;
  blob: Blob;
  coverBlob: Blob | null;
  savedAt: string;
  audioUrl: string;
  /** User-defined display order (0-based). Legacy entries default to savedAt order. */
  order: number;
}

/** Value stored in the `downloads_meta` object store. */
interface DownloadMeta {
  trackId: string;
  status: "downloading" | "complete" | "failed";
  progress: number;
  startedAt: string;
  fileSize: number;
}

interface OfflineDBSchema extends DBSchema {
  tracks: {
    key: string;
    value: StoredTrack;
  };
  downloads_meta: {
    key: string;
    value: DownloadMeta;
  };
}

/** Track metadata without the large audio blob — used for list views. */
export type TrackMeta = Omit<StoredTrack, "blob">;

/** Public shape of a download-meta entry (mutable fields). */
export type DownloadProgress = Pick<DownloadMeta, "status" | "progress" | "fileSize">;

// ─── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = "museWaveOffline";
const DB_VERSION = 1;

// ─── Database Singleton ─────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

async function getDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tracks")) {
          db.createObjectStore("tracks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("downloads_meta")) {
          db.createObjectStore("downloads_meta", { keyPath: "trackId" });
        }
      },
    });
  }
  return dbPromise;
}

/** Auto-assign the next order value by finding the max existing order. */
async function nextOrder(): Promise<number> {
  try {
    const db = await getDb();
    const all = await db.getAll("tracks");
    if (all.length === 0) return 0;
    const max = Math.max(...all.map((t) => t.order ?? 0));
    return max + 1;
  } catch {
    return 0;
  }
}

// ─── Tracks CRUD ────────────────────────────────────────────────────────────

/**
 * Save a fully-downloaded track (audio blob + metadata) into IndexedDB.
 * The track is appended at the end of the user-defined order.
 */
export async function saveTrack(
  track: Track,
  blob: Blob,
  coverBlob?: Blob | null,
): Promise<void> {
  const db = await getDb();
  const order = await nextOrder();
  const value: StoredTrack = {
    id: track.id,
    track,
    blob,
    coverBlob: coverBlob ?? null,
    savedAt: new Date().toISOString(),
    audioUrl: track.audioUrl,
    order,
  };
  await db.put("tracks", value);
}

/**
 * Retrieve the audio blob for a track. Returns `undefined` if the track
 * hasn't been downloaded (caller should fall back to the network URL).
 */
export async function getTrackBlob(trackId: string): Promise<Blob | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get("tracks", trackId);
    return entry?.blob;
  } catch {
    return undefined;
  }
}

/**
 * Retrieve track metadata (everything except the audio blob).
 * Useful for the Downloads page list view where the blob isn't needed.
 */
export async function getTrackMeta(trackId: string): Promise<TrackMeta | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get("tracks", trackId);
    if (!entry) return undefined;
    const { blob: _, ...meta } = entry;
    return meta;
  } catch {
    return undefined; 
  }
}

/**
 * List every track saved offline. Returns metadata only (no audio blobs)
 * to keep memory usage predictable. Sorted by user-defined `order`, with
 * a fallback to `savedAt` for legacy entries that lack an explicit order.
 */
export async function getAllDownloadedTracks(): Promise<TrackMeta[]> {
  try {
    const db = await getDb();
    const entries = await db.getAll("tracks");
    const sorted = [...entries].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      // Fallback: preserve insertion order for entries with equal order
      return a.savedAt.localeCompare(b.savedAt);
    });
    return sorted.map(({ blob: _, ...meta }) => meta);
  } catch {
    return [];
  }
}

/**
 * Quick existence check — `true` if the track's audio is stored offline.
 */
export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const count = await db.count("tracks", trackId);
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Remove a single track (and its download meta) from IndexedDB.
 * Active blob URLs created via `URL.createObjectURL` are NOT revoked here —
 * the consumer (`useOfflineAudio` / components) owns those references and
 * should clean them up via their own lifecycle.
 */
export async function removeTrack(trackId: string): Promise<void> {
  const db = await getDb();
  await db.delete("tracks", trackId);
  await db.delete("downloads_meta", trackId);
}

// ─── Reorder ────────────────────────────────────────────────────────────────

/**
 * Update the display order of all downloaded tracks.
 *
 * Accepts an array of track IDs in the desired order. Each track's `order`
 * field is set to its index in the array so the list renders correctly.
 *
 * Tracks not in the array are left unchanged (they keep their existing order
 * and will appear after the explicitly ordered tracks).
 */
export async function reorderTracks(trackIds: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("tracks", "readwrite");
  for (let i = 0; i < trackIds.length; i++) {
    const existing = await tx.store.get(trackIds[i]);
    if (existing) {
      await tx.store.put({ ...existing, order: i });
    }
  }
  await tx.done;
}

// ─── Download Meta ──────────────────────────────────────────────────────────

/**
 * Upsert download-progress info so the UI can show a progress bar even
 * across page reloads.
 */
export async function updateDownloadMeta(
  trackId: string,
  meta: Partial<DownloadProgress>,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get("downloads_meta", trackId);
  const next: DownloadMeta = {
    trackId,
    status: meta.status ?? existing?.status ?? "downloading",
    progress: meta.progress ?? existing?.progress ?? 0,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    fileSize: meta.fileSize ?? existing?.fileSize ?? 0,
  };
  await db.put("downloads_meta", next);
}

/**
 * Retrieve current download progress for a track. Returns `undefined` if
 * no download has been started for this track.
 */
export async function getDownloadMeta(
  trackId: string,
): Promise<DownloadMeta | undefined> {
  try {
    const db = await getDb();
    return await db.get("downloads_meta", trackId);
  } catch {
    return undefined;
  }
}

// ─── Storage Info ───────────────────────────────────────────────────────────

/**
 * Query the Storage Manager API for the current origin's usage and quota.
 *
 * Returns `{ used, quota }` in bytes. `quota` is `null` when the API isn't
 * supported or throws (e.g. cross-origin iframes).
 */
export async function getStorageInfo(): Promise<{
  used: number;
  quota: number | null;
}> {
  try {
    if (!navigator.storage?.estimate) {
      return { used: 0, quota: null };
    }
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage ?? 0,
      quota: estimate.quota ?? null,
    };
  } catch {
    return { used: 0, quota: null };
  }
}

/**
 * Request persistent storage so the browser is less likely to evict our
 * offline tracks under storage pressure. Best-effort — the browser may
 * still deny the request.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// ─── Bulk Operations ────────────────────────────────────────────────────────

/**
 * Wipe all offline data (tracks + download meta). Resets the DB connection
 * so a future `openDB` call can run an `upgrade` if the schema changes.
 */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear("tracks");
  await db.clear("downloads_meta");
  dbPromise = null;
}
