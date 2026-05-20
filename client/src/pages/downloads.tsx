import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { usePlayer } from "@/contexts/player-context";
import { useOffline } from "@/contexts/offline-context";
import { useToast } from "@/hooks/use-toast";
import { secondsToTime } from "@/lib/utils";
import { getTrackMeta } from "@/lib/offlineStorage";
import type { Track } from "@shared/schema";
import {
  ArrowLeft,
  Download,
  HardDrive,
  Music,
  Play,
  Trash2,
  ListEnd,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Downloads() {
  const {
    downloads,
    removeDownload,
    downloadProgress,
    storageUsed,
    storageQuota,
  } = useOffline();
  const { setQueue, insertNext, active } = usePlayer();
  const { toast } = useToast();

  const [coverBlobUrls, setCoverBlobUrls] = useState<Record<string, string>>({});
  const prevIds = useRef<string>("");

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
        if (coverBlob) idToUrl[id] = URL.createObjectURL(coverBlob);
      });
      setCoverBlobUrls(idToUrl);
    });

    return () => {
      cancelled = true;
      Object.values(idToUrl).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [downloads]);

  const handlePlay = useCallback((track: Track) => {
    setQueue([track], 0);
  }, [setQueue]);

  const handlePlayNext = useCallback((track: Track) => {
    insertNext(track);
    toast({ title: "Playing next", description: track.title });
  }, [insertNext, toast]);

  const handleRemove = useCallback(async (track: Track) => {
    await removeDownload(track.id);
    setCoverBlobUrls((prev) => {
      const url = prev[track.id];
      if (url) URL.revokeObjectURL(url);
      const next = { ...prev };
      delete next[track.id];
      return next;
    });
    toast({ title: "Removed", description: `"${track.title}" removed from offline storage.` });
  }, [removeDownload, toast]);

  const storagePercent =
    storageQuota && storageQuota > 0
      ? Math.min(100, Math.round((storageUsed / storageQuota) * 100))
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 pb-44 sm:px-4 sm:py-6 sm:pb-36 lg:py-8 lg:pb-8">

        {/* ── Header ── */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="secondary"
                size="sm"
                className="border-white/10 bg-white/5"
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5 opacity-40" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20 border border-white/10">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight sm:text-lg" data-testid="text-downloads-heading">
                  Downloads
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {downloads.length} track{downloads.length !== 1 ? "s" : ""} saved offline
                </p>
              </div>
            </div>
          </div>

          {downloads.length > 0 && (
            <span className="text-xs text-muted-foreground sm:hidden">
              {downloads.length} track{downloads.length !== 1 ? "s" : ""}
            </span>
          )}
        </header>

        {/* ── Storage bar ── */}
        {storageQuota !== null && storageQuota > 0 && (
          <div className="mb-5 glass noise rounded-2xl border border-white/10 p-4">
            <div className="mb-2.5 flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {formatBytes(storageUsed)} used
                {storageQuota > 0 && (
                  <span className="text-muted-foreground/60"> of {formatBytes(storageQuota)}</span>
                )}
              </span>
              <span className="font-medium tabular-nums text-foreground">{storagePercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {downloads.length === 0 ? (
          <div className="glass noise rounded-2xl border border-white/10 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 to-fuchsia-500/10">
              <Music className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="mb-2 text-base font-semibold">No offline tracks</h2>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              Save tracks for offline listening by tapping{" "}
              <span className="font-medium text-foreground">Save Offline</span>{" "}
              in any track's menu.
            </p>
          </div>
        ) : (
          /* ── Track list ── */
          <div className="glass noise rounded-2xl border border-white/10 overflow-hidden" data-testid="downloads-track-list">
            {downloads.map((track, index) => {
              const coverSrc = coverBlobUrls[track.id] ?? track.coverUrl ?? undefined;
              const isDownloading = track.id in downloadProgress;
              const progress = downloadProgress[track.id] ?? 0;
              const isActive = active?.id === track.id;

              return (
                <div key={track.id}>
                  {index > 0 && <Separator className="opacity-[0.07]" />}
                  <div
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-colors",
                      isActive ? "bg-primary/8" : "hover:bg-white/5",
                    )}
                    data-testid={`card-download-${track.id}`}
                  >
                    {/* Cover */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={`${track.title} cover`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/15 to-fuchsia-500/10">
                          <Music className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Download progress overlay */}
                      {isDownloading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                            <circle className="text-white/10" stroke="currentColor" strokeWidth="3.5" fill="none" cx="18" cy="18" r="14" />
                            <circle
                              className="text-emerald-400"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              fill="none"
                              cx="18"
                              cy="18"
                              r="14"
                              strokeDasharray={`${(progress / 100) * 87.96} 87.96`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Active indicator */}
                      {isActive && !isDownloading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                          <div className="flex gap-[3px] items-end h-4">
                            {[1, 2, 3].map((b) => (
                              <div
                                key={b}
                                className="w-[3px] rounded-sm bg-primary animate-pulse"
                                style={{ height: `${[60, 100, 75][b - 1]}%`, animationDelay: `${b * 0.15}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", isActive && "text-primary")}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                    </div>

                    {/* Duration + size */}
                    <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">{secondsToTime(track.audioDuration)}</span>
                      <span className="text-[10px] text-muted-foreground/60">{formatBytes(track.audioFileSize)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePlay(track)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary transition hover:bg-primary/25"
                        title="Play"
                        data-testid={`button-download-play-${track.id}`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePlayNext(track)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                        title="Play next"
                        data-testid={`button-download-play-next-${track.id}`}
                      >
                        <ListEnd className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(track)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-red-500/30 hover:text-red-400"
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
    </div>
  );
}
