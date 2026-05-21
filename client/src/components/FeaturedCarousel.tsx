"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import type { Track } from "../../../shared/schema";

// ─── Props ───────────────────────────────────────────────────────────────────

interface FeaturedCarouselProps {
  tracks: Track[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FeaturedCarousel({ tracks }: FeaturedCarouselProps) {
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [tracks, updateScrollButtons]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    const gap = 12; // matches gap-3
    const scrollAmount = (card?.offsetWidth ?? 260) + gap;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handlePlay = (track: Track) => {
    if (active?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setAutoPlay(true);
      setActive(track);
    }
  };

  if (tracks.length === 0) return null;

  return (
    <section className="relative" aria-label="Featured releases">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-400" />
          <h2 className="text-base font-semibold sm:text-lg">New Releases</h2>
        </div>

        {/* Arrow buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition",
              canScrollLeft
                ? "text-foreground hover:bg-white/10"
                : "text-muted-foreground/30 cursor-not-allowed",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Next"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition",
              canScrollRight
                ? "text-foreground hover:bg-white/10"
                : "text-muted-foreground/30 cursor-not-allowed",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable track grid */}
      <div className="relative">
        {/* Fade edge indicators */}
        <div
          className={cn(
            "pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background to-transparent transition-opacity",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background to-transparent transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {tracks.map((track) => {
            const isActive = active?.id === track.id;
            const isPlayingTrack = isActive && isPlaying;

            return (
              <div
                key={track.id}
                className="group relative w-[200px] shrink-0 sm:w-[220px] lg:w-[240px]"
              >
                <div
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 transition group-hover:border-white/20",
                    !track.coverUrl && "bg-gradient-to-br",
                    track.coverUrl ? "" : track.coverGradient,
                  )}
                >
                  {track.coverUrl && (
                    <img
                      src={track.coverUrl}
                      alt={`${track.title} cover`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                  )}

                  {/* Play overlay */}
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition group-hover:bg-black/40"
                    onClick={() => handlePlay(track)}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full transition",
                        "shadow-[0_4px_20px_-4px_rgba(16,185,129,.7)]",
                        isPlayingTrack
                          ? "bg-primary scale-100 opacity-100"
                          : "bg-primary/90 opacity-0 group-hover:scale-100 group-hover:opacity-100",
                      )}
                    >
                      {isPlayingTrack ? (
                        <Pause className="h-5 w-5 translate-x-0 text-white" />
                      ) : (
                        <Play className="h-5 w-5 translate-x-px text-white" />
                      )}
                    </div>
                  </div>

                  {/* Now playing badge */}
                  {isPlayingTrack && (
                    <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Now playing
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="mt-2 px-0.5">
                  <p className="truncate text-sm font-medium">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                  {track.genre && (
                    <span className="mt-0.5 inline-block rounded-full border border-white/8 bg-white/3 px-2 py-0.5 text-[10px] text-muted-foreground/70">
                      {track.genre}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
