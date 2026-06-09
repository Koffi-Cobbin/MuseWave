import { useState, useCallback } from "react";
import type { MySharedTrack, Playlist, MySharedAlbum, SharedAlbum } from "@shared/schema";
import { apiRequestJson } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/apiConfig";

export function useSharedByMe() {
  // ── Tracks shared BY me ────────────────────────────────────────────────────
  const [sharedByMeTracks, setSharedByMeTracks] = useState<MySharedTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const fetchSharedByMeTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const data = await apiRequestJson<MySharedTrack[]>("GET", API_ENDPOINTS.tracks.sharedByMe);
      setSharedByMeTracks(Array.isArray(data) ? data : []);
    } catch {
      setSharedByMeTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  // ── Playlists shared BY me ─────────────────────────────────────────────────
  const [sharedByMePlaylists, setSharedByMePlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const fetchSharedByMePlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const data = await apiRequestJson<Playlist[]>("GET", API_ENDPOINTS.playlists.sharedByMe);
      setSharedByMePlaylists(Array.isArray(data) ? data : []);
    } catch {
      setSharedByMePlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  // ── Albums shared BY me ────────────────────────────────────────────────────
  const [sharedByMeAlbums, setSharedByMeAlbums] = useState<MySharedAlbum[]>([]);
  const [loadingSharedByMeAlbums, setLoadingSharedByMeAlbums] = useState(false);

  const fetchSharedByMeAlbums = useCallback(async () => {
    setLoadingSharedByMeAlbums(true);
    try {
      const data = await apiRequestJson<MySharedAlbum[]>("GET", API_ENDPOINTS.albums.sharedByMe);
      setSharedByMeAlbums(Array.isArray(data) ? data : []);
    } catch {
      setSharedByMeAlbums([]);
    } finally {
      setLoadingSharedByMeAlbums(false);
    }
  }, []);

  // ── Albums shared WITH me ──────────────────────────────────────────────────
  const [sharedWithMeAlbums, setSharedWithMeAlbums] = useState<SharedAlbum[]>([]);
  const [loadingSharedWithMeAlbums, setLoadingSharedWithMeAlbums] = useState(false);

  const fetchSharedWithMeAlbums = useCallback(async () => {
    setLoadingSharedWithMeAlbums(true);
    try {
      const data = await apiRequestJson<SharedAlbum[]>("GET", API_ENDPOINTS.albums.sharedWithMe);
      setSharedWithMeAlbums(Array.isArray(data) ? data : []);
    } catch {
      setSharedWithMeAlbums([]);
    } finally {
      setLoadingSharedWithMeAlbums(false);
    }
  }, []);

  return {
    // tracks
    sharedByMeTracks,
    loadingTracks,
    fetchSharedByMeTracks,
    // playlists
    sharedByMePlaylists,
    loadingPlaylists,
    fetchSharedByMePlaylists,
    // albums shared by me
    sharedByMeAlbums,
    loadingSharedByMeAlbums,
    fetchSharedByMeAlbums,
    // albums shared with me
    sharedWithMeAlbums,
    loadingSharedWithMeAlbums,
    fetchSharedWithMeAlbums,
  };
}
