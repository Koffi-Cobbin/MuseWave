import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from "react";
import type { Track } from "../../../shared/schema";

export type RepeatMode = "off" | "all" | "one";

// ── Playback persistence ──────────────────────────────────────────────────────

const PLAYER_STATE_KEY = "musewave_player_state";

interface PersistedPlayerState {
  active: Track | null;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
}

function readPlayerState(field: keyof PersistedPlayerState) {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return undefined;
    return (JSON.parse(raw) as PersistedPlayerState)[field];
  } catch {
    return undefined;
  }
}

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
  insertAllNext: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  addAllToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  /**
   * Auto-advance to next track (called from the audio "ended" event — NOT a
   * user gesture).  Updates state only; the usePlayback hook handles loading
   * and playing via the canplay-listener path, which browsers allow for media
   * auto-advance even without a user gesture.
   */
  playNext: () => void;
  /**
   * Skip to next track initiated by a user tap/click.
   * Updates state only — audio playback is handled by usePlayback hook.
   * @returns The next track to play, or null if no more tracks.
   */
  skipNext: () => Track | null;
  /**
   * Skip to previous track initiated by a user tap/click.
   * Updates state only — audio playback is handled by usePlayback hook.
   * @returns The previous track to play, or null if at start of queue.
   */
  skipPrev: () => Track | null;
  hasNext: boolean;
  hasPrev: boolean;
  queueCount: number;
  repeatMode: RepeatMode;
  toggleRepeatMode: () => void;
  /**
   * Direct-initiation play for a single track.
   * Updates state only — audio playback is handled by usePlayback hook.
   * @returns The track that was set as active.
   */
  playTrack: (track: Track) => Track;
  playQueue: (tracks: Track[], startIndex?: number) => Track | null;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Track | null>(
    () => (readPlayerState("active") as Track | null) ?? null
  );
  const [autoPlay, setAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // always start paused (autoplay policy)
  const [isBuffering, setIsBuffering] = useState(false);
  const [queue, setQueueState] = useState<Track[]>(
    () => (readPlayerState("queue") as Track[] | undefined) ?? []
  );
  const [queueIndex, setQueueIndex] = useState<number>(
    () => (readPlayerState("queueIndex") as number | undefined) ?? -1
  );
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(
    () => (readPlayerState("repeatMode") as RepeatMode | undefined) ?? "off"
  );

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

  const insertAllNext = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return;
    if (queue.length === 0) {
      if (active) {
        setQueueState([active, ...tracks]);
        setQueueIndex(0);
      } else {
        setQueueState(tracks);
        setQueueIndex(0);
        setActiveState(tracks[0]);
        setAutoPlay(true);
      }
    } else {
      const next = [...queue];
      next.splice(queueIndex + 1, 0, ...tracks);
      setQueueState(next);
    }
  }, [queue, queueIndex, active]);

  const addAllToQueue = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return;
    setQueueState((prev) => [...prev, ...tracks]);
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

  // ── Auto-advance (NOT a user gesture) ─────────────────────────────────────
  //
  // Called only from the audio "ended" event handler in PlayerBar.
  // We must NOT call audio.play() here because:
  //   • The "ended" event is NOT a trusted user gesture on iOS/Android.
  //   • Calling audio.play() outside a gesture stack will be blocked by the
  //     browser's autoplay policy and the promise will silently reject.
  //
  // Instead, we update React state (active track + autoPlay flag).
  // The usePlayback hook or PlayerBar's sync effect detects the new active.id
  // and takes the non-gesture path: audio.src = src; canplay → play()
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
  // These ARE called from user tap/click handlers.  They update state only;
  // audio playback is handled by the usePlayback hook in PlayerBar.

  const skipNext = useCallback((): Track | null => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (q.length === 0) {
      setIsPlaying(false);
      return null;
    }
    const nextIndex = idx + 1;
    if (nextIndex < q.length) {
      setQueueIndex(nextIndex);
      setActiveState(q[nextIndex]);
      setIsPlaying(true);
      setAutoPlay(false);
      return q[nextIndex];
    } else if (repeat === "all" && q.length > 0) {
      setQueueIndex(0);
      setActiveState(q[0]);
      setIsPlaying(true);
      setAutoPlay(false);
      return q[0];
    } else {
      setIsPlaying(false);
      return null;
    }
  }, []);

  const skipPrev = useCallback((): Track | null => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;

    if (q.length === 0) return null;
    const prevIndex = idx - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      setActiveState(q[prevIndex]);
      setIsPlaying(true);
      setAutoPlay(false);
      return q[prevIndex];
    }
    return null;
  }, []);

  const hasNext = queue.length > 0 && queueIndex < queue.length - 1;
  const hasPrev = queue.length > 0 && queueIndex > 0;
  const queueCount = Math.max(0, queue.length - queueIndex - 1);

  const playTrack = useCallback((track: Track): Track => {
    // Reset queue to just this track so stale playlist data doesn't persist.
    // When the track ends, playNext sees a single-element queue and stops
    // playback instead of advancing through a previous playlist queue.
    setQueueState([track]);
    setQueueIndex(0);
    setActiveState(track);
    setIsPlaying(true);
    setAutoPlay(false);
    return track;
  }, []);

  const playQueue = useCallback((tracks: Track[], startIndex = 0): Track | null => {
    setQueueState(tracks);
    setQueueIndex(startIndex);
    if (tracks.length > 0) {
      const track = tracks[startIndex];
      setActiveState(track);
      setIsPlaying(true);
      setAutoPlay(false);
      return track;
    }
    return null;
  }, []);

  // ── Persist queue / active / repeatMode to localStorage ──────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        PLAYER_STATE_KEY,
        JSON.stringify({ active, queue, queueIndex, repeatMode })
      );
    } catch {
      // ignore quota / private-browsing errors
    }
  }, [active, queue, queueIndex, repeatMode]);

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
      insertAllNext,
      addToQueue,
      addAllToQueue,
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