/**
 * RecentlyPlayed — horizontal scroll row of compact track cards.
 * Shown on the home page above New Releases when the user has listening history.
 */

import { useRef } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import type { Track } from "../../../shared/schema";

interface RecentlyPlayedProps {
  onPlay: (track: Track) => void;
}

export function RecentlyPlayed({ onPlay }: RecentlyPlayedProps) {
  const { active, isPlaying } = usePlayer();
  const { recentTracks, clearHistory } = useRecentlyPlayed();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (recentTracks.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <section className="mb-5 sm:mb-6" aria-label="Recently played">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 shrink-0 text-sky-400" />
          <h2 className="text-base font-semibold sm:text-lg">Recently Played</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Scroll arrows — hidden on touch devices */}
          <button
            type="button"
            onClick={() => scroll("left")}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Clear history */}
          <button
            type="button"
            onClick={clearHistory}
            className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground/60 transition hover:bg-white/8 hover:text-muted-foreground"
            aria-label="Clear recently played history"
            data-testid="button-clear-recently-played"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Scrollable track row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {recentTracks.map((track, i) => {
          const isActive = active?.id === track.id;
          const isActiveAndPlaying = isActive && isPlaying;

          return (
            <motion.button
              key={track.id}
              type="button"
              onClick={() => onPlay(track)}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              whileHover={{ y: -2, transition: { duration: 0.12 } }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "group relative flex w-[108px] shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 sm:w-[124px]",
                isActive
                  ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_16px_-6px] shadow-primary/30"
                  : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]",
              )}
              aria-label={isActiveAndPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              data-testid={`button-recently-played-${track.id}`}
            >
              {/* Active glow line */}
              {isActive && (
                <motion.div
                  layoutId="recently-played-active-glow"
                  className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}

              {/* Cover art */}
              <div className="relative aspect-square w-full overflow-hidden bg-white/5">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={`${track.title} cover`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="h-full w-full bg-gradient-to-br from-emerald-500/30 to-fuchsia-500/20"
                    style={
                      track.coverGradient
                        ? { backgroundImage: `linear-gradient(135deg, ${track.coverGradient})` }
                        : undefined
                    }
                  />
                )}

                {/* Play/pause overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200",
                    isActiveAndPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md">
                    {isActiveAndPlaying ? (
                      <Pause className="h-3.5 w-3.5 fill-current text-background" />
                    ) : (
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-current text-background" />
                    )}
                  </div>
                </div>
              </div>

              {/* Track info */}
              <div className="flex flex-col gap-0.5 px-2 py-2">
                <span
                  className={cn(
                    "truncate text-xs font-semibold leading-tight",
                    isActive ? "text-primary" : "text-white/90",
                  )}
                  data-testid={`text-recently-played-title-${track.id}`}
                >
                  {track.title}
                </span>
                <span className="truncate text-[10px] text-muted-foreground/70">
                  {track.artist}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
