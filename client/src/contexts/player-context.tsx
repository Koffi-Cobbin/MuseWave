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
  queue: Track[];
  queueIndex: number;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  insertNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrev: () => void;
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
   *
   * Strategy:
   *  1. Set gesturePlayPendingRef synchronously so PlayerBar's core effect
   *     skips the redundant audio.src/load() it would do on re-render.
   *  2. Immediately assign audio.src to the network URL and call play() —
   *     no await, no delay.  The browser starts buffering right away.
   *  3. In the background, check IndexedDB for an offline blob.  If one is
   *     found before meaningful playback has started (currentTime < 1 s),
   *     silently swap to the local src so the rest of the track plays
   *     without touching the network.
   */
  const resolveAndPlay = useCallback(async (track: Track) => {
    const audio = audioElementRef.current;
    if (!audio) return;

    // Must be set before any await so the sync effect in PlayerBar sees it
    // on the very next render and skips the double-load.
    gesturePlayPendingRef.current = true;

    // ── Step 1: play immediately from the network URL ────────────────────
    audio.src = track.audioUrl;
    audio.load();

    const startPlay = () => {
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {
          // Rejected — attach a one-shot canplay fallback.
          audio.addEventListener(
            "canplay",
            () => { audio.play().catch(() => setIsPlaying(false)); },
            { once: true },
          );
        });
      }
    };
    startPlay();

    // ── Step 2: upgrade to offline blob if available ─────────────────────
    // Only swap if the same track is still active and hasn't buffered past
    // 1 second (so the swap is seamless / barely noticeable).
    try {
      const blob = await getTrackBlob(track.id);
      if (
        blob &&
        audioElementRef.current === audio &&
        audio.currentTime < 1.0
      ) {
        const blobUrl = URL.createObjectURL(blob);
        const resumeTime = audio.currentTime;
        audio.src = blobUrl;
        audio.load();
        audio.currentTime = resumeTime;
        startPlay();
      }
    } catch {
      // No offline blob or DB error — keep playing from network URL.
    }
  }, []);

  // ── Queue navigation ──────────────────────────────────────────────────────
  //
  // playNext / playPrev use resolveAndPlay directly (same path as playTrack /
  // playQueue) instead of the autoPlay state → canplay chain.  This ensures
  // the audio element starts loading and playing immediately without waiting
  // for a canplay event that may be blocked by browser autoplay policies.

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex];
      setQueueIndex(nextIndex);
      setActiveState(nextTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(nextTrack);
    } else if (repeatMode === "all" && queue.length > 0) {
      const firstTrack = queue[0];
      setQueueIndex(0);
      setActiveState(firstTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(firstTrack);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, repeatMode, resolveAndPlay]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = queue[prevIndex];
      setQueueIndex(prevIndex);
      setActiveState(prevTrack);
      setIsPlaying(true);
      setAutoPlay(false);
      resolveAndPlay(prevTrack);
    }
  }, [queue, queueIndex, resolveAndPlay]);

  const hasNext = queue.length > 0 && queueIndex < queue.length - 1;
  const hasPrev = queue.length > 0 && queueIndex > 0;
  const queueCount = Math.max(0, queue.length - queueIndex - 1);

  const playTrack = useCallback((track: Track) => {
    setActiveState(track);
    setIsPlaying(true);
    setAutoPlay(false);
    // Fire-and-forget — resolveAndPlay is async but we kick it off immediately
    // inside the synchronous gesture handler so iOS unlocks audio.
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
      queue,
      queueIndex,
      setQueue,
      insertNext,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      playNext,
      playPrev,
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
