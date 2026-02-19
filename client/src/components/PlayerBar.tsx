import { useRef, useEffect, useState } from "react";
import { Play, Pause, Crown, Heart, MoreVertical, Download, Share2, Link2, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Bottom nav height + safe area. Keep in sync with BottomNav.
const BOTTOM_NAV_H = 57; // px — approximate nav height on mobile

function PlayerBar() {
  const { active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [supportOpen, setSupportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Reset on track change
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

  // Sync audio element with isPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) return;
    if (isPlaying) {
      audio.play().catch((error) => {
        console.error("Playback error:", error);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = async () => {
    if (!active) return;
    if (!isAuthenticated || !user) {
      toast({ title: "Log in to like tracks", variant: "destructive" });
      return;
    }
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    try {
      const endpoint = `${API_BASE_URL}${API_ENDPOINTS.likes.create(active.id)}`;
      const res = await fetch(endpoint, {
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
      toast({ title: "Something went wrong", variant: "destructive" });
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
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
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
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!" });
      } catch {
        toast({ title: "Share failed", variant: "destructive" });
      }
    }
  };

  const handleCopyLink = async () => {
    setMenuOpen(false);
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <>
      <audio ref={audioRef} src={active?.audioUrl} preload="metadata" />

      <AnimatePresence>
        {active && (
          <motion.div
            key="playerbar"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={cn(
              // Mobile: sits above the bottom nav (57px) with a small margin
              // Desktop (lg+): bottom-0 sits at screen bottom
              "fixed inset-x-0 z-30 lg:z-40",
              "bottom-[calc(57px+env(safe-area-inset-bottom))] lg:bottom-0"
            )}
          >
            {/* Progress bar — hairline at the very top of the player */}
            <div className="relative h-[2px] w-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
              {/* Invisible seek overlay */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                data-testid="input-player-seek"
              />
            </div>

            {/* Main bar */}
            <div className="border-t border-white/8 bg-background/85 backdrop-blur-2xl">
              <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">

                {/* Album art */}
                <div
                  className={cn(
                    "relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                    !active.coverUrl && "bg-gradient-to-br",
                    active.coverUrl ? "" : active.coverGradient || "from-white/10 via-white/0 to-white/10",
                  )}
                >
                  {active.coverUrl ? (
                    <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 opacity-50 blur-[10px]" />
                  )}
                </div>

                {/* Track info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight" data-testid="text-player-title">
                    {active.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground leading-tight" data-testid="text-player-artist">
                    {active.artist}
                  </div>
                </div>

                {/* Time — hidden on xs */}
                <span className="hidden shrink-0 tabular-nums text-xs text-muted-foreground sm:block">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Controls */}
                <div className="flex shrink-0 items-center gap-0.5">

                  {/* Play / Pause */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="h-9 w-9"
                    data-testid="button-player-play-pause"
                  >
                    {isPlaying
                      ? <Pause className="h-4 w-4" />
                      : <Play className="h-4 w-4 translate-x-px" />}
                  </Button>

                  {/* Like */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleLike}
                    disabled={isLiking}
                    data-testid="button-player-like"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
                      )}
                    />
                  </Button>

                  {/* Volume slider — desktop only */}
                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-xs text-muted-foreground">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-white/20"
                      data-testid="input-player-volume"
                    />
                  </div>

                  {/* Support (Crown) */}
                  <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:inline-flex" data-testid="button-player-support">
                        <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-primary" />
                          Support the Artist
                        </DialogTitle>
                        <DialogDescription>
                          Show your appreciation for the music you love. Support features coming soon!
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="glass glow noise rounded-2xl p-4 text-center">
                          <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
                          <div className="text-sm font-medium">Tip Jar</div>
                          <div className="mt-1 text-xs text-muted-foreground">Direct support for artists</div>
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                          Support functionality is currently in development. Check back soon!
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Overflow menu */}
                  <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-player-menu">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" side="top" align="end" sideOffset={8}>
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 disabled:opacity-50"
                        data-testid="button-player-download"
                      >
                        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {isDownloading ? "Downloading…" : "Download"}
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
                        data-testid="button-player-share"
                      >
                        <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Share
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8"
                        data-testid="button-player-copy-link"
                      >
                        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Copy link
                      </button>
                      <div className="my-1 border-t border-white/8" />
                      <button
                        onClick={() => { setMenuOpen(false); setActive(null); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/8 text-muted-foreground"
                        data-testid="button-player-close"
                      >
                        <X className="h-4 w-4 shrink-0" />
                        Close player
                      </button>
                    </PopoverContent>
                  </Popover>

                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PlayerBar;