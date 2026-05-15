import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Download,
  Share2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music2,
  ExternalLink,
  Volume2,
  ListMusic,
  Repeat,
  Repeat1,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, API_ENDPOINTS, downloadTrack } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track } from "../../../shared/schema";

interface PlayScreenProps {
  open: boolean;
  onClose: () => void;
  currentTime: number;
  duration: number;
  isLiked: boolean;
  isLiking: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onLike: () => void;
  onSeekDelta: (delta: number) => void;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  onOpenQueue?: () => void;
}

function formatTime(t: number) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProgressBar({
  currentTime,
  duration,
  onSeek,
  light = false,
}: {
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
  light?: boolean;
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div className="w-full">
      <div className="relative h-1 w-full rounded-full bg-white/20">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-150 pointer-events-none"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          step="0.1"
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5 w-full cursor-pointer opacity-0"
          data-testid="input-play-screen-seek"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/60 tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>-{formatTime(duration - currentTime)}</span>
      </div>
    </div>
  );
}

export function PlayScreen({
  open,
  onClose,
  currentTime,
  duration,
  isLiked,
  isLiking,
  onSeek,
  onTogglePlay,
  onLike,
  onSeekDelta,
  volume = 1,
  onVolumeChange,
  onOpenQueue,
}: PlayScreenProps) {
  const { active, isPlaying, repeatMode, toggleRepeatMode, playNext, playPrev, hasNext, hasPrev } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [artistData, setArtistData] = useState<any>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!open || !active) return;
    setDataLoading(true);
    setArtistData(null);
    setArtistTracks([]);

    Promise.all([
      apiRequestJson<any>("GET", API_ENDPOINTS.users.byUsername(active.artistSlug)).catch(() => null),
      apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, { published: true }).catch(() => []),
    ]).then(([artist, allTracks]) => {
      setArtistData(artist);
      const others = Array.isArray(allTracks)
        ? allTracks.filter((t) => t.artistSlug === active.artistSlug && t.id !== active.id).slice(0, 5)
        : [];
      setArtistTracks(others);
    }).finally(() => setDataLoading(false));
  }, [open, active?.id]);

  const handleDownload = async () => {
    if (!active) return;
    setIsDownloading(true);
    try {
      await downloadTrack(active.id, `${active.artist} - ${active.title}.${active.audioFormat || "mp3"}`);
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!active) return;
    const url = `${window.location.origin}/artist/${active.artistSlug}`;
    const title = `${active.title} by ${active.artist}`;
    const text = `Check out "${active.title}" by ${active.artist} on MuseWave!`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: "Link copied!" });
    }
  };

  if (!active) return null;

  const hasCover = !!active.coverUrl;
  const gradient = active.coverGradient || "from-emerald-500/60 via-fuchsia-500/40 to-cyan-500/30";

  const lyricsText = active.lyrics || "";
  // Strip tags to estimate plain-text length for "show more" threshold
  const lyricsPlain = lyricsText.replace(/<[^>]+>/g, "").trim();
  const hasMoreLyrics = lyricsPlain.length > 200;
  const safeHtml = lyricsText ? DOMPurify.sanitize(lyricsText) : "";

  const scrollableSections = (
    <div className="flex-1 space-y-px">
      {/* Lyrics */}
      <section className="bg-black/30 px-7 py-5 backdrop-blur-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Lyrics</h2>
        {lyricsText ? (
          <>
            <div
              className={cn(
                "lyrics-display overflow-hidden text-sm leading-relaxed text-white/80 transition-all duration-300",
                "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
                !lyricsExpanded && "max-h-[100px]",
              )}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
            {hasMoreLyrics && (
              <button
                type="button"
                onClick={() => setLyricsExpanded(!lyricsExpanded)}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-white/50 transition hover:text-white/80"
                data-testid="button-play-screen-lyrics-toggle"
              >
                {lyricsExpanded
                  ? <><ChevronDown className="h-3.5 w-3.5" /> Show less</>
                  : <><ChevronUp className="h-3.5 w-3.5" /> Show more</>
                }
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/40 italic">Lyrics not available for this track.</p>
        )}
      </section>

      {/* Description */}
      {active.description && (
        <section className="bg-black/30 px-7 py-5 backdrop-blur-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Description</h2>
          <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{active.description}</p>
        </section>
      )}

      {/* About Artist */}
      <section className="bg-black/30 px-7 py-5 backdrop-blur-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">About the Artist</h2>
        {dataLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded-lg bg-white/10" />
            <div className="h-3 w-full animate-pulse rounded-lg bg-white/10" />
            <div className="h-3 w-3/4 animate-pulse rounded-lg bg-white/10" />
          </div>
        ) : artistData ? (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
                {artistData.avatarUrl || artistData.avatar_url ? (
                  <img
                    src={artistData.avatarUrl || artistData.avatar_url}
                    alt={active.artist}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {(active.artist || "A").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white">{active.artist}</div>
                {(artistData.totalFollowers || artistData.followers) > 0 && (
                  <div className="text-xs text-white/50">
                    {(artistData.totalFollowers || artistData.followers).toLocaleString()} followers
                  </div>
                )}
              </div>
            </div>
            {(artistData.bio || artistData.tagline) && (
              <p className="text-sm leading-relaxed text-white/70">{artistData.bio || artistData.tagline}</p>
            )}
            {!(artistData.bio || artistData.tagline) && (
              <p className="text-sm text-white/40 italic">No bio available.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/40 italic">Artist info not available.</p>
        )}
      </section>

      {/* More from Artist */}
      <section className="bg-black/30 px-7 py-5 pb-12 backdrop-blur-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
          More from {active.artist}
        </h2>
        {dataLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : artistTracks.length > 0 ? (
          <div className="space-y-1">
            {artistTracks.map((track) => (
              <MoreTrackRow key={track.id} track={track} onClose={onClose} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 italic">No other tracks available.</p>
        )}
      </section>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="play-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 overflow-hidden"
          data-testid="play-screen"
        >
          {/* ── Shared Background ── */}
          <div className="absolute inset-0">
            {hasCover ? (
              <>
                <img
                  src={active.coverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: "blur(60px) saturate(1.6) brightness(0.55)", transform: "scale(1.12)" }}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
              </>
            ) : (
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", gradient)} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
          </div>

          {/* ══════════════════════════════════════
              MOBILE layout  (hidden on lg+)
              Slide up, vertical scroll
          ══════════════════════════════════════ */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="relative flex h-full flex-col overflow-y-auto lg:hidden"
          >
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-12 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                data-testid="button-play-screen-close"
                aria-label="Close player"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <div className="text-xs font-medium uppercase tracking-widest text-white/60">Now Playing</div>
              <button
                type="button"
                onClick={onLike}
                disabled={isLiking}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                data-testid="button-play-screen-like"
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart className={cn("h-5 w-5 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-white")} />
              </button>
            </div>

            {/* Cover art */}
            <div className="shrink-0 flex justify-center px-8 pt-6 pb-8">
              <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className={cn(
                  "aspect-square w-full max-w-xs overflow-hidden rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7)] border border-white/10",
                  !hasCover && "bg-gradient-to-br",
                  !hasCover && gradient,
                )}
              >
                {hasCover && <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />}
                {!hasCover && (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="h-24 w-24 text-white/30" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Track info */}
            <div className="shrink-0 px-7">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white" data-testid="text-play-screen-title">
                  {active.title}
                </h1>
                {/* Artist name + Repeat (inline) */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <Link
                    href={`/artist/${active.artistSlug}`}
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors min-w-0"
                    data-testid="link-play-screen-artist"
                  >
                    <Music2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-medium">{active.artist}</span>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {active.genre && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        {active.genre}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={toggleRepeatMode}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition sm:px-5 sm:py-2 sm:gap-2",
                        repeatMode !== "off" ? "text-primary bg-primary/15" : "text-white/40 hover:text-white/70",
                      )}
                      aria-label={
                        repeatMode === "off" ? "Repeat off" : repeatMode === "all" ? "Repeat all" : "Repeat one"
                      }
                    >
                      {repeatMode === "one" ? (
                        <Repeat1 className="h-4 w-4 sm:h-6 sm:w-6" />
                      ) : (
                        <Repeat className="h-4 w-4 sm:h-6 sm:w-6" />
                      )}
                      <span className="text-[11px] font-bold sm:text-sm">
                        {repeatMode === "off" ? "" : repeatMode === "all" ? "ALL" : "ONE"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress + controls */}
            <div className="shrink-0 px-7 pt-6 pb-2">
              <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
              <div className="mt-6 flex items-center justify-center gap-8 sm:gap-10">
                <button
                  type="button"
                  onClick={playPrev}
                  disabled={!hasPrev}
                  className="flex flex-col items-center gap-0.5 text-white/70 transition hover:text-white disabled:opacity-30"
                  data-testid="button-play-screen-prev"
                  aria-label="Previous track"
                >
                  <SkipBack className="h-7 w-7" />
                  <span className="text-[9px] font-bold tabular-nums">PREV</span>
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 active:scale-95"
                  data-testid="button-play-screen-play-pause"
                >
                  {isPlaying
                    ? <Pause className="h-7 w-7 fill-current" />
                    : <Play className="h-7 w-7 translate-x-0.5 fill-current" />
                  }
                </button>
                <button
                  type="button"
                  onClick={playNext}
                  disabled={!hasNext}
                  className="flex flex-col items-center gap-0.5 text-white/70 transition hover:text-white disabled:opacity-30"
                  data-testid="button-play-screen-next"
                  aria-label="Next track"
                >
                  <SkipForward className="h-7 w-7" />
                  <span className="text-[9px] font-bold tabular-nums">NEXT</span>
                </button>
              </div>
              {/* Action row */}
              <div className="mt-7 flex items-center justify-around">
                {onOpenQueue && (
                  <button
                    type="button"
                    onClick={onOpenQueue}
                    className="flex flex-col items-center gap-1.5 text-white/60 transition hover:text-white"
                    data-testid="button-play-screen-queue"
                  >
                    <ListMusic className="h-5 w-5" />
                    <span className="text-[10px]">Queue</span>
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex flex-col items-center gap-1.5 text-white/60 transition hover:text-white disabled:opacity-40"
                    data-testid="button-play-screen-download"
                  >
                    <Download className="h-5 w-5" />
                    <span className="text-[10px]">Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1.5 text-white/60 transition hover:text-white"
                  data-testid="button-play-screen-share"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="text-[10px]">Share</span>
                </button>
                <Link
                  href={`/artist/${active.artistSlug}`}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1.5 text-white/60 transition hover:text-white"
                  data-testid="link-play-screen-artist-page"
                >
                  <ExternalLink className="h-5 w-5" />
                  <span className="text-[10px]">Artist page</span>
                </Link>
              </div>
            </div>

            {/* Scrollable sections */}
            <div className="flex-1 space-y-px pt-6">{scrollableSections}</div>
          </motion.div>

          {/* ══════════════════════════════════════
              DESKTOP layout  (hidden below lg)
              Two-column side-by-side
          ══════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative hidden h-full lg:flex lg:flex-col"
          >
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between px-10 pt-8 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close player"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <div className="text-xs font-semibold uppercase tracking-widest text-white/50">Now Playing</div>
              <button
                type="button"
                onClick={onLike}
                disabled={isLiking}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart className={cn("h-5 w-5 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-white")} />
              </button>
            </div>

            {/* Main two-column body */}
            <div className="flex flex-1 min-h-0 gap-0">

              {/* ── LEFT COLUMN: cover + controls ── */}
              <div className="flex w-[44%] shrink-0 flex-col items-center justify-center px-16 pb-10 gap-8">
                {/* Cover art */}
                <motion.div
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.4 }}
                  className={cn(
                    "aspect-square w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.75)] border border-white/10",
                    !hasCover && "bg-gradient-to-br",
                    !hasCover && gradient,
                  )}
                >
                  {hasCover && <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />}
                  {!hasCover && (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music2 className="h-28 w-28 text-white/30" />
                    </div>
                  )}
                </motion.div>

                {/* Track info */}
                <div className="w-full max-w-sm">
                  <h1 className="truncate text-3xl font-bold tracking-tight text-white leading-tight" data-testid="text-play-screen-title-desktop">
                    {active.title}
                  </h1>
                  {/* Artist name + Repeat + Genre (inline) */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/artist/${active.artistSlug}`}
                      onClick={onClose}
                      className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors min-w-0"
                      data-testid="link-play-screen-artist-desktop"
                    >
                      <Music2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium">{active.artist}</span>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {active.genre && (
                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                          {active.genre}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={toggleRepeatMode}
                        className={cn(
                          "flex items-center gap-2 rounded-full px-5 py-2 transition",
                          repeatMode !== "off" ? "text-primary bg-primary/15" : "text-white/40 hover:text-white/70",
                        )}
                        aria-label={
                          repeatMode === "off" ? "Repeat off" : repeatMode === "all" ? "Repeat all" : "Repeat one"
                        }
                      >
                        {repeatMode === "one" ? (
                          <Repeat1 className="h-6 w-6" />
                        ) : (
                          <Repeat className="h-6 w-6" />
                        )}
                        <span className="text-sm font-bold">
                          {repeatMode === "off" ? "" : repeatMode === "all" ? "ALL" : "ONE"}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-6">
                    <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
                  </div>

                  {/* Playback controls */}
                  <div className="mt-6 flex items-center justify-center gap-10">
                    <button
                      type="button"
                      onClick={playPrev}
                      disabled={!hasPrev}
                      className="flex flex-col items-center gap-0.5 text-white/70 transition hover:text-white disabled:opacity-30"
                      aria-label="Previous track"
                    >
                      <SkipBack className="h-6 w-6" />
                      <span className="text-[9px] font-bold tabular-nums">PREV</span>
                    </button>
                    <button
                      type="button"
                      onClick={onTogglePlay}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105 active:scale-95"
                      data-testid="button-play-screen-play-pause-desktop"
                    >
                      {isPlaying
                        ? <Pause className="h-7 w-7 fill-current" />
                        : <Play className="h-7 w-7 translate-x-0.5 fill-current" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={playNext}
                      disabled={!hasNext}
                      className="flex flex-col items-center gap-0.5 text-white/70 transition hover:text-white disabled:opacity-30"
                      aria-label="Next track"
                    >
                      <SkipForward className="h-6 w-6" />
                      <span className="text-[9px] font-bold tabular-nums">NEXT</span>
                    </button>
                  </div>

                  {/* Volume */}
                  {onVolumeChange && (
                    <div className="mt-5 flex items-center gap-3">
                      <Volume2 className="h-4 w-4 shrink-0 text-white/50" />
                      <div className="relative flex-1 h-1 rounded-full bg-white/20">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-white/70 pointer-events-none"
                          style={{ width: `${volume * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5 w-full cursor-pointer opacity-0"
                          data-testid="input-play-screen-volume"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {onOpenQueue && (
                      <button
                        type="button"
                        onClick={onOpenQueue}
                        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                        data-testid="button-play-screen-queue-desktop"
                      >
                        <ListMusic className="h-3.5 w-3.5" />
                        Queue
                      </button>
                    )}
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-40"
                        data-testid="button-play-screen-download-desktop"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                      data-testid="button-play-screen-share-desktop"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                    <Link
                      href={`/artist/${active.artistSlug}`}
                      onClick={onClose}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                      data-testid="link-play-screen-artist-page-desktop"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Artist page
                    </Link>
                  </div>
                </div>
              </div>

              {/* Vertical divider */}
              <div className="w-px shrink-0 bg-white/10 my-6" />

              {/* ── RIGHT COLUMN: scrollable info ── */}
              <div className="flex-1 min-w-0 overflow-y-auto pb-10">
                <div className="space-y-px pt-2">

                  {/* Lyrics */}
                  <section className="px-10 py-6">
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Lyrics</h2>
                    {lyricsText ? (
                      <>
                        <div
                          className={cn(
                            "lyrics-display overflow-hidden text-sm leading-relaxed text-white/80 transition-all duration-300",
                            "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
                            !lyricsExpanded && "max-h-[140px]",
                          )}
                          dangerouslySetInnerHTML={{ __html: safeHtml }}
                        />
                        {hasMoreLyrics && (
                          <button
                            type="button"
                            onClick={() => setLyricsExpanded(!lyricsExpanded)}
                            className="mt-3 flex items-center gap-1 text-xs font-semibold text-white/50 transition hover:text-white/80"
                          >
                            {lyricsExpanded
                              ? <><ChevronDown className="h-3.5 w-3.5" /> Show less</>
                              : <><ChevronUp className="h-3.5 w-3.5" /> Show more</>
                            }
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-white/40 italic">Lyrics not available for this track.</p>
                    )}
                  </section>

                  {/* Description */}
                  {active.description && (
                    <>
                      <div className="mx-10 h-px bg-white/10" />
                      <section className="px-10 py-6">
                        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Description</h2>
                        <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{active.description}</p>
                      </section>
                    </>
                  )}

                  <div className="mx-10 h-px bg-white/10" />

                  {/* About Artist */}
                  <section className="px-10 py-6">
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">About the Artist</h2>
                    {dataLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded-lg bg-white/10" />
                        <div className="h-3 w-full animate-pulse rounded-lg bg-white/10" />
                        <div className="h-3 w-3/4 animate-pulse rounded-lg bg-white/10" />
                      </div>
                    ) : artistData ? (
                      <div>
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
                            {artistData.avatarUrl || artistData.avatar_url ? (
                              <img
                                src={artistData.avatarUrl || artistData.avatar_url}
                                alt={active.artist}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xl font-bold text-white">
                                {(active.artist || "A").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-base">{active.artist}</div>
                            {(artistData.totalFollowers || artistData.followers) > 0 && (
                              <div className="text-xs text-white/50">
                                {(artistData.totalFollowers || artistData.followers).toLocaleString()} followers
                              </div>
                            )}
                          </div>
                        </div>
                        {(artistData.bio || artistData.tagline) ? (
                          <p className="text-sm leading-relaxed text-white/70">{artistData.bio || artistData.tagline}</p>
                        ) : (
                          <p className="text-sm text-white/40 italic">No bio available.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40 italic">Artist info not available.</p>
                    )}
                  </section>

                  <div className="mx-10 h-px bg-white/10" />

                  {/* More from Artist */}
                  <section className="px-10 py-6">
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
                      More from {active.artist}
                    </h2>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="h-12 w-12 animate-pulse rounded-xl bg-white/10 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                              <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : artistTracks.length > 0 ? (
                      <div className="space-y-1">
                        {artistTracks.map((track) => (
                          <MoreTrackRow key={track.id} track={track} onClose={onClose} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40 italic">No other tracks available.</p>
                    )}
                  </section>

                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MoreTrackRow({ track, onClose }: { track: Track; onClose: () => void }) {
  const { active, setActive, setAutoPlay } = usePlayer();
  const isActive = active?.id === track.id;

  const handlePlay = () => {
    setAutoPlay(true);
    setActive(track);
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/10",
        isActive && "bg-white/10",
      )}
      data-testid={`button-more-track-${track.id}`}
    >
      <div className={cn(
        "relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10",
        !track.coverUrl && "bg-gradient-to-br",
        !track.coverUrl && (track.coverGradient || "from-emerald-500/40 to-fuchsia-500/30"),
      )}>
        {track.coverUrl && <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Music2 className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{track.title}</div>
        {track.genre && <div className="truncate text-xs text-white/50">{track.genre}</div>}
      </div>
      {isActive && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
    </button>
  );
}
