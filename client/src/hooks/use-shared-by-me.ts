import { useState, useCallback } from "react";
import type { MySharedTrack, Playlist } from "@shared/schema";
import { apiRequestJson } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/apiConfig";

export function useSharedByMe() {
  const [sharedByMeTracks, setSharedByMeTracks] = useState<MySharedTrack[]>([]);
  const [sharedByMePlaylists, setSharedByMePlaylists] = useState<Playlist[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const fetchSharedByMeTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const data = await apiRequestJson<MySharedTrack[]>("GET", API_ENDPOINTS.tracks.sharedByMe);
      setSharedByMeTracks(data);
    } catch {
      setSharedByMeTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  const fetchSharedByMePlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const data = await apiRequestJson<Playlist[]>("GET", API_ENDPOINTS.playlists.sharedByMe);
      setSharedByMePlaylists(data);
    } catch {
      setSharedByMePlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  return {
    sharedByMeTracks,
    sharedByMePlaylists,
    loadingTracks,
    loadingPlaylists,
    fetchSharedByMeTracks,
    fetchSharedByMePlaylists,
  };
}
