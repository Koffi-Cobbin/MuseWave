import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, Crown, Heart, MoreVertical, Download, CloudDownload, Share2, Link2, ChevronDown, SkipBack, SkipForward, ListMusic, Repeat, Repeat1, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { WifiOff } from "lucide-react";
import { usePlayer } from "@/contexts/player-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL, downloadTrack } from "@/lib/apiConfig";
import { useOfflineAudio } from "@/hooks/useOfflineAudio";
import { useOffline } from "@/contexts/offline-context";
import { motion, AnimatePresence } from "framer-motion";
import { PlayScreen } from "@/components/PlayScreen";
import { QueueSheet } from "@/components/QueueSheet";

// ── Sub-components (defined outside PlayerBar to preserve identity) ────────────

interface SupportDialogProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SupportDialog({ trigger, open, onOpenChange }: SupportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> Support the Artist
          </DialogTitle>
          <DialogDescription>
            Show your appreciation for the music you love. Support features coming soon!
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="glass glow noise rounded-2xl p-4 text-center">
            <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
            <div className="text-sm font-medium">Tip Jar</div>
            <div className="mt-1 text-xs text-muted-foreground">Direct support for artists — coming soon</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OverflowMenuProps {
  side?: "top" | "bottom";
  align?: "end" | "start" | "center";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLiked: boolean;
  isLiking: boolean;
  isDownloading: boolean;
  onLike: () => void;
  onOpenSupport: () => void;
  onDownload: () => void;
  isSavedOffline: boolean;
  isSavingOffline: boolean;
  isOnline: boolean;
  onSaveOffline: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  isAuthenticated: boolean;
}

function OverflowMenu({
  side = "top",
  align = "end",
  open,
  onOpenChange,
  isLiked,
  isLiking,
  isDownloading,
  onLike,
  onOpenSupport,
  onDownload,
  isSavedOffline,
  isSavingOffline,
  isOnline,
  onSaveOffline,
  onShare,
  onCopyLink,
  isAuthenticated,
}: OverflowMenuProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2" data-testid="button-player-menu">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" side={side} align={align} sideOffset={8}>
        <button
          onClick={onLike}
          disabled={isLiking}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50"
          data-testid="button-player-like-menu"
        >
          <Heart className={cn("h-4 w-4 shrink-0 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
          {isLiked ? "Unlike" : "Like"}
        </button>
        <button
          onClick={onOpenSupport}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
          data-testid="button-player-support-menu"
        >
          <Crown className="h-4 w-4 shrink-0 text-muted-foreground" />
          Support Artist
        </button>
        <Separator className="my-1 opacity-50" />
        {isSavedOffline ? (
          <button
            disabled
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 transition-colors"
            data-testid="button-player-saved-offline"
          >
            <CloudDownload className="h-4 w-4 shrink-0" />
            Saved Offline
          </button>
        ) : (
          <button
            onClick={onSaveOffline}
            disabled={isSavingOffline || !isOnline}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50"
            data-testid="button-player-save-offline"
          >
            {!isOnline ? (
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <CloudDownload className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {isSavingOffline ? "Saving…" : !isOnline ? "Offline" : "Save Offline"}
          </button>
        )}
        {isAuthenticated && (
          <>
            <Separator className="my-1 opacity-50" />
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50"
              data-testid="button-player-download"
            >
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              {isDownloading ? "Downloading…" : "Download"}
            </button>
          </>
        )}
        <button
          onClick={onShare}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
          data-testid="button-player-share"
        >
          <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          Share
        </button>
        <button
          onClick={onCopyLink}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
          data-testid="button-player-copy-link"
        >
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          Copy link
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function PlayerBar() {
  const { active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying, playNext, playPrev, hasNext, hasPrev, queueCount, repeatMode, toggleRepeatMode } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { isTrackDownloaded, downloadForOffline, isOnline } = useOffline();
  const { toast } = useToast();
  const audioSrc = useOfflineAudio(active);

  const [playScreenOpen, setPlayScreenOpen] = useState(false);
  const [barMinimized, setBarMinimized] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Always-fresh refs so the `ended` handler never captures stale values.
  const playNextRef = useRef(playNext);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // Tracks the current play session so we can record partial plays on skip
  const playSessionRef = useRef<{ trackId: string } | null>(null);

  // Sends a play event to the backend
  const recordPlay = useCallback(async (trackId: string, durationSec: number, completed: boolean) => {
    try {
      const accessToken = localStorage.getItem("accessToken") ?? "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const body: Record<string, unknown> = {
        duration: Math.round(durationSec),
        completed,
      };
      if (user?.id) body.userId = user.id;
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.plays.create(trackId)}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch {
      // silent — play tracking must never interrupt the user
    }
  }, [user?.id]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      // Record a completed play
      if (active) {
        const playedSec = Math.floor(audio.duration || audio.currentTime || 0);
        if (playedSec > 0) {
          recordPlay(active.id, playedSec, true);
        }
      }
      if (repeatModeRef.current === "one") {
        // Repeat one: restart the current track
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextRef.current();
      }
    };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [active]);

  // Ref that always holds the latest audio currentTime (updated from timeupdate)
  const currentTimeRef = useRef(0);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Minimum seconds listened to count as a meaningful partial play
  const MIN_PLAY_SECONDS = 30;

  // Reset minimized state whenever a new track becomes active
  useEffect(() => { if (active?.id) setBarMinimized(false); }, [active?.id]);

  // Record partial play when user switches to a different track before it ends
  useEffect(() => {
    const prevSession = playSessionRef.current;

    // Flush a partial play for the previous track
    if (prevSession && prevSession.trackId !== active?.id) {
      const playedSec = Math.floor(currentTimeRef.current);
      if (playedSec >= MIN_PLAY_SECONDS) {
        recordPlay(prevSession.trackId, playedSec, false);
      }
    }

    // Set up new session
    if (active?.id) {
      playSessionRef.current = { trackId: active.id };
    } else {
      playSessionRef.current = null;
    }
  }, [active?.id, recordPlay]);

  // Counter to prevent infinite skip-loop when offline + no downloaded tracks remain
  const offlineSkipCountRef = useRef(0);

  // When offline and the active track isn't saved, skip to the next one.
  // Uses playNextRef (not playNext) to avoid re-triggering when playNext's
  // useCallback deps (queue/queueIndex) change after every skip.
  useEffect(() => {
    if (isOnline === false && active && !isTrackDownloaded(active.id)) {
      offlineSkipCountRef.current += 1;
      if (offlineSkipCountRef.current > 10) {
        // Safety valve — stop skipping to avoid an infinite loop
        offlineSkipCountRef.current = 0;
        return;
      }
      playNextRef.current();
    } else {
      offlineSkipCountRef.current = 0;
    }
  }, [active?.id, isOnline]);

  // Reset state when track changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLiked(false);
  }, [active?.id]);

  // Fetch like status
  useEffect(() => {
    if (!active || !user) return;
    fetch(`${API_BASE_URL}${API_ENDPOINTS.likes.check(active.id, user.id)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` },
    })
      .then((r) => r.json())
      .then((data) => setIsLiked(!!data.hasLiked))
      .catch(() => {});
  }, [active?.id, user?.id]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || !active) return;
    setAutoPlay(false);
    setIsPlaying(true);
  }, [autoPlay, active]);

  // Sync audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) return;
    if (isPlaying) {
      if (audio.readyState >= 3) {
        audio.play().catch(() => setIsPlaying(false));
      } else {
        // Audio src just changed — wait for it to be ready before playing
        const onCanPlay = () => {
          audio.play().catch(() => setIsPlaying(false));
        };
        audio.addEventListener("canplay", onCanPlay, { once: true });
        return () => audio.removeEventListener("canplay", onCanPlay);
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, active?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleSeekDelta = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSeek(parseFloat(e.target.value));
  };

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLike = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!active) return;
    if (!isAuthenticated || !user) {
      toast({ title: "Log in to like tracks", variant: "destructive" });
      return;
    }
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.likes.create(active.id)}`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsLiked(wasLiked);
      toast({ title: "Could not update like", variant: "destructive" });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDownload = async () => {
    if (!active) return;
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
    setIsDownloading(true);
    try {
      await downloadTrack(active.id, `${active.artist} - ${active.title}.${active.audioFormat || "mp3"}`);
      toast({ title: "Download started", description: `${active.title} is downloading.` });
    } catch {
      toast({ title: "Download failed", description: "Unable to download this track. It may be private.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveOffline = async () => {
    if (!active || isSavingOffline) return;
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
    setIsSavingOffline(true);
    try {
      await downloadForOffline(active);
      toast({ title: "Saved offline", description: `${active.title} is available offline.` });
    } catch {
      toast({ title: "Save failed", description: "Unable to save this track offline.", variant: "destructive" });
    } finally {
      setIsSavingOffline(false);
    }
  };

  const handleShare = async () => {
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    const title = active ? `${active.title} by ${active.artist}` : "MuseWave";
    const text = active ? `Check out "${active.title}" by ${active.artist} on MuseWave!` : "Discover indie music on MuseWave!";
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
    }
  };

  const handleCopyLink = async () => {
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Link copied!", description: "Link copied to clipboard." });
  };

  const isSavedOffline = active ? isTrackDownloaded(active.id) : false;

  const sharedMenuProps = {
    isLiked,
    isLiking,
    isDownloading,
    onLike: handleLike,
    onDownload: handleDownload,
    isSavedOffline,
    isSavingOffline,
    isOnline,
    onSaveOffline: handleSaveOffline,
    onShare: handleShare,
    onCopyLink: handleCopyLink,
  };

  const mobileMenuProps = {
    ...sharedMenuProps,
    open: mobileMenuOpen,
    onOpenChange: setMobileMenuOpen,
    onOpenSupport: () => { setSupportOpen(true); setMobileMenuOpen(false); },
    isAuthenticated,
  };

  const desktopMenuProps = {
    ...sharedMenuProps,
    open: desktopMenuOpen,
    onOpenChange: setDesktopMenuOpen,
    onOpenSupport: () => { setSupportOpen(true); setDesktopMenuOpen(false); },
    isAuthenticated,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* ── Queue Sheet ── */}
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* ── Play Screen overlay ── */}
      <PlayScreen
        open={playScreenOpen}
        onClose={() => setPlayScreenOpen(false)}
        currentTime={currentTime}
        duration={duration}
        isLiked={isLiked}
        isLiking={isLiking}
        onSeek={handleSeek}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onLike={handleLike}
        onSeekDelta={handleSeekDelta}
        volume={volume}
        onVolumeChange={setVolume}
        onOpenQueue={() => { setPlayScreenOpen(false); setQueueOpen(true); }}
      />

      <AnimatePresence>
        {active && (
          <>
            {/* ══════════════════════════════════════════════
                MOBILE  (hidden on lg+)
                Compact always-visible bar above BottomNav
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
              {barMinimized ? (
                /* ── Minimised pill ── */
                <motion.button
                  key="mini-pill"
                  type="button"
                  onClick={() => setBarMinimized(false)}
                  initial={{ scale: 0.7, opacity: 0, y: 12, x: "-50%" }}
                  animate={{ scale: 1, opacity: 1, y: 0, x: "-50%" }}
                  exit={{ scale: 0.7, opacity: 0, y: 12, x: "-50%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="fixed z-30 lg:hidden flex items-center gap-2 rounded-full border border-white/15 bg-background/90 px-3 py-1.5 backdrop-blur-xl shadow-lg shadow-black/30 cursor-pointer"
                  style={{ bottom: "calc(var(--bottom-nav-h, 64px) + env(safe-area-inset-bottom, 0px) + 10px)", left: "50%" }}
                  data-testid="button-player-pill"
                  aria-label="Restore player"
                >
                  {/* Audio wave bars */}
                  <div className="flex items-end gap-[3px] h-4">
                    {[0, 0.2, 0.1, 0.3].map((delay, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-primary"
                        style={{
                          height: "100%",
                          transformOrigin: "bottom",
                          animation: isPlaying
                            ? `player-wave 0.7s ease-in-out ${delay}s infinite alternate`
                            : "none",
                          transform: isPlaying ? undefined : "scaleY(0.35)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="max-w-[120px] truncate text-xs font-medium text-white/80">
                    {active.title}
                  </span>
                </motion.button>
              ) : (
                /* ── Full mobile bar ── */
                <motion.div
                  key="mobile-bar"
                  data-testid="player-bar-mobile"
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="fixed inset-x-0 z-30 lg:hidden"
                  style={{ bottom: "calc(var(--bottom-nav-h, 64px) + env(safe-area-inset-bottom, 0px))" }}
                >
                  {/* Offline banner */}
                  {!isOnline && (
                    <div className="flex items-center justify-center gap-1.5 bg-amber-500/15 py-1 text-[10px] text-amber-400">
                      <WifiOff className="h-3 w-3" />
                      Offline — only saved tracks are available
                    </div>
                  )}
                  {/* Hairline progress bar at top of bar */}
                  <div className="relative h-[2px] w-full bg-white/10">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-all duration-200 pointer-events-none"
                      style={{ width: `${progress}%` }}
                    />
                    <input
                      type="range" min="0" max={duration || 0} value={currentTime}
                      onChange={handleSeekInput}
                      className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[16px] w-full cursor-pointer opacity-0"
                      data-testid="input-player-seek"
                    />
                  </div>

                  {/* Bar body — clickable to open play screen */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPlayScreenOpen(true)}
                    onKeyDown={(e) => e.key === "Enter" && setPlayScreenOpen(true)}
                    className="flex cursor-pointer items-center gap-3 bg-background/94 px-3 py-2.5 backdrop-blur-2xl border-t border-white/8 select-none"
                    data-testid="button-open-play-screen"
                    aria-label="Open full player"
                  >
                    {/* Cover art */}
                    <div className={cn(
                      "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                      !active.coverUrl && "bg-gradient-to-br",
                      active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                    )}>
                      {active.coverUrl && (
                        <img src={active.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* Track info */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="truncate text-sm font-semibold leading-tight" data-testid="text-player-title">
                        {active.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist">
                        {active.artist}
                      </div>
                    </div>

                    {/* Actions — stop propagation so clicks don't open play screen */}
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex h-9 w-9 items-center justify-center text-primary transition hover:text-primary/80"
                        data-testid="button-player-play-pause"
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying
                          ? <Pause className="h-4 w-4" />
                          : <Play className="h-4 w-4 translate-x-px" />
                        }
                      </button>

                      <button
                        type="button"
                        onClick={toggleRepeatMode}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full transition",
                          repeatMode !== "off"
                            ? "text-primary hover:text-primary/80"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        data-testid="button-player-repeat"
                        aria-label={
                          repeatMode === "off" ? "Repeat off" : repeatMode === "all" ? "Repeat all" : "Repeat one"
                        }
                      >
                        {repeatMode === "one" ? (
                          <Repeat1 className="h-4 w-4" />
                        ) : (
                          <Repeat className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setQueueOpen(true)}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
                        data-testid="button-player-queue"
                        aria-label="Open queue"
                      >
                        <ListMusic className="h-4 w-4" />
                        {queueCount > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-white leading-none">
                            {queueCount > 9 ? "9+" : queueCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBarMinimized(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
                        data-testid="button-player-minimise"
                        aria-label="Minimise player"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => { audioRef.current?.pause(); setIsPlaying(false); setActive(null); }}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/50 transition hover:text-foreground"
                        data-testid="button-player-close"
                        aria-label="Close player"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════
                DESKTOP  (hidden below lg)
                Always-visible full bar at very bottom
            ══════════════════════════════════════════════ */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/8 bg-background/85 backdrop-blur-2xl lg:block lg:pl-64"
            >
              {/* Offline banner */}
              {!isOnline && (
                <div className="flex items-center justify-center gap-1.5 bg-amber-500/15 py-1.5 text-xs text-amber-400">
                  <WifiOff className="h-3.5 w-3.5" />
                  Offline — only saved tracks are available
                </div>
              )}
              {/* Hairline progress bar with time-on-hover + seek */}
              <div className="group/progress relative h-5 w-full">
                {/* Thin animated fill line at bottom edge */}
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-150 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Time labels — always visible */}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-0.5 pointer-events-none">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
                </div>
                {/* Invisible seek trackpad spanning full width */}
                <input
                  type="range" min="0" max={duration || 0} value={currentTime}
                  onChange={handleSeekInput}
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                  data-testid="input-player-seek-desktop"
                />
              </div>

              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
                {/* Cover — clickable to open play screen */}
                <button
                  type="button"
                  onClick={() => setPlayScreenOpen(true)}
                  className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 transition hover:border-white/25"
                  data-testid="button-player-cover-desktop"
                  aria-label="Open full player"
                >
                  <div className={cn(
                    "h-full w-full",
                    !active.coverUrl && "bg-gradient-to-br",
                    active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                  )}>
                    {active.coverUrl && (
                      <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <ChevronUp className="h-4 w-4 text-white" />
                  </div>
                </button>

                {/* Title + artist — clickable to open play screen */}
                <button
                  type="button"
                  onClick={() => setPlayScreenOpen(true)}
                  className="w-48 shrink-0 min-w-0 text-left transition hover:opacity-80"
                  data-testid="button-player-title-desktop"
                  aria-label="Open full player"
                >
                  <div className="truncate text-sm font-semibold" data-testid="text-player-title-desktop">{active.title}</div>
                  <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist-desktop">{active.artist}</div>
                </button>

                {/* Compact playback controls (no seek bar — moved to hairline above) */}
                <div className="flex flex-1 min-w-0 items-center justify-center gap-2">
                  <Button size="icon" variant="ghost" onClick={playPrev} disabled={!hasPrev} className="shrink-0" data-testid="button-player-prev-desktop" aria-label="Previous track">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={togglePlay} className="shrink-0" data-testid="button-player-play-pause-desktop">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={playNext} disabled={!hasNext} className="shrink-0" data-testid="button-player-next-desktop" aria-label="Next track">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Right actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {/* Repeat */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "px-2",
                      repeatMode !== "off" ? "text-primary hover:text-primary/80" : "text-muted-foreground",
                    )}
                    onClick={toggleRepeatMode}
                    data-testid="button-player-repeat-desktop"
                  >
                    {repeatMode === "one" ? (
                      <Repeat1 className="h-3.5 w-3.5" />
                    ) : (
                      <Repeat className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Queue */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative px-2"
                    onClick={() => setQueueOpen(true)}
                    data-testid="button-player-queue-desktop"
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                    {queueCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-white leading-none">
                        {queueCount > 9 ? "9+" : queueCount}
                      </span>
                    )}
                  </Button>

                  {/* Volume */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">🔊</span>
                    <input
                      type="range" min="0" max="1" step="0.1" value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-white/20"
                      data-testid="input-player-volume"
                    />
                  </div>

                  <Button variant="ghost" size="sm" className="px-2" onClick={handleLike} disabled={isLiking} data-testid="button-player-like">
                    <Heart className={cn("h-3.5 w-3.5 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                  </Button>

                  <SupportDialog
                    open={supportOpen}
                    onOpenChange={setSupportOpen}
                    trigger={
                      <Button variant="ghost" size="sm" data-testid="button-player-support-desktop">
                        <Crown className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />

                  <OverflowMenu side="top" align="end" {...desktopMenuProps} />
                </div>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-muted-foreground/50 hover:text-foreground shrink-0"
                  onClick={() => { audioRef.current?.pause(); setIsPlaying(false); setActive(null); }}
                  data-testid="button-player-close-desktop"
                  aria-label="Close player"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default PlayerBar;
