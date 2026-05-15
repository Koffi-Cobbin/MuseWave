import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Track } from "../../../shared/schema";

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
  /** Appends a track to the very end of the queue */
  addToQueue: (track: Track) => void;
  /** Removes a track from the queue at the given index */
  removeFromQueue: (index: number) => void;
  /** Moves a track from one queue position to another */
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  /** Empties the entire queue */
  clearQueue: () => void;
  playNext: () => void;
  playPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  queueCount: number;
  repeatMode: RepeatMode;
  /** Cycles repeat: off → all → one → off */
  toggleRepeatMode: () => void;
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
        // A track is already playing but no formal queue exists yet.
        // Build a queue with the current track at position 0 and the
        // requested track at position 1 — WITHOUT changing active or
        // interrupting playback.
        setQueueState([active, track]);
        setQueueIndex(0);
      } else {
        // Nothing playing at all — start the track immediately.
        setQueueState([track]);
        setQueueIndex(0);
        setActiveState(track);
        setAutoPlay(true);
      }
    } else {
      // Normal case: splice in right after the current position.
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
    // If the removed item was before or at the current index, adjust
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
    // Adjust queueIndex if the moved item affected it
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

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      setActiveState(queue[nextIndex]);
      setAutoPlay(true);
    } else if (repeatMode === "all" && queue.length > 0) {
      // Repeat all: loop back to the beginning
      setQueueIndex(0);
      setActiveState(queue[0]);
      setAutoPlay(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, repeatMode, setIsPlaying]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      setActiveState(queue[prevIndex]);
      setAutoPlay(true);
    }
  }, [queue, queueIndex]);

  const hasNext = queue.length > 0 && queueIndex < queue.length - 1;
  const hasPrev = queue.length > 0 && queueIndex > 0;
  // Only count unplayed tracks (after queueIndex) for the badge.
  // Played tracks remain in the array but shouldn't count toward "up next".
  const queueCount = Math.max(0, queue.length - queueIndex - 1);

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
