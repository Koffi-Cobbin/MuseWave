/**
 * Re-imagined TrackCard component
 * Used by: home.tsx, discover.tsx, artist.tsx
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Music2, Pause, Play, Heart, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import { useAuth } from "@/contexts/auth-context";
import { TrackActionsMenu } from "@/components/playlists/TrackActionsMenu";
import type { Track } from "../../../shared/schema";

interface TrackCardProps {
  track: Track;
  onPlay: (t: Track) => void;
  /** Whether this track is currently loaded in the player */
  isActive: boolean;
  /** Optional animation stagger index */
  index?: number;
  /** When true, shows owner management actions (edit, delete) in the menu */
  isOwner?: boolean;
  /** Called after a successful deletion so the parent can remove the track */
  onTrackDeleted?: (trackId: string) => void;
  /** Called after a successful edit so the parent can update local state */
  onTrackUpdated?: (track: Track) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrackCard({
  track,
  onPlay,
  isActive,
  index = 0,
  isOwner = false,
  onTrackDeleted,
  onTrackUpdated,
}: TrackCardProps) {
  const { isPlaying } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [imgLoaded, setImgLoaded] = useState(false);
  const isActiveAndPlaying = isActive && isPlaying;

  const accentStyle = track.coverGradient
    ? { backgroundImage: `linear-gradient(135deg, ${track.coverGradient})` }
    : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        isActive
          ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_20px_-8px] shadow-primary/20"
          : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]",
      )}
      data-testid={`card-track-${track.id}`}
    >
      {/* Active track glow line at top */}
      {isActive && (
        <motion.div
          layoutId="active-track-glow"
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <div className="flex items-center gap-3 p-2.5 sm:gap-4 sm:p-3">
        {/* ── Cover art ── */}
        <div
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border cursor-pointer transition-shadow duration-200 sm:h-16 sm:w-16",
            isActive ? "border-primary/30 shadow-sm shadow-primary/10" : "border-white/10",
            !track.coverUrl && !accentStyle && "bg-gradient-to-br from-emerald-500/20 to-fuchsia-500/20",
          )}
          style={!track.coverUrl ? accentStyle : undefined}
          onClick={() => onPlay(track)}
          role="button"
          aria-label={isActiveAndPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {/* Cover image */}
          {track.coverUrl && (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-white/5" />
              )}
              <img
                src={track.coverUrl}
                alt={`${track.title} cover`}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0",
                )}
                onLoad={() => setImgLoaded(true)}
              />
            </>
          )}

          {/* Play/pause overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{
              backgroundColor: isActive
                ? "rgba(0,0,0,0.45)"
                : "rgba(0,0,0,0)",
            }}
            whileHover={{
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-full shadow-lg"
              style={{
                backgroundColor: isActiveAndPlaying ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0)",
                backdropFilter: isActiveAndPlaying ? undefined : "blur(4px)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              {isActiveAndPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current text-background" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current text-white/80" />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* ── Track info ── */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm font-semibold leading-tight transition-colors",
                isActive ? "text-primary" : "text-foreground",
              )}
              data-testid={`text-track-title-${track.id}`}
            >
              {track.title}
            </span>
          </div>

          {/* Artist row */}
          <Link
            href={`/artist/${track.artistSlug}`}
            className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`link-track-artist-${track.id}`}
          >
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{track.artist}</span>
          </Link>

          {/* Metadata row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {track.genre && (
              <Badge
                variant="secondary"
                className={cn(
                  "border px-1.5 py-0 text-[10px] font-normal leading-none",
                  isActive
                    ? "border-primary/25 bg-primary/10 text-primary/80"
                    : "border-white/10 bg-white/5 text-muted-foreground",
                )}
              >
                {track.genre}
              </Badge>
            )}

            {/* Play count */}
            {typeof track.plays === "number" && track.plays > 0 && (
              <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground/50">
                <Headphones className="h-2.5 w-2.5" />
                {formatCount(track.plays)}
              </span>
            )}

            {/* Like count */}
            {typeof track.likes === "number" && track.likes > 0 && (
              <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground/50">
                <Heart className="h-2.5 w-2.5" />
                {formatCount(track.likes)}
              </span>
            )}

            {/* Published year */}
            {track.publishedAt && (
              <span className="text-[10px] text-muted-foreground/40">
                {new Date(track.publishedAt).getFullYear()}
              </span>
            )}

            {/* Duration — bottom right */}
            {track.audioDuration ? (
              <span className="ml-auto shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground/50">
                {formatDuration(track.audioDuration)}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Actions menu ── */}
        <div className="shrink-0 self-start pt-0.5 sm:self-center">
          {(isAuthenticated || isOwner) ? (
            <TrackActionsMenu
              track={track}
              isOwner={isOwner}
              size="sm"
              variant="ghost"
              onTrackDeleted={onTrackDeleted}
              onTrackUpdated={onTrackUpdated}
            />
          ) : (
            <button
              type="button"
              onClick={() => onPlay(track)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                "opacity-0 group-hover:opacity-100",
                "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
              )}
              aria-label={`Play ${track.title}`}
            >
              <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
