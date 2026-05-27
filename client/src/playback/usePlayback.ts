import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { getPlatform } from "./platform";
import { DesktopStrategy } from "./strategies/desktop";
import { iOSStrategy } from "./strategies/ios";
import { AndroidStrategy } from "./strategies/android";
import type { Track } from "../../../shared/schema";

// ============================================================================
// Types
// ============================================================================

/**
 * Stable setters injected by PlayerBar from the player context.
 * Both are stable useState dispatch functions, safe to use as
 * effect dependencies.
 */
export interface PlaybackSetters {
  setIsPlaying: (value: boolean) => void;
  setIsBuffering: (value: boolean) => void;
}

/**
 * Return type of the usePlayback hook.
 *
 * PlayerBar consumes these values and methods to bridge React state
 * with the raw HTMLAudioElement managed by the platform strategies.
 */
export interface UsePlaybackReturn {
  /** Initiate playback from a user gesture (click, tap, keyboard). */
  gesturePlay: (track: Track) => Promise<void>;
  /** Initiate playback from a non-gesture context (auto-advance). */
  nonGesturePlay: (track: Track) => Promise<void>;
  /** Toggle play/pause on the current track. Safe from any context. */
  togglePlay: () => void;
  /** Seek to a specific time in seconds. */
  seek: (time: number) => void;
  /** Current playback position in seconds. */
  currentTime: number;
  /** Duration of the current track in seconds. */
  duration: number;
  /** True while a play() call is in-flight (guards against double-play). */
  isPlayPending: boolean;
  /**
   * Stable ref that PlayerBar sets to its ended event handler.
   * The hook reads this ref when the "ended" event fires, avoiding
   * listener re-attachment when the handler changes.
   */
  onEndedRef: React.MutableRefObject<(() => void) | null>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Central React hook that wraps all three playback strategies and owns
 * all audio event listeners.
 *
 * ## Responsibilities
 *
 * 1. **Strategy creation** — Instantiates the correct platform strategy
 *    (Desktop / iOS / Android) once via `useMemo`.
 * 2. **Audio event listeners** — A single `useEffect` attaches and cleans
 *    up all audio events (timeupdate, loadedmetadata, ended, waiting,
 *    playing, pause, error).
 * 3. **Time/duration state** — Manages `currentTime` and `duration` React
 *    state internally and returns them.
 * 4. **Playback methods** — Exposes `gesturePlay`, `nonGesturePlay`,
 *    `togglePlay`, and `seek` that delegate to the strategy.
 * 5. **onEndedRef pattern** — Provides a stable ref that PlayerBar sets
 *    to its ended handler, avoiding listener re-attachment when the
 *    handler changes (e.g., due to repeat mode or queue changes).
 *
 * ## Non-Responsibilites (handled by PlayerBar)
 *
 * - Volume management
 * - Offline blob URL resolution and swapping
 * - Record play tracking
 * - Repeat mode logic (except the ended signal)
 *
 * @param audioRef  Stable ref to the shared HTMLAudioElement
 * @param setters   Context setters for isPlaying and isBuffering
 */
export function usePlayback(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setters: PlaybackSetters,
): UsePlaybackReturn {
  const { setIsPlaying, setIsBuffering } = setters;

  // --------------------------------------------------------------------------
  // 1. Strategy — created once, never re-created
  // --------------------------------------------------------------------------

  const strategy = useMemo(() => {
    switch (getPlatform()) {
      case "ios":
        return new iOSStrategy();
      case "android":
        return new AndroidStrategy();
      default:
        return new DesktopStrategy();
    }
  }, []);

  // Clean up strategy resources (timers, listeners) on unmount
  useEffect(() => {
    return () => {
      strategy.destroy();
    };
  }, [strategy]);

  // --------------------------------------------------------------------------
  // 2. Time / duration state
  // --------------------------------------------------------------------------

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Synced ref so callbacks (e.g., seek inside an event handler) always
  // read the latest time without needing currentTime as a dependency.
  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // --------------------------------------------------------------------------
  // 3. Ended-event ref — PlayerBar writes its handler here
  // --------------------------------------------------------------------------

  const onEndedRef = useRef<(() => void) | null>(null);

  // --------------------------------------------------------------------------
  // 4. Audio event listeners — single effect, stable deps
  // --------------------------------------------------------------------------
  //
  // Deps are stable: audioRef is a ref object (same reference), and the
  // setters from useState are stable dispatch functions. This effect
  // therefore runs once on mount and cleans up on unmount, exactly what
  // we want for audio event listeners.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => onEndedRef.current?.();
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handlePause = () => setIsBuffering(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [audioRef, setIsPlaying, setIsBuffering]);

  // --------------------------------------------------------------------------
  // 5. Playback methods
  // --------------------------------------------------------------------------

  /**
   * Initiate playback from a user gesture (click, tap, keyboard).
   *
   * Delegates to the strategy's gesturePlay, which sets the audio source
   * and calls play() inside the gesture stack — the only path all browsers
   * reliably support for unmuted playback.
   */
  const gesturePlay = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;
      await strategy.gesturePlay(track, audio);
    },
    [audioRef, strategy],
  );

  /**
   * Initiate playback from a non-gesture context (auto-advance).
   *
   * Delegates to the strategy's nonGesturePlay, which uses platform-
   * specific workarounds (muted play, canplay fallback) to work around
   * browser autoplay policies outside gesture context.
   */
  const nonGesturePlay = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;
      await strategy.nonGesturePlay(track, audio);
    },
    [audioRef, strategy],
  );

  /**
   * Toggle play/pause on the current audio element.
   *
   * - If paused and no play is in-flight → calls play().
   * - If paused but a nonGesturePlay is still resolving → does nothing
   *   (prevents the Android double-play bug).
   * - If playing → pauses.
   */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // Guard: prevent calling play() while auto-advance is in-flight
      if (!strategy.isPlayPending) {
        audio.play().catch(() => setIsPlaying(false));
      }
    } else {
      strategy.pause(audio);
    }
  }, [audioRef, strategy, setIsPlaying]);

  /**
   * Seek to a specific time in seconds.
   *
   * Updates both audio.currentTime and the React state immediately so
   * the UI reflects the new position without waiting for the next
   * timeupdate event.
   */
  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [audioRef],
  );

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    gesturePlay,
    nonGesturePlay,
    togglePlay,
    seek,
    currentTime,
    duration,
    isPlayPending: strategy.isPlayPending,
    onEndedRef,
  };
}
