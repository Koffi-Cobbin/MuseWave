import { useEffect, useRef } from "react";
import type { Track } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseMediaSessionOptions {
  active: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onSeek: (time: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Syncs playback state with the browser Media Session API so the OS lock
 * screen, notification shade, Bluetooth headphones, and car displays show
 * the current track and respond to hardware/software media controls.
 *
 * ## What this manages
 *
 * 1. **Metadata** — title, artist, album, artwork (updated on track change).
 * 2. **Playback state** — "playing" / "paused" badge on the notification.
 * 3. **Action handlers** — play, pause, stop, previoustrack, nexttrack,
 *    seekbackward, seekforward, seekto (Chrome / car displays).
 *    Handlers are registered once per track using stable refs so
 *    seek-offset values always read the latest currentTime/duration
 *    without re-registering on every timeupdate.
 * 4. **Position state** — seek bar on lock screen / car display.
 *    Called on every currentTime change; guarded against NaN/Infinity.
 *
 * ## Platform notes
 *
 * - iOS 15+ supports metadata + actions; setPositionState is silently ignored
 *   on older Safari versions (the try/catch handles it).
 * - `seekto` is Chrome-only; the try/catch when registering it handles
 *   browsers that don't support it.
 * - Artwork src must be an absolute HTTPS URL on iOS — this hook converts
 *   relative URLs to absolute automatically.
 */
export function useMediaSession({
  active,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSkipNext,
  onSkipPrev,
  onSeek,
}: UseMediaSessionOptions): void {
  // ── Stable refs — action handlers read these so they never need
  //    re-registration when callbacks or time values change ──────────────────
  const onPlayRef    = useRef(onPlay);
  const onPauseRef   = useRef(onPause);
  const onNextRef    = useRef(onSkipNext);
  const onPrevRef    = useRef(onSkipPrev);
  const onSeekRef    = useRef(onSeek);
  const timeRef      = useRef(currentTime);
  const durationRef  = useRef(duration);

  useEffect(() => { onPlayRef.current   = onPlay;     }, [onPlay]);
  useEffect(() => { onPauseRef.current  = onPause;    }, [onPause]);
  useEffect(() => { onNextRef.current   = onSkipNext; }, [onSkipNext]);
  useEffect(() => { onPrevRef.current   = onSkipPrev; }, [onSkipPrev]);
  useEffect(() => { onSeekRef.current   = onSeek;     }, [onSeek]);
  useEffect(() => { timeRef.current     = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration;   }, [duration]);

  // ── 1. Metadata ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (!active) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork: MediaImage[] = [];
    if (active.coverUrl) {
      // iOS requires absolute HTTPS URLs for artwork
      const src = active.coverUrl.startsWith("http")
        ? active.coverUrl
        : `${window.location.origin}${active.coverUrl}`;
      (["96x96", "128x128", "192x192", "256x256", "384x384", "512x512"] as const).forEach(
        (sizes) => artwork.push({ src, sizes }),
      );
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  active.title,
      artist: active.artist ?? "",
      album:  (active as any).album ?? "",
      artwork,
    });
  }, [active]);

  // ── 2. Playback state ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── 3. Action handlers — registered once per track, use refs ─────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !active) return;

    navigator.mediaSession.setActionHandler("play",          () => onPlayRef.current());
    navigator.mediaSession.setActionHandler("pause",         () => onPauseRef.current());
    navigator.mediaSession.setActionHandler("stop",          () => onPauseRef.current());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current());
    navigator.mediaSession.setActionHandler("nexttrack",     () => onNextRef.current());
    navigator.mediaSession.setActionHandler("seekbackward",  (d) => {
      onSeekRef.current(Math.max(0, timeRef.current - (d.seekOffset ?? 10)));
    });
    navigator.mediaSession.setActionHandler("seekforward",   (d) => {
      onSeekRef.current(Math.min(durationRef.current, timeRef.current + (d.seekOffset ?? 10)));
    });
    // seekto is Chrome-only — wrap in try/catch for other browsers
    try {
      navigator.mediaSession.setActionHandler("seekto", (d) => {
        if (d.seekTime != null) onSeekRef.current(d.seekTime);
      });
    } catch {
      // not supported on this platform
    }

    return () => {
      if (!("mediaSession" in navigator)) return;
      (["play", "pause", "stop", "previoustrack", "nexttrack", "seekbackward", "seekforward"] as MediaSessionAction[])
        .forEach((a) => { try { navigator.mediaSession.setActionHandler(a, null); } catch {} });
      try { navigator.mediaSession.setActionHandler("seekto", null); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ── 4. Position state — lock-screen seek bar ──────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !active) return;
    if (!duration || !isFinite(duration) || isNaN(duration)) return;
    if (isNaN(currentTime)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch {
      // setPositionState may not be supported (older Safari / Firefox)
    }
  }, [currentTime, duration, active?.id]);
}
