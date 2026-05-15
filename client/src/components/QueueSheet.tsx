/**
 * QueueSheet — bottom-sheet queue manager
 *
 * Shows the up-next queue with drag-to-reorder (up/down buttons),
 * remove, and play controls.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Music2,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListMusic,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import type { Track } from "../../../shared/schema";

interface QueueSheetProps {
  open: boolean;
  onClose: () => void;
}

function QueueTrackRow({
  track,
  index,
  isCurrent,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  track: Track;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
        isCurrent ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-white/5",
      )}
    >
      {/* Drag handle */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Move up"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Move down"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Cover */}
      <button
        type="button"
        onClick={onPlay}
        className={cn(
          "relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
          !track.coverUrl && "bg-gradient-to-br",
          track.coverUrl ? "" : track.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
        )}
      >
        {track.coverUrl && (
          <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Music2 className="h-4 w-4 text-white" />
          </div>
        )}
      </button>

      {/* Info */}
      <button
        type="button"
        onClick={onPlay}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-medium leading-tight">{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-rose-400 transition-colors"
        aria-label="Remove from queue"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function QueueSheet({ open, onClose }: QueueSheetProps) {
  const {
    queue,
    queueIndex,
    active,
    setActive,
    setAutoPlay,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayer();

  // Items after the current index are "up next"
  const upNext = queue.slice(queueIndex + 1);
  const hasAny = upNext.length > 0;

  const handlePlay = (track: Track) => {
    setAutoPlay(true);
    setActive(track);
  };

  const handleRemove = (index: number) => {
    removeFromQueue(queueIndex + 1 + index);
  };

  const handleMoveUp = (index: number) => {
    const from = queueIndex + 1 + index;
    reorderQueue(from, from - 1);
  };

  const handleMoveDown = (index: number) => {
    const from = queueIndex + 1 + index;
    reorderQueue(from, from + 1);
  };

  const nowPlaying = queue.length > 0 && queueIndex >= 0 ? queue[queueIndex] : active;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-background shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Queue</h2>
                {upNext.length > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {upNext.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {hasAny && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearQueue}
                    className="h-7 text-xs text-muted-foreground hover:text-rose-400"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Now playing */}
            {nowPlaying && (
              <div className="px-4 pt-3 pb-2">
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Now Playing
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <div
                    className={cn(
                      "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                      !nowPlaying.coverUrl && "bg-gradient-to-br",
                      nowPlaying.coverUrl ? "" : nowPlaying.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                    )}
                  >
                    {nowPlaying.coverUrl && (
                      <img src={nowPlaying.coverUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{nowPlaying.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{nowPlaying.artist}</div>
                  </div>
                  <Music2 className="h-4 w-4 shrink-0 text-primary" />
                </div>
              </div>
            )}

            {/* Up Next list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
              {!hasAny ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <ListMusic className="mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Queue is empty</p>
                  <p className="mt-1 text-xs text-muted-foreground/50">
                    Use <strong>Play next</strong> or <strong>Add to queue</strong> from any track to build your queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Up Next
                  </div>
                  {upNext.map((track, idx) => (
                    <QueueTrackRow
                      key={`${track.id}-${queueIndex + 1 + idx}`}
                      track={track}
                      index={idx}
                      isCurrent={false}
                      onPlay={() => handlePlay(track)}
                      onRemove={() => handleRemove(idx)}
                      onMoveUp={() => handleMoveUp(idx)}
                      onMoveDown={() => handleMoveDown(idx)}
                      isFirst={idx === 0}
                      isLast={idx === upNext.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
