import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import type { Track } from "../../../shared/schema";
import { getTrackBlob } from "@/lib/offlineStorage";

export type RepeatMode = "off" | "all" | "one";

type PlayerContextType = {
  active: Track | null;
  setActive: (track: Track | null) => void;
  autoPlay: boolean;
  setAutoPlay: (value: boolean) => void;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  /** True while the audio element is fetching / buffering (waiting event). */
  isBuffering: boolean;
  setIsBuffering: (value: boolean) => void;
  queue: Track[];
  queueIndex: number;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  insertNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  /**
   * Auto-advance to next track (called from the audio "ended" event — NOT a
   * user gesture).  Updates state only; the core PlayerBar sync effect handles
   * loading and playing via the canplay-listener path, which browsers allow
   * for media auto-advance even without a user gesture.
   */
  playNext: () => void;
  /**
   * Skip to next track initiated by a user tap/click.  Uses resolveAndPlay for
   * minimum latency (sets audio.src + calls play() inside the gesture stack).
   */
  skipNext: () => void;
  /**
   * Skip to previous track initiated by a user tap/click.  Same gesture path.
   */
  skipPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  queueCount: number;
  repeatMode: RepeatMode;
  toggleRepeatMode: () => void;
  registerAudioElement: (el: HTMLAudioElement | null) => void;
  /**
   * Direct-initiation play for a single track.
   * Resolves an offline blob URL if available, sets audio.src, and calls
   * audio.play() synchronously within the user-gesture stack so iOS Safari
   * allows playback.  Sets gesturePlayPending so PlayerBar's useEffect skips
   * the canplay-listener path and does not overwrite src mid-play.
   */
  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  /**
   * True when playTrack / playQueue initiated playback directly via a user
   * gesture.  PlayerBar reads and clears this flag to avoid a redundant
   * audio.play() call (which would restart the track from zero on iOS).
   */
  consumeGesturePlay: () => boolean;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Track | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  const setActive = useCallback((track: Track | null) => {
    setActiveState(track);
  }, []);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setQueueState(tracks);
    setQueueIndex(startIndex);
    if (tracks.length > 0) {
      setActiveState(tracks[startIndex]);
      setAutoPlay(true);
    }
  }, []);

  const insertNext = useCallback((track: Track) => {
    if (queue.length === 0) {
      if (active) {
        setQueueState([active, track]);
        setQueueIndex(0);
      } else {
        setQueueState([track]);
        setQueueIndex(0);
        setActiveState(track);
        setAutoPlay(true);
      }
    } else {
      const next = [...queue];
      next.splice(queueIndex + 1, 0, track);
      setQueueState(next);
    }
  }, [queue, queueIndex, active]);

  const addToQueue = useCallback((track: Track) => {
    setQueueState((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setQueueIndex((prevIdx) => {
      if (index < prevIdx) return prevIdx - 1;
      return prevIdx;
    });
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setQueueState((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setQueueIndex((prevIdx) => {
      if (fromIndex === prevIdx) return toIndex;
      if (fromIndex < prevIdx && toIndex >= prevIdx) return prevIdx - 1;
      if (fromIndex > prevIdx && toIndex <= prevIdx) return prevIdx + 1;
      return prevIdx;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setQueueIndex(-1);
  }, []);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  // ── iOS user-gesture direct play ─────────────────────────────────────────

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Set to true by resolveAndPlay before any await so that PlayerBar's core
   * sync effect sees it synchronously on the next render and skips the
   * redundant audio.src / audio.load() path.  Cleared by consumeGesturePlay.
   */
  const gesturePlayPendingRef = useRef(false);

  const registerAudioElement = useCallback((el: HTMLAudioElement | null) => {
    audioElementRef.current = el;
  }, []);

  const consumeGesturePlay = useCallback((): boolean => {
    const was = gesturePlayPendingRef.current;
    gesturePlayPendingRef.current = false;
    return was;
  }, []);

  /**
   * Play a track on the audio element with minimal latency.
   * ONLY call this from a synchronous user-gesture handler.
   */
  const resolveAndPlay = useCallback(async (track: Track) => {
    const audio = audioElementRef.current;
    if (!audio) return;

    // Must be set before any await so the sync effect in PlayerBar sees it
    // on the very next render and skips the double-load.
    gesturePlayPendingRef.current = true;

    // Show loading indicator immediately — PlayerBar clears it on "playing".
    setIsBuffering(true);

    // IMPORTANT: do NOT call audio.load() here.
    // On Android Chrome, audio.load() synchronously aborts any in-flight
    // resource selection algorithm queued by setting audio.src, which causes
    // the subsequent audio.play() call to reject with AbortError.
    audio.src = track.audioUrl;

    const p = audio.play();
    if (p !== undefined) {
      p.catch(() => {
        // play() was rejected — attach a one-shot canplay fallback.
        audio.addEventListener(
          "canplay",
          () => { audio.play().catch(() => setIsPlaying(false)); },
          { once: true },
        );
      });
    }
  }, []);

  // ── playNext: auto-advance (NOT a user gesture) ───────────────────────────
  //
  // Called only from the audio "ended" event handler in PlayerBar.
  // We must NOT call resolveAndPlay / audio.play() here because:
  //   • The "ended" event is NOT a trusted user gesture on iOS/Android.
  //   • Calling audio.play() outside a gesture stack will be blocked by the
  //     browser's autoplay policy and the promise will silently reject.
  //
  // Instead, we update React state (active track + autoPlay flag).
  // PlayerBar's core sync effect detects the new active.id, sees
  // consumeGesturePlay() === false, and takes the non-gesture path:
  //   audio.src = src; audio.load(); canplay → audio.play()
  // Browsers explicitly allow this pattern for media session auto-advance.
  //
  // We use refs inside so the callback is stable and doesn't need to be
  // recreated on every queue/queueIndex change (avoids stale closure in
  // PlayerBar's useEffect dependency array).

  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const repeatModeRef = useRef(repeatMode);
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  repeatModeRef.current = repeatMode;

  const playNext = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (q.length === 0) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = idx + 1;
    if (nextIndex < q.length) {
      setQueueIndex(nextIndex);
      setActiveState(q[nextIndex]);
      // autoPlay=true signals the core sync effect to load+play without a gesture
      setAutoPlay(true);
    } else if (repeat === "all" && q.length > 0) {
      setQueueIndex(0);
      setActiveState(q[0]);
      setAutoPlay(true);
    } else {
      setIsPlaying(false);
    }
  }, []); // stable — reads queue/index/repeatMode via refs

  // ── skipNext / skipPrev: user-gesture skip buttons ────────────────────────
  //
  // These ARE called from user tap/click handlers so they can safely use
  // resolveAndPlay for minimum perceived latency.

  const skipNext = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (q.length === 0) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = idx + 1;
    if (nextIndex < q.length) {
      const nextTrack = q[nextIndex];
      setQueueIndex(nextIndex);
      setActiveState(nextTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(nextTrack);
    } else if (repeat === "all" && q.length > 0) {
      const firstTrack = q[0];
      setQueueIndex(0);
      setActiveState(firstTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(firstTrack);
    } else {
      setIsPlaying(false);
    }
  }, [resolveAndPlay]);

  const skipPrev = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;

    if (q.length === 0) return;
    const prevIndex = idx - 1;
    if (prevIndex >= 0) {
      const prevTrack = q[prevIndex];
      setQueueIndex(prevIndex);
      setActiveState(prevTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(prevTrack);
    }
  }, [resolveAndPlay]);

  const hasNext = queue.length > 0 && queueIndex < queue.length - 1;
  const hasPrev = queue.length > 0 && queueIndex > 0;
  const queueCount = Math.max(0, queue.length - queueIndex - 1);

  const playTrack = useCallback((track: Track) => {
    setActiveState(track);
    setIsPlaying(true);
    setAutoPlay(false);
    resolveAndPlay(track);
  }, [resolveAndPlay]);

  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setQueueState(tracks);
    setQueueIndex(startIndex);
    if (tracks.length > 0) {
      const track = tracks[startIndex];
      setActiveState(track);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(track);
    }
  }, [resolveAndPlay]);

  return (
    <PlayerContext.Provider value={{
      active,
      setActive,
      autoPlay,
      setAutoPlay,
      isPlaying,
      setIsPlaying,
      isBuffering,
      setIsBuffering,
      queue,
      queueIndex,
      setQueue,
      insertNext,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      playNext,
      skipNext,
      skipPrev,
      hasNext,
      hasPrev,
      queueCount,
      repeatMode,
      toggleRepeatMode,
      registerAudioElement,
      consumeGesturePlay,
      playTrack,
      playQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}