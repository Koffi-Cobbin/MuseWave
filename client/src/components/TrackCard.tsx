/**
 * Shared TrackCard component
 * Used by: home.tsx, discover.tsx, artist.tsx
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Music2, Pause, Play } from "lucide-react";
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
  const isActiveAndPlaying = isActive && isPlaying;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group glass glow noise overflow-hidden rounded-2xl p-3 transition-all",
        isActive && "ring-1 ring-primary/60 bg-primary/5"
      )}
      data-testid={`card-track-${track.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Cover art with play/pause overlay */}
        <div
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 cursor-pointer",
            !track.coverUrl && "bg-gradient-to-br",
            track.coverUrl ? "" : track.coverGradient,
          )}
          onClick={() => onPlay(track)}
          role="button"
          aria-label={isActiveAndPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={`${track.title} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-50 blur-[10px]" />
          )}

          {/* Play/pause circle */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-150",
              isActive
                ? "bg-black/40"
                : "bg-black/20 opacity-0 group-hover:opacity-100"
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm">
              {isActiveAndPlaying
                ? <Pause className="h-3 w-3 fill-current text-background" />
                : <Play className="h-3 w-3 translate-x-px fill-current text-background" />
              }
            </div>
          </div>
        </div>

        {/* Track info */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className="truncate text-sm font-semibold leading-tight"
            data-testid={`text-track-title-${track.id}`}
          >
            {track.title}
          </div>
          <Link
            href={`/artist/${track.artistSlug}`}
            className="mt-0.5 flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`link-track-artist-${track.id}`}
          >
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{track.artist}</span>
          </Link>
          {track.genre && (
            <div className="mt-1.5">
              <Badge
                variant="secondary"
                className="border-white/10 bg-white/5 px-2 py-0.5 text-xs font-normal"
              >
                {track.genre}
              </Badge>
            </div>
          )}
        </div>

        {/* Actions menu — shown to authenticated users; owner gets extra controls */}
        {(isAuthenticated || isOwner) && (
          <div className="shrink-0 self-start">
            <TrackActionsMenu
              track={track}
              isOwner={isOwner}
              size="sm"
              variant="ghost"
              onTrackDeleted={onTrackDeleted}
              onTrackUpdated={onTrackUpdated}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}