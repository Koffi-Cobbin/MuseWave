import { useState, useCallback } from "react";
import type { SharedTrack } from "@shared/schema";
import { listSharedTracks } from "@/lib/queryClient";

export function useSharedTracks() {
  const [sharedTracks, setSharedTracks] = useState<SharedTrack[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSharedTracks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSharedTracks();
      setSharedTracks(data);
    } catch (err) {
      console.error("Failed to load shared tracks:", err);
      setSharedTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSharedTracks = useCallback(() => {
    setSharedTracks([]);
  }, []);

  return { sharedTracks, loading, fetchSharedTracks, clearSharedTracks };
}
