import { createContext, useContext, useState, ReactNode } from "react";
import type { Track } from "../../../shared/schema";

type PlayerContextType = {
  active: Track | null;
  setActive: (track: Track | null) => void;
  autoPlay: boolean;
  setAutoPlay: (value: boolean) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Track | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  return (
    <PlayerContext.Provider value={{ active, setActive, autoPlay, setAutoPlay }}>
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