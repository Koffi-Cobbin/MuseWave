import { useRef, useEffect, useState } from "react";
import { Play, Pause, Share2, Crown } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { Track } from "../../../shared/schema";

function PlayerBar() {
  // isPlaying is now in shared context so TrackCard can read it
  const { active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { toast } = useToast();
  const [supportOpen, setSupportOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Apply volume to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [active]);

  useEffect(() => {
    if (autoPlay && active && !isPlaying) {
      togglePlay();
      setAutoPlay(false);
    }
  }, [autoPlay, active]);

  // Reset player state when track changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [active?.id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(error => {
        console.error('Playback error:', error);
        toast({
          title: "Playback error",
          description: "Unable to play this track. Please try again.",
          variant: "destructive",
        });
      });
      setIsPlaying(true);
    }
  };

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
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const onClear = () => setActive(null);

  const handleShare = async () => {
    const url = active ? `${window.location.origin}/artist/${active.artistSlug}` : window.location.href;
    const title = active ? `${active.title} by ${active.artist}` : "MuseWave - Discover indie music";
    const text = active ? `Check out "${active.title}" by ${active.artist} on MuseWave!` : "Discover amazing indie music on MuseWave!";

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Share link copied to clipboard" });
      } catch (error) {
        toast({ title: "Share failed", description: "Unable to copy link to clipboard", variant: "destructive" });
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src={active?.audioUrl} preload="metadata" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-3 py-2 sm:px-4 sm:py-3">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {/* Row 1: Track Info + Share */}
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 flex-1">
                <div
                  className={cn(
                    "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                    !active?.coverUrl && "bg-gradient-to-br",
                    active?.coverUrl ? "" : active?.coverGradient || "from-white/10 via-white/0 to-white/10",
                  )}
                  aria-hidden="true"
                >
                  {active?.coverUrl ? (
                    <img
                      src={active.coverUrl}
                      alt={`${active.title} cover`}
                      className="h-full w-full object-cover"
                    />
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
              </div>

              {/* Share button for small screens */}
              {active && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="px-2 shrink-0 sm:hidden"
                  onClick={handleShare}
                  data-testid="button-player-share-mobile"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Row 2: Controls */}
            {active && (
              <div className="flex items-center justify-between gap-2">
                {/* Playback Controls */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="shrink-0"
                    data-testid="button-player-play-pause"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer min-w-0"
                      data-testid="input-player-seek"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Volume & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Volume control - desktop */}
                  <div className="hidden sm:flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      data-testid="input-player-volume"
                    />
                  </div>

                  {/* Volume popover for small screens */}
                  <div className="sm:hidden">
                    <Popover open={volumeOpen} onOpenChange={setVolumeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                          data-testid="button-player-volume"
                        >
                          <span className="text-xs">🔊</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" side="top" align="center">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-center">Volume</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                            data-testid="input-player-volume-mobile"
                          />
                          <div className="text-xs text-muted-foreground text-center">
                            {Math.round(volume * 100)}%
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2 hidden sm:inline-flex"
                    onClick={handleShare}
                    data-testid="button-player-share"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>

                  <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!active}
                        data-testid="button-player-support"
                      >
                        <Crown className="h-3 w-3" />
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
                          <Crown className="mx-auto h-8 w-8 text-primary mb-2" />
                          <div className="text-sm font-medium">Tip Jar</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Direct support for artists
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Support functionality is currently in development. Check back soon!
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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