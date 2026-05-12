import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Track } from "../../../shared/schema";

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
  playNext: () => void;
  playPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Track | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);

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
    setQueueState((prev) => {
      if (prev.length === 0) {
        // Nothing playing yet — start a fresh single-track queue
        setQueueIndex(0);
        setActiveState(track);
        setAutoPlay(true);
        return [track];
      }
      // Splice the track in right after the current position
      const next = [...prev];
      next.splice(queueIndex + 1, 0, track);
      return next;
    });
  }, [queueIndex]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      setActiveState(queue[nextIndex]);
      setAutoPlay(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex]);

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
      playNext,
      playPrev,
      hasNext,
      hasPrev,
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
