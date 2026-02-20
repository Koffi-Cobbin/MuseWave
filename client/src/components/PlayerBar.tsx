import { useRef, useEffect, useState } from "react";
import { Play, Pause, Crown, Heart, MoreVertical, Download, Share2, Link2, ChevronDown } from "lucide-react";
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
import { usePlayer } from "@/contexts/player-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL, downloadTrack } from "@/lib/apiConfig";
import { motion, AnimatePresence } from "framer-motion";

function PlayerBar() {
  const { active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Mobile starts collapsed (pill); auto-expands when a track loads
  const [expanded, setExpanded] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Volume sync
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [active]);

  // Reset + auto-expand when track changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLiked(false);
    if (active) setExpanded(true);
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

  // Sync audio element with isPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
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
    setMenuOpen(false);
    setIsDownloading(true);
    try {
      await downloadTrack(active.id, `${active.artist} - ${active.title}.${active.audioFormat || "mp3"}`);
      toast({ title: "Download started", description: `${active.title} is downloading.` });
    } catch {
      toast({ title: "Download failed", description: "Unable to download this track.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setMenuOpen(false);
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
    setMenuOpen(false);
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Link copied!", description: "Link copied to clipboard." });
  };

  // ── Shared sub-components ─────────────────────────────────────────────────

  const SupportDialog = ({ trigger }: { trigger: React.ReactNode }) => (
    <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
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

  const OverflowMenu = ({ side = "top" as "top" | "bottom", align = "end" as "end" | "start" | "center" }) => (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2" data-testid="button-player-menu">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" side={side} align={align} sideOffset={8}>
        <button onClick={handleLike} disabled={isLiking} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50" data-testid="button-player-like-menu">
          <Heart className={cn("h-4 w-4 shrink-0 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
          {isLiked ? "Unlike" : "Like"}
        </button>
        <button onClick={() => { setSupportOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8" data-testid="button-player-support-menu">
          <Crown className="h-4 w-4 shrink-0 text-muted-foreground" />
          Support Artist
        </button>
        <Separator className="my-1 opacity-50" />
        <button onClick={handleDownload} disabled={isDownloading} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50" data-testid="button-player-download">
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
          {isDownloading ? "Downloading…" : "Download"}
        </button>
        <button onClick={handleShare} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8" data-testid="button-player-share">
          <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          Share
        </button>
        <button onClick={handleCopyLink} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8" data-testid="button-player-copy-link">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          Copy link
        </button>
      </PopoverContent>
    </Popover>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <audio ref={audioRef} src={active?.audioUrl} preload="metadata" />

      <AnimatePresence>
        {active && (
          <>
            {/* ══════════════════════════════════════════════
                MOBILE  (hidden on lg+)
                Two states: collapsed pill ↔ expanded bar
            ══════════════════════════════════════════════ */}
            <div className="lg:hidden">
              <AnimatePresence mode="wait">

                {/* ── Collapsed pill ── */}
                {!expanded && (
                  <motion.button
                    key="pill"
                    type="button"
                    onClick={() => setExpanded(true)}
                    data-testid="button-player-pill"
                    initial={{ y: 12, opacity: 0, scale: 0.94 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 12, opacity: 0, scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 440, damping: 34 }}
                    // Sit 8px above the bottom nav; account for device safe area
                    className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/15 bg-background/90 px-3 py-1.5 shadow-2xl backdrop-blur-xl"
                    style={{ bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 12px)" }}
                  >
                    {/* Tiny cover art */}
                    <div className={cn(
                      "h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10",
                      !active.coverUrl && "bg-gradient-to-br",
                      active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                    )}>
                      {active.coverUrl && (
                        <img src={active.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* Animated progress ring + play icon */}
                    <div
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center"
                      onClick={togglePlay}
                    >
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                        <circle
                          cx="14" cy="14" r="11" fill="none"
                          stroke="rgb(52,211,153)" strokeWidth="2"
                          strokeDasharray={`${2 * Math.PI * 11}`}
                          strokeDashoffset={`${2 * Math.PI * 11 * (1 - progress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-200"
                        />
                      </svg>
                      {isPlaying
                        ? <Pause className="relative h-3 w-3 text-foreground" />
                        : <Play className="relative h-3 w-3 translate-x-px text-foreground" />
                      }
                    </div>

                    {/* Track name */}
                    <span className="max-w-[110px] truncate text-xs font-semibold leading-none">
                      {active.title}
                    </span>

                    {/* Expand chevron */}
                    <ChevronDown className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
                  </motion.button>
                )}

                {/* ── Expanded bar ── */}
                {expanded && (
                  <motion.div
                    key="expanded"
                    data-testid="player-bar-expanded"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                    className="fixed inset-x-0 z-30 border-t border-white/10 bg-background/92 backdrop-blur-2xl"
                    style={{ bottom: "calc(57px + env(safe-area-inset-bottom, 0px) + 12px)" }}
                  >
                    {/* Seekable hairline progress bar */}
                    <div className="relative h-[3px] w-full bg-white/10">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                      <input
                        type="range" min="0" max={duration || 0} value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        data-testid="input-player-seek"
                      />
                    </div>

                    <div className="px-3 pb-3 pt-2.5">
                      {/* Row 1: cover art with play button · info · menu · collapse */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 group",
                          !active.coverUrl && "bg-gradient-to-br",
                          active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                        )}>
                          {active.coverUrl && (
                            <img src={active.coverUrl} alt="" className="h-full w-full object-cover" />
                          )}
                          {/* Play / Pause Overlay */}
                          <button
                            onClick={togglePlay}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity group-hover:bg-black/50"
                            data-testid="button-player-play-pause-overlay"
                          >
                            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" data-testid="text-player-title">
                            {active.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="truncate text-xs text-muted-foreground max-w-[100px]" data-testid="text-player-artist">
                              {active.artist}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                          </div>
                        </div>

                        {/* Menu & Collapse Group */}
                        <div className="flex items-center gap-1">
                          <OverflowMenu side="top" align="end" />

                          <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-muted-foreground transition hover:bg-white/14 hover:text-foreground"
                            data-testid="button-player-collapse"
                            aria-label="Collapse player"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ══════════════════════════════════════════════
                DESKTOP  (hidden below lg)
                Always-visible full bar at very bottom
            ══════════════════════════════════════════════ */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/8 bg-background/85 backdrop-blur-2xl lg:block"
            >
              {/* Progress bar */}
              <div className="relative h-[2px] w-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range" min="0" max={duration || 0} value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  data-testid="input-player-seek-desktop"
                />
              </div>

              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
                {/* Cover */}
                <div className={cn(
                  "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                  !active.coverUrl && "bg-gradient-to-br",
                  active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                )}>
                  {active.coverUrl && (
                    <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />
                  )}
                </div>

                {/* Title + artist */}
                <div className="w-48 shrink-0 min-w-0">
                  <div className="truncate text-sm font-semibold" data-testid="text-player-title">{active.title}</div>
                  <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist">{active.artist}</div>
                </div>

                {/* Play + seek bar */}
                <div className="flex flex-1 min-w-0 items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={togglePlay} className="shrink-0" data-testid="button-player-play-pause-desktop">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
                  <input
                    type="range" min="0" max={duration || 0} value={currentTime}
                    onChange={handleSeek}
                    className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20"
                    data-testid="input-player-seek-bar"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
                </div>

                {/* Right actions */}
                <div className="flex shrink-0 items-center gap-1">
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

                  <SupportDialog trigger={
                    <Button variant="ghost" size="sm" data-testid="button-player-support-desktop">
                      <Crown className="h-3.5 w-3.5" />
                    </Button>
                  } />

                  <OverflowMenu side="top" align="end" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default PlayerBar;