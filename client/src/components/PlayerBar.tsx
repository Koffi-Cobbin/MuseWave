import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Play, Pause, Crown, Heart, MoreVertical, Download, CloudDownload, Share2, Link2, ChevronDown, ChevronUp, SkipBack, SkipForward, ListMusic, Repeat, Repeat1, X, Loader2, Volume2, VolumeX } from "lucide-react";
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
import { usePlayback } from "@/playback/usePlayback";
import type { Track } from "../../../shared/schema";

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const {
    active, setActive, autoPlay, setAutoPlay, isPlaying, setIsPlaying,
    isBuffering, setIsBuffering,
    playNext,
    skipNext, skipPrev,
    playTrack,
    hasNext, hasPrev, queueCount, repeatMode,
    toggleRepeatMode,
    queue, queueIndex,
  } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { isTrackDownloaded, downloadForOffline, isOnline } = useOffline();
  const { toast } = useToast();

  const offlineAudioSrc = useOfflineAudio(active);

  // Resolve the next track and its audio src (incl. offline blob) for preloading
  const nextTrack = useMemo(() => {
    if (queue.length === 0) return null;
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) return queue[nextIndex];
    if (repeatMode === "all") return queue[0];
    return null;
  }, [queue, queueIndex, repeatMode]);

  const nextOfflineAudioSrc = useOfflineAudio(nextTrack);

  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Volume persistence ────────────────────────────────────────────────────
  const [volume, setVolume] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem("musewave_player_volume") ?? "1");
      return isNaN(v) ? 1 : Math.max(0, Math.min(1, v));
    } catch {
      return 1;
    }
  });

  // ── Playback-position persistence ─────────────────────────────────────────
  // Captured once at mount; never changes after initial render.
  const [savedPlaybackTime] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem("musewave_player_time") ?? "0") || 0;
    } catch {
      return 0;
    }
  });
  // True once we've restored the position (so the effect never re-runs for new tracks)
  const positionRestoredRef = useRef(false);

  // ── usePlayback hook — owns all audio events + strategies ───────────────

  const {
    nonGesturePlay,
    togglePlay, seek,
    currentTime, duration,
    isPlayPending, onEndedRef,
  } = usePlayback(audioRef, { setIsPlaying, setIsBuffering });

  // ── Stable refs for callbacks inside event handlers ─────────────────────

  const playNextRef = useRef(playNext);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);
  const currentTimeRef = useRef(0);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  const setIsPlayingRef = useRef(setIsPlaying);
  useEffect(() => { setIsPlayingRef.current = setIsPlaying; }, [setIsPlaying]);

  // Stable ref so the onEnded handler always sees the current next track
  const nextTrackRef = useRef(nextTrack);
  useEffect(() => { nextTrackRef.current = nextTrack; }, [nextTrack]);

  // ── Gapless preload state ────────────────────────────────────────────────
  // preloadAudioRef  — hidden <audio> element used to buffer the next track
  // preloadedTrackId — which track is currently loaded into the preload element
  // gaplessReady     — true once the preload element has buffered enough to play
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedTrackIdRef = useRef<string | null>(null);
  const gaplessReadyRef = useRef(false);
  // Set to the track ID whenever the onEnded handler starts a gapless
  // transition so the watcher effect can distinguish "gapless already live"
  // from "user switched while playing" (Bug 2 fix).
  const gaplessActiveRef = useRef<string | null>(null);

  const playSessionRef = useRef<{ trackId: string } | null>(null);
  const prevVolumeRef = useRef(1);
  const MIN_PLAY_SECONDS = 30;

  // ── Play recording (defined before ended handler which references it) ──

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
      // silent
    }
  }, [user?.id]);

  // ── safePlay: muted play for non-gesture contexts (Bug C & D fix) ────────
  //
  // Calling audio.play() directly from a React effect is blocked on iOS when
  // no user gesture has occurred in the last ~30 seconds (autoplay policy).
  // The reliable workaround on ALL platforms: mute → play → unmute on start.
  // If the muted play itself fails, retry via a 'canplay' listener.
  //
  // This must NOT be used from inside a user-gesture handler (togglePlay,
  // keyboard shortcuts) — those call audio.play() directly, which is correct.
  const safePlay = useCallback((audio: HTMLAudioElement): Promise<void> => {
    const wasMuted = audio.muted;
    audio.muted = true;
    return audio.play()
      .then(() => { audio.muted = wasMuted; })
      .catch(() => {
        audio.muted = wasMuted;
        return new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audio.muted = true;
            audio.play().then(() => { audio.muted = wasMuted; resolve(); }).catch(() => resolve());
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
        });
      });
  }, []);

  // ── Ended handler — sets onEndedRef for usePlayback to call ────────────

  useEffect(() => {
    onEndedRef.current = () => {
      // Record completed play for the track that just ended
      const curActive = activeRef.current;
      if (curActive) {
        const playedSec = Math.floor(currentTimeRef.current);
        if (playedSec > 0) recordPlay(curActive.id, playedSec, true);
      }

      const audio = audioRef.current;
      if (!audio) return;

      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        // Muted play works outside gesture context on all platforms,
        // avoiding the Android Chrome hang bug with audio.load().
        const wasMuted = audio.muted;
        audio.muted = true;
        audio.play().then(() => { audio.muted = wasMuted; }).catch(() => { audio.muted = wasMuted; });
      } else {
        // ── Gapless transition ──────────────────────────────────────────
        // If the next track is already buffered in the preload element,
        // swap the src and call play() immediately — inside the "ended"
        // event, which browsers treat as a trusted media context (no
        // autoplay block). This eliminates the audible gap between tracks.
        //
        // The watcher effect that fires after playNextRef() will see
        // !audio.paused and skip the redundant nonGesturePlay() call.
        const preload = preloadAudioRef.current;
        const nextTrk = nextTrackRef.current;
        if (
          gaplessReadyRef.current &&
          preload &&
          nextTrk &&
          preloadedTrackIdRef.current === nextTrk.id
        ) {
          // Mark that gapless play is starting for this track ID so the
          // watcher effect can recognise "already playing" vs "user switch".
          gaplessActiveRef.current = nextTrk.id;
          audio.src = preload.src;
          audio.play().catch(() => {
            // Gapless play failed; clear the marker so the watcher retries.
            gaplessActiveRef.current = null;
            gaplessReadyRef.current = false;
          });
        }

        playNextRef.current();
        // active state change triggers the watcher effect below.
        // If gapless play already started, the watcher skips nonGesturePlay.
      }
    };
  }, [onEndedRef, activeRef, currentTimeRef, audioRef, repeatModeRef, playNextRef, recordPlay]);

  // ── Track the previous active ID so we don't re-play on isPlaying toggle ─

  const prevActiveIdRef = useRef<string | null>(null);

  // ── Watcher effect: sync isPlaying + active to the audio element ───────
  //
  // This single effect handles ALL playback state synchronization:
  //
  //   • New track (active.id changed) + isPlaying → nonGesturePlay
  //   • Same-track pause (isPlaying=false)        → audio.pause()
  //   • Same-track resume (isPlaying=true)        → audio.play()
  //
  // Previously the effect returned early for same-track changes, which broke
  // pause/resume from track cards and the PlayerBar togglePlay fix.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) return;

    const currentId = active?.id ?? null;
    const isNewTrack = currentId !== prevActiveIdRef.current;
    prevActiveIdRef.current = currentId;

    if (!isPlaying) {
      // Pause the audio (handles same-track pause from track cards / pages)
      audio.pause();
      return;
    }

    if (isNewTrack) {
      // New track: let the platform strategy load and play
      if (isPlayPending) return;
      setAutoPlay(false);
      // Gapless check: the onEnded handler explicitly marks gaplessActiveRef
      // with the new track's ID when it starts a gapless transition.  Only
      // in that case do we skip nonGesturePlay — audio is already live.
      //
      // We must NOT use `!audio.paused` alone here: a user-initiated track
      // switch while audio is playing also satisfies that condition, which
      // would leave the OLD track playing while the UI shows the new one
      // (Bug 2 fix).
      if (!audio.paused && gaplessActiveRef.current === active.id) {
        gaplessActiveRef.current = null;
        return;
      }
      gaplessActiveRef.current = null; // clear stale marker if track changed
      nonGesturePlay(active).catch(() => setIsPlaying(false));
    } else if (audio.paused && !isPlayPending) {
      // Same track, user resumed (from track card / page toggle).
      // Bug D fix: use safePlay — this effect runs outside the gesture stack,
      // so direct audio.play() would be blocked by iOS autoplay policy.
      safePlay(audio).catch(() => setIsPlaying(false));
    }
  }, [active, isPlaying, isPlayPending, setAutoPlay, setIsPlaying, nonGesturePlay, safePlay]);

  // ── Gapless preload effects ───────────────────────────────────────────────
  //
  // Two effects work together:
  //   1. Reset — when the next track changes, clear the old preload buffer
  //      immediately so we don't accidentally use a stale src.
  //   2. Preload — when we're within PRELOAD_THRESHOLD_SECS of the end,
  //      start loading the next track into the hidden audio element.
  //      gaplessReadyRef is set to true once enough data is buffered.

  const PRELOAD_THRESHOLD_SECS = 20;

  // 1. Reset preload whenever the upcoming next track changes
  useEffect(() => {
    const preload = preloadAudioRef.current;
    if (!preload) return;
    if (preloadedTrackIdRef.current && preloadedTrackIdRef.current !== nextTrack?.id) {
      preload.pause();
      preload.src = "";
      preload.load();
      preloadedTrackIdRef.current = null;
      gaplessReadyRef.current = false;
    }
  }, [nextTrack?.id]);

  // 2. Start preloading when close to the end of the current track
  useEffect(() => {
    const preload = preloadAudioRef.current;
    if (!preload || !nextTrack || !nextOfflineAudioSrc) return;
    if (duration <= 0 || duration - currentTime > PRELOAD_THRESHOLD_SECS) return;
    if (preloadedTrackIdRef.current === nextTrack.id) return; // already loading/loaded

    preloadedTrackIdRef.current = nextTrack.id;
    gaplessReadyRef.current = false;
    preload.volume = 0;
    preload.src = nextOfflineAudioSrc;
    preload.load();

    const onReady = () => { gaplessReadyRef.current = true; };
    const onError = () => { gaplessReadyRef.current = false; };
    preload.addEventListener("canplaythrough", onReady, { once: true });
    preload.addEventListener("error", onError, { once: true });

    return () => {
      preload.removeEventListener("canplaythrough", onReady);
      preload.removeEventListener("error", onError);
    };
  }, [currentTime, duration, nextTrack?.id, nextOfflineAudioSrc]);

  // ── Wrapped skip handlers (state-only; watcher calls nonGesturePlay) ─────

  const handleSkipNext = useCallback(() => {
    skipNext();
  }, [skipNext]);

  const handleSkipPrev = useCallback(() => {
    skipPrev();
  }, [skipPrev]);

  const handlePlayTrack = useCallback((track: Track) => {
    playTrack(track);
  }, [playTrack]);

  // ── UI state ─────────────────────────────────────────────────────────────

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
  const [shortcutHint, setShortcutHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (volume > 0) prevVolumeRef.current = volume;
  }, [volume]);

  useEffect(() => { if (active?.id) setBarMinimized(false); }, [active?.id]);

  useEffect(() => {
    const prevSession = playSessionRef.current;
    if (prevSession && prevSession.trackId !== active?.id) {
      const playedSec = Math.floor(currentTimeRef.current);
      if (playedSec >= MIN_PLAY_SECONDS) {
        recordPlay(prevSession.trackId, playedSec, false);
      }
    }
    if (active?.id) {
      playSessionRef.current = { trackId: active.id };
    } else {
      playSessionRef.current = null;
    }
  }, [active?.id, recordPlay]);

  const offlineSkipCountRef = useRef(0);

  useEffect(() => {
    if (isOnline === false && active && !isTrackDownloaded(active.id)) {
      offlineSkipCountRef.current += 1;
      if (offlineSkipCountRef.current > 10) {
        offlineSkipCountRef.current = 0;
        return;
      }
      playNextRef.current();
    } else {
      offlineSkipCountRef.current = 0;
    }
  }, [active?.id, isOnline]);

  useEffect(() => {
    setIsLiked(false);
  }, [active?.id]);

  // ── Fetch like status ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!active || !user) return;
    fetch(`${API_BASE_URL}${API_ENDPOINTS.likes.check(active.id, user.id)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` },
    })
      .then((r) => r.json())
      .then((data) => setIsLiked(!!data.hasLiked))
      .catch(() => {});
  }, [active?.id, user?.id]);

  // ── When the offline blob resolves for the CURRENT playing track ──────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active || !offlineAudioSrc) return;
    if (
      audio.currentTime < 0.5 &&
      !audio.src.startsWith("blob:") &&
      offlineAudioSrc.startsWith("blob:")
    ) {
      const wasPlaying = !audio.paused;
      audio.src = offlineAudioSrc;
      // Bug C fix: use safePlay (muted trick) — this fires from a React effect,
      // outside the gesture stack. Direct audio.play() would be blocked on iOS.
      if (wasPlaying) {
        safePlay(audio);
      }
    }
  }, [offlineAudioSrc, active?.id, safePlay]);

  // ── Playback persistence effects ──────────────────────────────────────────

  // 1. Restore position once on mount: seek to the saved position so the user
  //    sees where they left off without having to click play.
  //
  // Bug 1 fix — why `isPlaying` is a guard here:
  //
  // `offlineAudioSrc` resolves asynchronously (IndexedDB lookup).  On a fresh
  // page load the user may click a track BEFORE `offlineAudioSrc` settles.
  // When it finally settles this effect re-fires with the new value.  Without
  // the `isPlaying` guard it would execute `audio.src = offlineAudioSrc`,
  // which aborts any `play()` already in flight from the watcher effect —
  // leaving React state showing "playing" but the audio element paused.
  // The user sees the correct track in the bar but hears nothing; only
  // clicking pause-then-play fixes it.
  //
  // Fix: if `isPlaying` is already true the user has started playback through
  // the normal path.  Mark restore done immediately and return without
  // touching `audio.src`.  The watcher effect owns the src in this case.
  //
  // Additionally, only set `audio.src` when there is actually a saved position
  // to seek to (`savedPlaybackTime > 0`).  When there is no saved position
  // the src assignment is pointless and could race with the watcher.
  useEffect(() => {
    if (positionRestoredRef.current) return;
    if (!active || !offlineAudioSrc) return;

    // User already started playing — restore is no longer needed.
    if (isPlaying) {
      positionRestoredRef.current = true;
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    positionRestoredRef.current = true;

    // Only prime the element when there is a saved position to seek to.
    // A savedPlaybackTime of 0 means "start from beginning" — no src
    // assignment needed, and doing so here would race with the watcher.
    if (savedPlaybackTime > 0) {
      audio.src = offlineAudioSrc;
      const handleMeta = () => {
        const target = Math.min(savedPlaybackTime, isFinite(audio.duration) ? audio.duration : savedPlaybackTime);
        audio.currentTime = target;
        seek(target);           // syncs React currentTime state so the seek bar updates
      };
      audio.addEventListener("loadedmetadata", handleMeta, { once: true });
      return () => audio.removeEventListener("loadedmetadata", handleMeta);
    }
  }, [active?.id, offlineAudioSrc, savedPlaybackTime, seek, isPlaying]);

  // 2. Save volume to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem("musewave_player_volume", String(volume)); } catch { /* ignore */ }
  }, [volume]);

  // 3. Save playback position every 5 s while playing
  useEffect(() => {
    if (!active || !isPlaying) return;
    const id = setInterval(() => {
      try {
        localStorage.setItem("musewave_player_time", String(Math.floor(currentTimeRef.current)));
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [active?.id, isPlaying]);

  // 4. When the active track changes (user switches to a new track), reset the
  //    saved time so a future refresh starts that track from the beginning.
  useEffect(() => {
    if (!positionRestoredRef.current) return;    // skip on initial mount
    try { localStorage.setItem("musewave_player_time", "0"); } catch { /* ignore */ }
  }, [active?.id]);

  // ── Keyboard shortcut HUD ─────────────────────────────────────────────────

  const showShortcutHint = useCallback((label: string) => {
    setShortcutHint(label);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShortcutHint(null), 1200);
  }, []);

  useKeyboardShortcuts({
    active,
    isPlaying,
    setIsPlaying,
    audioRef,
    volume,
    setVolume,
    handleSeekDelta: (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
      audio.currentTime = newTime;
    },
    onAction: showShortcutHint,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current);
    }
  }, [volume, setVolume]);

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
      {/*
        The <audio> element has no src prop — we manage src imperatively
        to avoid React overwriting it between the gesture-initiated play()
        call and the first render cycle.  This is the key iOS fix.
      */}
      <audio ref={audioRef} preload="none" playsInline />
      {/* Hidden preload element — buffers the next track for gapless playback */}
      <audio ref={preloadAudioRef} preload="auto" playsInline style={{ display: "none" }} />

      {/* ── Keyboard shortcut HUD badge ────────────────────────────────── */}
      <AnimatePresence>
        {shortcutHint && (
          <motion.div
            key={shortcutHint + Date.now()}
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 z-50 -translate-x-1/2 pointer-events-none"
            style={{ bottom: "calc(var(--bottom-nav-h, 64px) + 88px)" }}
            aria-live="polite"
            aria-label={shortcutHint}
          >
            <div className="rounded-full border border-white/15 bg-black/75 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-xl shadow-lg tabular-nums">
              {shortcutHint}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />

      <PlayScreen
        open={playScreenOpen}
        onClose={() => setPlayScreenOpen(false)}
        currentTime={currentTime}
        duration={duration}
        isLiked={isLiked}
        isLiking={isLiking}
        onSeek={seek}
        onTogglePlay={togglePlay}
        onLike={handleLike}
        onSkipNext={handleSkipNext}
        onSkipPrev={handleSkipPrev}
        onPlayTrack={handlePlayTrack}
        onOpenQueue={() => { setPlayScreenOpen(false); setQueueOpen(true); }}
      />

      <AnimatePresence>
        {active && (
          <>
            {/* ══════════════════════════════════════════════
                MOBILE
            ══════════════════════════════════════════════ */}
            <AnimatePresence>
              {barMinimized ? (
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
                  {!isOnline && (
                    <div className="flex items-center justify-center gap-1.5 bg-amber-500/15 py-1 text-[10px] text-amber-400">
                      <WifiOff className="h-3 w-3" />
                      Offline — only saved tracks are available
                    </div>
                  )}
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

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPlayScreenOpen(true)}
                    onKeyDown={(e) => e.key === "Enter" && setPlayScreenOpen(true)}
                    className="flex cursor-pointer items-center gap-3 bg-background/94 px-3 py-2.5 backdrop-blur-2xl border-t border-white/8 select-none"
                    data-testid="button-open-play-screen"
                    aria-label="Open full player"
                  >
                    <div className={cn(
                      "h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10",
                      !active.coverUrl && "bg-gradient-to-br",
                      active.coverUrl ? "" : active.coverGradient || "from-emerald-500/40 to-fuchsia-500/30",
                    )}>
                      {active.coverUrl && (
                        <img src={active.coverUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="truncate text-sm font-semibold leading-tight" data-testid="text-player-title">
                        {active.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist">
                        {active.artist}
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex h-9 w-9 items-center justify-center text-primary transition hover:text-primary/80"
                        data-testid="button-player-play-pause"
                        aria-label={isBuffering ? "Buffering…" : isPlaying ? "Pause" : "Play"}
                      >
                        {isBuffering && isPlaying
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : isPlaying
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
                DESKTOP
            ══════════════════════════════════════════════ */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/8 bg-background/85 backdrop-blur-2xl lg:block lg:pl-64"
            >
              {!isOnline && (
                <div className="flex items-center justify-center gap-1.5 bg-amber-500/15 py-1.5 text-xs text-amber-400">
                  <WifiOff className="h-3.5 w-3.5" />
                  Offline — only saved tracks are available
                </div>
              )}
              <div className="group/progress relative h-5 w-full">
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-150 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-0.5 pointer-events-none">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
                </div>
                <input
                  type="range" min="0" max={duration || 0} value={currentTime}
                  onChange={handleSeekInput}
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                  data-testid="input-player-seek-desktop"
                />
              </div>

              <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
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

                <div className="flex flex-1 min-w-0 items-center justify-center gap-2">
                  <Button size="icon" variant="ghost" onClick={handleSkipPrev} disabled={!hasPrev} className="shrink-0" data-testid="button-player-prev-desktop" aria-label="Previous track">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={togglePlay} className="shrink-0" data-testid="button-player-play-pause-desktop" aria-label={isBuffering ? "Buffering…" : isPlaying ? "Pause" : "Play"}>
                    {isBuffering && isPlaying
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleSkipNext} disabled={!hasNext} className="shrink-0" data-testid="button-player-next-desktop" aria-label="Next track">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("px-2", repeatMode !== "off" ? "text-primary hover:text-primary/80" : "text-muted-foreground")}
                    onClick={toggleRepeatMode}
                    data-testid="button-player-repeat-desktop"
                  >
                    {repeatMode === "one" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                  </Button>

                  <Button variant="ghost" size="sm" className="relative px-2" onClick={() => setQueueOpen(true)} data-testid="button-player-queue-desktop">
                    <ListMusic className="h-3.5 w-3.5" />
                    {queueCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-white leading-none">
                        {queueCount > 9 ? "9+" : queueCount}
                      </span>
                    )}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="px-1 text-muted-foreground hover:text-foreground" onClick={toggleMute} data-testid="button-player-mute">
                      {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
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