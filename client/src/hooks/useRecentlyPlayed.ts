/**
 * useRecentlyPlayed
 *
 * Tracks which songs the user has listened to by watching the player's
 * `active` track.  Stores up to MAX_ENTRIES tracks in localStorage so the
 * list survives page reloads.  Entries are deduped and sorted newest-first.
 */

import { useState, useEffect, useRef } from "react";
import { usePlayer } from "@/contexts/player-context";
import type { Track } from "../../../shared/schema";

const STORAGE_KEY = "mw_recently_played";
const MAX_ENTRIES = 20;

function readStorage(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Track[];
  } catch {
    return [];
  }
}

function writeStorage(tracks: Track[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {
    // Storage quota exceeded — ignore
  }
}

export function useRecentlyPlayed() {
  const { active } = usePlayer();
  const [recentTracks, setRecentTracks] = useState<Track[]>(readStorage);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || active.id === lastIdRef.current) return;
    lastIdRef.current = active.id;

    setRecentTracks((prev) => {
      // Deduplicate — remove any existing entry for this track, then prepend
      const filtered = prev.filter((t) => t.id !== active.id);
      const next = [active, ...filtered].slice(0, MAX_ENTRIES);
      writeStorage(next);
      return next;
    });
  }, [active?.id]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentTracks([]);
    lastIdRef.current = null;
  };

  return { recentTracks, clearHistory };
}
