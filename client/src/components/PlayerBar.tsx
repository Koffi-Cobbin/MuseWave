import { useRef, useEffect, useState } from "react";
import { Play, Pause, Crown, Heart, MoreVertical, Download, Share2, Link2 } from "lucide-react";
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

function PlayerBar() {
  const { active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [supportOpen, setSupportOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

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

  // Fetch like status when track or user changes
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

  // Single source of truth: sync audio element with isPlaying
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
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const onClear = () => setActive(null);

  // Like toggle
  const handleLike = async () => {
    if (!active) return;
    if (!isAuthenticated || !user) {
      toast({
        title: "Log in to like tracks",
        description: "Create an account to save your favourite tracks.",
        variant: "destructive",
      });
      return;
    }
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked); // optimistic update
    try {
      const endpoint = `${API_BASE_URL}${API_ENDPOINTS.likes.create(active.id)}`;
      const method = wasLiked ? "DELETE" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Like request failed");
    } catch {
      setIsLiked(wasLiked); // revert on failure
      toast({ title: "Something went wrong", description: "Could not update like.", variant: "destructive" });
    } finally {
      setIsLiking(false);
    }
  };

  // Download
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

  // Share
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
        toast({ title: "Link copied!", description: "Share link copied to clipboard." });
      } catch {
        toast({ title: "Share failed", description: "Unable to copy link.", variant: "destructive" });
      }
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    setMenuOpen(false);
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <>
      <audio ref={audioRef} src={active?.audioUrl} preload="metadata" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 sm:py-3">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3">

            {/* Row 1: Track info */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                  !active?.coverUrl && "bg-gradient-to-br",
                  active?.coverUrl ? "" : active?.coverGradient || "from-white/10 via-white/0 to-white/10",
                )}
                aria-hidden="true"
              >
                {active?.coverUrl ? (
                  <img src={active.coverUrl} alt={`${active.title} cover`} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 opacity-50 blur-[10px]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" data-testid="text-player-title">
                  {active ? active.title : "Nothing playing"}
                </div>
                <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist">
                  {active ? active.artist : "Pick a track to preview"}
                </div>
              </div>

              {/* Like button — mobile (row 1) */}
              {active && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 px-2 sm:hidden"
                  onClick={handleLike}
                  disabled={isLiking}
                  data-testid="button-player-like-mobile"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
                    )}
                  />
                </Button>
              )}
            </div>

            {/* Row 2: Controls */}
            {active && (
              <div className="flex items-center justify-between gap-2">

                {/* Play/pause + seek */}
                <div className="flex flex-1 min-w-0 items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="shrink-0"
                    data-testid="button-player-play-pause"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <div className="flex flex-1 min-w-0 items-center gap-1">
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20"
                      data-testid="input-player-seek"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">

                  {/* Volume — desktop */}
                  <div className="hidden items-center gap-1 sm:flex">
                    <span className="text-xs text-muted-foreground">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-white/20"
                      data-testid="input-player-volume"
                    />
                  </div>

                  {/* Volume — mobile popover */}
                  <div className="sm:hidden">
                    <Popover open={volumeOpen} onOpenChange={setVolumeOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-1" data-testid="button-player-volume">
                          <span className="text-xs">🔊</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" side="top" align="center">
                        <div className="space-y-2">
                          <div className="text-center text-xs font-medium">Volume</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20"
                            data-testid="input-player-volume-mobile"
                          />
                          <div className="text-center text-xs text-muted-foreground">
                            {Math.round(volume * 100)}%
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Like — desktop */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden px-2 sm:inline-flex"
                    onClick={handleLike}
                    disabled={isLiking}
                    data-testid="button-player-like"
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
                      )}
                    />
                  </Button>

                  {/* Support (Crown) */}
                  <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={!active} data-testid="button-player-support">
                        <Crown className="h-3.5 w-3.5" />
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

                  {/* Ellipsis menu — download + share + copy link */}
                  <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-2" data-testid="button-player-menu">
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
                    </PopoverContent>
                  </Popover>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default PlayerBar;