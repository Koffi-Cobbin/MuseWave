/**
 * Downloads Page — lists all tracks saved offline with play/remove controls
 * and a storage usage bar.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "@/contexts/player-context";
import { useOffline } from "@/contexts/offline-context";
import { useToast } from "@/hooks/use-toast";
import { secondsToTime } from "@/lib/utils";
import { getTrackMeta } from "@/lib/offlineStorage";
import type { Track } from "@shared/schema";
import { Play, Trash2, HardDrive, Music } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Downloads() {
  const {
    downloads,
    downloadForOffline,
    removeDownload,
    downloadProgress,
    isOnline,
    storageUsed,
    storageQuota,
  } = useOffline();
  const { setQueue, insertNext } = usePlayer();
  const { toast } = useToast();

  const [coverBlobUrls, setCoverBlobUrls] = useState<Record<string, string>>(
    {},
  );
  const prevIds = useRef<string>("");

  // Load cover blobs from IndexedDB whenever the downloads list changes
  useEffect(() => {
    const ids = downloads.map((t) => t.id).join(",");
    if (ids === prevIds.current) return;
    prevIds.current = ids;

    const idToUrl: Record<string, string> = {};
    let cancelled = false;

    Promise.all(
      downloads.map(async (track) => {
        const meta = await getTrackMeta(track.id);
        return { id: track.id, coverBlob: meta?.coverBlob ?? null };
      }),
    ).then((results) => {
      if (cancelled) return;
      results.forEach(({ id, coverBlob }) => {
        if (coverBlob) {
          idToUrl[id] = URL.createObjectURL(coverBlob);
        }
      });
      setCoverBlobUrls(idToUrl);
    });

    return () => {
      cancelled = true;
      // Revoke URLs that were just created in this effect run
      Object.values(idToUrl).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [downloads]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePlay = useCallback(
    (track: Track) => {
      setQueue([track], 0);
    },
    [setQueue],
  );

  const handlePlayNext = useCallback(
    (track: Track) => {
      insertNext(track);
      toast({ title: "Playing next", description: track.title });
    },
    [insertNext, toast],
  );

  const handleRemove = useCallback(
    async (track: Track) => {
      await removeDownload(track.id);
      // Revoke the cover blob URL if one existed
      setCoverBlobUrls((prev) => {
        const url = prev[track.id];
        if (url) URL.revokeObjectURL(url);
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
      toast({
        title: "Removed",
        description: `"${track.title}" removed from offline storage.`,
      });
    },
    [removeDownload, toast],
  );

  // ── Storage bar ──────────────────────────────────────────────────────────

  const storagePercent =
    storageQuota && storageQuota > 0
      ? Math.min(100, Math.round((storageUsed / storageQuota) * 100))
      : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Downloads</h1>
        {downloads.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {downloads.length} track{downloads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Storage bar ── */}
      {storageQuota !== null && storageQuota > 0 && (
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>
              {formatBytes(storageUsed)} of {formatBytes(storageQuota)} used
            </span>
            <span className="ml-auto font-medium">{storagePercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Downloads grid or empty state ── */}
      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">No offline tracks</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Download tracks to listen offline. Look for the{" "}
            <span className="font-medium text-foreground">Save Offline</span>{" "}
            option on any track's menu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {downloads.map((track) => {
            const coverSrc =
              coverBlobUrls[track.id] ?? track.coverUrl ?? undefined;
            const isDownloading = track.id in downloadProgress;
            const progress = downloadProgress[track.id] ?? 0;

            return (
              <div
                key={track.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/[0.07]"
                data-testid={`card-download-${track.id}`}
              >
                {/* ── Cover art ── */}
                <div className="relative aspect-square w-full overflow-hidden">
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={`${track.title} cover`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/10 to-fuchsia-500/10">
                      <Music className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Download progress overlay */}
                  {isDownloading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            className="text-white/10"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            cx="18"
                            cy="18"
                            r="15"
                          />
                          <circle
                            className="text-emerald-400"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            cx="18"
                            cy="18"
                            r="15"
                            strokeDasharray={`${(progress / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-xs font-medium">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Track info ── */}
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold">
                    {track.title}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artist}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{secondsToTime(track.audioDuration)}</span>
                    <span>{formatBytes(track.audioFileSize)}</span>
                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlay(track)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/80 py-1.5 text-xs font-medium text-white transition hover:bg-primary"
                      data-testid={`button-download-play-${track.id}`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayNext(track)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-white/5"
                      title="Play next"
                      data-testid={`button-download-play-next-${track.id}`}
                    >
                      <Play className="h-3 w-3" />
                      <span className="text-[10px] font-medium">NEXT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(track)}
                      className="flex items-center justify-center rounded-lg border border-white/10 p-1.5 text-muted-foreground transition hover:border-red-500/30 hover:text-red-400"
                      title="Remove from offline storage"
                      data-testid={`button-download-remove-${track.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
