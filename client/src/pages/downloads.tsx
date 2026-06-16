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
  GripVertical,
  HardDrive,
  Music,
  Play,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TrackActionsMenu } from "@/components/playlists/TrackActionsMenu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return value.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

export default function Downloads() {
  const {
    downloads,
    downloadProgress,
    storageUsed,
    storageQuota,
    clearAllDownloads,
    reorderDownloads,
  } = useOffline();
  const { playQueue, active } = usePlayer();
  const { toast } = useToast();

  const [coverBlobUrls, setCoverBlobUrls] = useState<Record<string, string>>({});
  const prevIds = useRef<string>("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);

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

  // Drag handlers
  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      dragItem.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).classList.add("opacity-30");
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragItem.current !== index) {
        setDragOverIndex(index);
      }
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => async (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = dragItem.current;
      dragItem.current = null;
      setDragOverIndex(null);

      if (fromIndex === null || fromIndex === toIndex) return;

      const reordered = [...downloads];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      await reorderDownloads(reordered.map((t) => t.id));
    },
    [downloads, reorderDownloads],
  );

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverIndex(null);
  }, []);

  // Touch drag handlers
  const touchDrag = useRef<{
    fromIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);

  const handleTouchStart = useCallback(
    (index: number) => (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchDrag.current = {
        fromIndex: index,
        startY: touch.clientY,
        currentY: touch.clientY,
      };
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchDrag.current) return;
      const touch = e.touches[0];
      touchDrag.current.currentY = touch.clientY;

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = target?.closest("[data-drag-index]");
      if (row) {
        const idx = parseInt(
          (row as HTMLElement).getAttribute("data-drag-index") ?? "",
          10,
        );
        if (!isNaN(idx) && idx !== touchDrag.current.fromIndex) {
          setDragOverIndex(idx);
        }
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      if (!touchDrag.current) return;
      const { fromIndex } = touchDrag.current;
      touchDrag.current = null;

      const target = document.elementFromPoint(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY,
      );
      const row = target?.closest("[data-drag-index]");
      let toIndex = fromIndex;
      if (row) {
        const idx = parseInt(
          (row as HTMLElement).getAttribute("data-drag-index") ?? "",
          10,
        );
        if (!isNaN(idx)) toIndex = idx;
      }

      setDragOverIndex(null);

      if (fromIndex === toIndex) return;

      const reordered = [...downloads];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      await reorderDownloads(reordered.map((t) => t.id));
    },
    [downloads, reorderDownloads],
  );

  const handlePlay = useCallback((track: Track) => {
    playQueue([track], 0);
  }, [playQueue]);



  const storagePercent =
    storageQuota && storageQuota > 0
      ? Math.min(100, Math.round((storageUsed / storageQuota) * 100))
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 pb-44 sm:px-4 sm:py-6 sm:pb-36 lg:py-8 lg:pb-8">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/">
              <Button
                variant="secondary"
                size="icon"
                className="shrink-0 border-white/10 bg-white/5 sm:w-auto sm:px-3"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline text-sm">Home</span>
              </Button>
            </Link>
            <Separator orientation="vertical" className="hidden h-5 opacity-40 sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-orange-400/30 to-fuchsia-500/20">
                <HardDrive className="h-4 w-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight sm:text-xl" data-testid="text-downloads-heading">
                  Downloads
                </h1>
                <p className="hidden truncate text-[10px] text-muted-foreground sm:block sm:text-xs">
                  {downloads.length} track{downloads.length !== 1 ? "s" : ""} saved offline
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Storage bar */}
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
                style={{ width: storagePercent + "%" }}
              />
            </div>
          </div>
        )}

        {/* Subtitle + Play All */}
        {downloads.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {downloads.length} track{downloads.length !== 1 ? "s" : ""} saved offline
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10"
              onClick={() => playQueue(downloads, 0)}
              data-testid="button-play-all-downloads"
            >
              <Play className="mr-1 h-3.5 w-3.5 fill-current" />
              Play All
            </Button>
          </div>
        )}

        {/* Empty state */}
        {downloads.length === 0 ? (
          <div className="glass noise rounded-2xl border border-white/10 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 to-fuchsia-500/10">
              <Music className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="mb-2 text-base font-semibold">No offline tracks</h2>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              Save tracks for offline listening by tapping{" "}
              <span className="font-medium text-foreground">Save Offline</span>{" "}
              in any track&apos;s menu.
            </p>
          </div>
        ) : (
          <>
          {/* Track list */}
          <div className="glass noise rounded-2xl border border-white/10 overflow-hidden" data-testid="downloads-track-list">
            {downloads.map((track, index) => {
              const coverSrc = coverBlobUrls[track.id] ?? track.coverUrl ?? undefined;
              const isDownloading = track.id in downloadProgress;
              const progress = downloadProgress[track.id] ?? 0;
              const isActive = active?.id === track.id;
              const isDragOver = dragOverIndex === index;

              return (
                <div key={track.id} data-drag-index={index}>
                  {index > 0 && <Separator className="opacity-[0.07]" />}
                  <div
                    draggable
                    data-drag-index={index}
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver(index)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart(index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-3 transition-colors",
                      isActive ? "bg-primary/8" : "hover:bg-white/5",
                      isDragOver && "bg-white/10",
                    )}
                    data-testid={"card-download-" + track.id}
                  >
                    {/* Drag handle */}
                    <button
                      type="button"
                      className="flex h-8 w-6 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center touch-none select-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    {/* Cover */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={track.title + " cover"}
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
                              strokeDasharray={(progress / 100) * 87.96 + " 87.96"}
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
                                style={{ height: [60, 100, 75][b - 1] + "%", animationDelay: b * 0.15 + "s" }}
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
                        data-testid={"button-download-play-" + track.id}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                      <TrackActionsMenu track={track} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clear All */}
          <div className="mt-6 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:border-red-500/50 hover:text-red-300"
                  data-testid="button-clear-all"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Clear all downloads?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all {downloads.length} track
                    {downloads.length !== 1 ? "s" : ""} from offline storage.
                    You will need an internet connection to download them again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      await clearAllDownloads();
                      // Revoke all cover blob URLs
                      Object.values(coverBlobUrls).forEach((url) =>
                        URL.revokeObjectURL(url),
                      );
                      setCoverBlobUrls({});
                      toast({
                        title: "Cleared",
                        description: "All offline tracks have been removed.",
                      });
                    }}
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
