/**
 * Offline Context — React context providing download state, progress
 * tracking, online/offline detection, and actions for saving tracks
 * offline or removing them.
 *
 * Wraps the app and is consumed by PlayerBar, BottomNav / SidebarNav,
 * action menus, and the Downloads page.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Track } from "../../../shared/schema";
import {
  saveTrack,
  getAllDownloadedTracks,
  isTrackDownloaded as checkStorage,
  removeTrack as removeFromStorage,
  updateDownloadMeta,
  getStorageInfo,
  requestPersistentStorage,
  type TrackMeta,
} from "@/lib/offlineStorage";

// ─── Public Interface ───────────────────────────────────────────────────────

interface OfflineContextType {
  /** All tracks currently saved offline (full Track metadata). */
  downloads: Track[];

  /** Synchronous quick-check — `true` if the track is stored offline. */
  isTrackDownloaded: (id: string) => boolean;

  /** Per-track download progress: trackId → 0–100. Only shown while active. */
  downloadProgress: Record<string, number>;

  /** `true` when the browser reports a network connection. */
  isOnline: boolean;

  /** Storage used by this origin, in bytes. Updated after each download. */
  storageUsed: number;

  /** Storage quota for this origin, in bytes (null if unavailable). */
  storageQuota: number | null;

  /** Fetch the track's audio and persist it in IndexedDB for offline playback. */
  downloadForOffline: (track: Track) => Promise<void>;

  /** Delete a previously saved offline track from IndexedDB. */
  removeDownload: (trackId: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<Track[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota] = useState<number | null>(null);

  // Ref to prevent concurrent downloads of the same track
  const activeDownloads = useRef<Set<string>>(new Set());

  // ── Bootstrap ──────────────────────────────────────────────────────────

  /** Reload the full downloads list and downloaded-IDs set from IndexedDB. */
  const refreshDownloads = useCallback(async () => {
    const all: TrackMeta[] = await getAllDownloadedTracks();
    setDownloads(all.map((entry) => entry.track));
    setDownloadedIds(new Set(all.map((entry) => entry.id)));
  }, []);

  /** Refresh storage usage from the Storage Manager API. */
  const refreshStorageInfo = useCallback(async () => {
    const info = await getStorageInfo();
    setStorageUsed(info.used);
  }, []);

  // Load existing downloads and request persistent storage on mount
  useEffect(() => {
    refreshDownloads();
    refreshStorageInfo();
    requestPersistentStorage(); // best-effort
  }, [refreshDownloads, refreshStorageInfo]);

  // ── Online detection ───────────────────────────────────────────────────

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Exported helpers ───────────────────────────────────────────────────

  const isDownloaded = useCallback(
    (id: string) => downloadedIds.has(id),
    [downloadedIds],
  );

  // ── Download for offline ───────────────────────────────────────────────

  const downloadForOffline = useCallback(
    async (track: Track) => {
      // Already stored — nothing to do
      if (downloadedIds.has(track.id)) return;

      // Already being downloaded right now
      if (activeDownloads.current.has(track.id)) return;
      activeDownloads.current.add(track.id);

      // Initialise progress
      setDownloadProgress((prev) => ({ ...prev, [track.id]: 0 }));
      await updateDownloadMeta(track.id, {
        status: "downloading",
        progress: 0,
        fileSize: track.audioFileSize,
      });

      try {
        // ── Fetch audio stream ──────────────────────────────────────
        const response = await fetch(track.audioUrl);
        if (!response.ok)
          throw new Error(
            `Failed to fetch audio (${response.status}: ${response.statusText})`,
          );

        const contentLength = response.headers.get("Content-Length");
        const total = contentLength
          ? parseInt(contentLength, 10)
          : track.audioFileSize || 0;

        let blob: Blob;

        if (response.body && total > 0) {
          // Stream with progress tracking
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            const pct = Math.min(
              99,
              Math.round((received / total) * 100),
            );
            setDownloadProgress((prev) => ({
              ...prev,
              [track.id]: pct,
            }));
            await updateDownloadMeta(track.id, { progress: pct });
          }

          blob = new Blob(chunks, {
            type: response.headers.get("Content-Type") || "audio/mpeg",
          });
        } else {
          // No streaming support — fall back to single blob fetch
          blob = await response.blob();
        }

        // ── Optionally fetch cover art ──────────────────────────────
        let coverBlob: Blob | null = null;
        if (track.coverUrl) {
          try {
            const coverResponse = await fetch(track.coverUrl);
            if (coverResponse.ok) {
              coverBlob = await coverResponse.blob();
            }
          } catch {
            // Cover is optional — ignore failures
          }
        }

        // ── Persist to IndexedDB ────────────────────────────────────
        await saveTrack(track, blob, coverBlob);

        // Mark complete
        await updateDownloadMeta(track.id, {
          status: "complete",
          progress: 100,
        });

        // Update local state
        await refreshDownloads();
        await refreshStorageInfo();
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[track.id];
          return next;
        });
      } catch (error) {
        await updateDownloadMeta(track.id, { status: "failed" });
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[track.id];
          return next;
        });
        throw error; // re-throw so the UI can show a toast
      } finally {
        activeDownloads.current.delete(track.id);
      }
    },
    [downloadedIds, refreshDownloads, refreshStorageInfo],
  );

  // ── Remove download ───────────────────────────────────────────────────

  const removeDownload = useCallback(
    async (trackId: string) => {
      await removeFromStorage(trackId);
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
      setDownloads((prev) => prev.filter((t) => t.id !== trackId));
      await refreshStorageInfo();
    },
    [refreshStorageInfo],
  );

  // ── Context value ─────────────────────────────────────────────────────

  return (
    <OfflineContext.Provider
      value={{
        downloads,
        isTrackDownloaded: isDownloaded,
        downloadProgress,
        isOnline,
        storageUsed,
        storageQuota,
        downloadForOffline,
        removeDownload,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
