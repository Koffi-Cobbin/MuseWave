"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import type { Track } from "../../../shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeaturedTrackItem {
  /** The full track data (auto-converted to camelCase by apiRequestJson). */
  track: Track;
  /** Optional editorial label (e.g. "Editor's Pick", "New Release"). */
  label?: string;
}

interface FeaturedSectionProps {
  items: FeaturedTrackItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROTATION_INTERVAL_MS = 5_000;

// ─── Component ───────────────────────────────────────────────────────────────

export function FeaturedSection({ items }: FeaturedSectionProps) {
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } =
    usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const current = items[currentIndex];

  // ── Auto-rotation ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(id);
  }, [items.length, isPaused]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPaused(false);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1,
    );
    setIsPaused(false);
  }, [items.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsPaused(false);
  }, [items.length]);

  // ── Play handler ───────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (!current) return;
    if (active?.id === current.track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setAutoPlay(true);
      setActive(current.track);
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (items.length === 0 || !current) return null;

  const { track } = current;
  const isActiveTrack = active?.id === track.id;
  const isPlayingTrack = isActiveTrack && isPlaying;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured tracks"
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      {track.coverUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: `url(${track.coverUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        </>
      )}
      {!track.coverUrl && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            track.coverGradient || "from-emerald-800/40 to-fuchsia-800/30",
          )}
        />
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-4 p-6 sm:p-8 lg:p-10">
        {/* Header row — badge */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Featured
          </span>
          {current.label && (
            <span className="ml-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              {current.label}
            </span>
          )}
        </div>

        {/* Track display — cover + info */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          {/* Cover art */}
          <div
            className={cn(
              "relative aspect-square w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-xl sm:w-44 lg:w-52",
              !track.coverUrl && "bg-gradient-to-br",
              track.coverUrl ? "" : track.coverGradient,
            )}
          >
            {track.coverUrl && (
              <img
                src={track.coverUrl}
                alt={`${track.title} cover`}
                className="h-full w-full object-cover"
              />
            )}

            {/* Mobile play overlay */}
            <div
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition hover:bg-black/30 sm:hidden"
              onClick={handlePlay}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_20px_-4px_rgba(16,185,129,.7)] transition",
                  isPlayingTrack
                    ? "bg-primary scale-100 opacity-100"
                    : "bg-primary/90 opacity-70",
                )}
              >
                {isPlayingTrack ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 translate-x-px text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Track info + play button (desktop) */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-xl font-bold sm:text-2xl lg:text-3xl">
                {track.title}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">
                {track.artist}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {track.genre && (
                <span className="w-fit rounded-full border border-white/8 bg-white/3 px-3 py-0.5 text-xs text-muted-foreground/70">
                  {track.genre}
                </span>
              )}
              {track.audioDuration > 0 && (
                <span className="text-xs text-muted-foreground/50">
                  {formatDuration(track.audioDuration)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handlePlay}
              className="mt-1 hidden w-fit items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 sm:flex"
              aria-label={isPlayingTrack ? "Pause" : "Play"}
            >
              {isPlayingTrack ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlayingTrack ? "Pause" : "Play"}
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to featured track ${i + 1}`}
                className={cn(
                  "h-2 shrink-0 rounded-full transition-[width]",
                  i === currentIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-white/30 hover:bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}
