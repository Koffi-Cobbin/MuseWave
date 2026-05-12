import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Playlist, PlaylistShare, Track } from "../../../shared/schema";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";

interface PlaylistContextType {
  playlists: Playlist[];
  sharedWithMe: Playlist[];
  currentPlaylist: (Playlist & { tracks?: Track[] }) | null;
  loading: boolean;
  error: string | null;
  fetchPlaylists: () => Promise<void>;
  fetchSharedWithMe: () => Promise<void>;
  fetchPlaylistById: (id: string, token?: string) => Promise<void>;
  fetchPublicPlaylistsByUser: (userId: string) => Promise<Playlist[]>;
  createPlaylist: (name: string, description?: string, isPublic?: boolean) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, newName: string, description?: string, isPublic?: boolean) => Promise<void>;
  addSongToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, tracks: { id: string; order: number }[]) => Promise<void>;
  setCurrentPlaylist: (playlist: (Playlist & { tracks?: Track[] }) | null) => void;
  clearError: () => void;
  // Sharing — direct user grants
  shareWithUser: (playlistId: string, usernameOrEmail: string, isEmail: boolean, permission: "view" | "edit") => Promise<PlaylistShare>;
  listShares: (playlistId: string) => Promise<PlaylistShare[]>;
  updateShare: (playlistId: string, shareId: string, permission: "view" | "edit") => Promise<PlaylistShare>;
  revokeShare: (playlistId: string, shareId: string) => Promise<void>;
  // Sharing — link
  generateLink: (playlistId: string, permission: "view" | "edit") => Promise<{ shareToken: string; linkPermission: "view" | "edit" }>;
  updateLink: (playlistId: string, permission: "view" | "edit") => Promise<void>;
  revokeLink: (playlistId: string) => Promise<void>;
  // Access via link (no auth required)
  fetchPlaylistByLink: (token: string) => Promise<Playlist & { tracks?: Track[] }>;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<(Playlist & { tracks?: Track[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequestJson<Playlist[]>('GET', API_ENDPOINTS.playlists.list);
      setPlaylists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlists';
      setError(message);
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSharedWithMe = useCallback(async () => {
    try {
      const data = await apiRequestJson<Playlist[]>('GET', API_ENDPOINTS.playlists.sharedWithMe);
      setSharedWithMe(data);
    } catch (err) {
      console.error('Error fetching shared playlists:', err);
    }
  }, []);

  const fetchPlaylistById = useCallback(async (id: string, token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = token
        ? API_ENDPOINTS.playlists.byIdWithToken(id, token)
        : API_ENDPOINTS.playlists.byId(id);
      const data = await apiRequestJson<Playlist & { tracks?: Track[] }>('GET', endpoint);
      setCurrentPlaylist(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlist';
      setError(message);
      console.error('Error fetching playlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicPlaylistsByUser = useCallback(async (userId: string): Promise<Playlist[]> => {
    try {
      return await apiRequestJson<Playlist[]>('GET', API_ENDPOINTS.playlists.byUser(userId));
    } catch (err) {
      console.error('Error fetching public playlists:', err);
      return [];
    }
  }, []);

  const fetchPlaylistByLink = useCallback(async (token: string): Promise<Playlist & { tracks?: Track[] }> => {
    return await apiRequestJson<Playlist & { tracks?: Track[] }>('GET', API_ENDPOINTS.playlists.byLink(token));
  }, []);

  const createPlaylist = useCallback(async (name: string, description?: string, isPublic = false): Promise<Playlist> => {
    setLoading(true);
    setError(null);
    try {
      const newPlaylist = await apiRequestJson<Playlist>(
        'POST',
        API_ENDPOINTS.playlists.create,
        { name, description: description || '', public: isPublic, trackIds: [] }
      );
      setPlaylists(prev => [...prev, newPlaylist]);
      return newPlaylist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestJson('DELETE', API_ENDPOINTS.playlists.delete(id));
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (currentPlaylist?.id === id) setCurrentPlaylist(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPlaylist]);

  const renamePlaylist = useCallback(async (id: string, newName: string, description?: string, isPublic?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name: newName };
      if (description !== undefined) body.description = description;
      if (isPublic !== undefined) body.public = isPublic;
      const updated = await apiRequestJson<Playlist>('PATCH', API_ENDPOINTS.playlists.update(id), body);
      setPlaylists(prev => prev.map(p => p.id === id ? updated : p));
      if (currentPlaylist?.id === id) setCurrentPlaylist({ ...currentPlaylist, ...updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPlaylist]);

  const addSongToPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestJson('POST', API_ENDPOINTS.playlists.addTrack(playlistId), { trackId });
      await fetchPlaylistById(playlistId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add song to playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaylistById]);

  const removeSongFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestJson('POST', API_ENDPOINTS.playlists.removeTrack(playlistId), { trackId });
      await fetchPlaylistById(playlistId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove song from playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaylistById]);

  const reorderPlaylistTracks = useCallback(async (playlistId: string, tracks: { id: string; order: number }[]) => {
    setError(null);
    try {
      await apiRequestJson('POST', API_ENDPOINTS.playlists.reorder(playlistId), tracks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder playlist';
      setError(message);
      throw err;
    }
  }, []);

  // ── Sharing — direct user grants ─────────────────────────────────────────────

  const shareWithUser = useCallback(async (
    playlistId: string,
    usernameOrEmail: string,
    isEmail: boolean,
    permission: "view" | "edit"
  ): Promise<PlaylistShare> => {
    const body = isEmail
      ? { email: usernameOrEmail, permission }
      : { username: usernameOrEmail, permission };
    return await apiRequestJson<PlaylistShare>('POST', API_ENDPOINTS.playlists.shares(playlistId), body);
  }, []);

  const listShares = useCallback(async (playlistId: string): Promise<PlaylistShare[]> => {
    return await apiRequestJson<PlaylistShare[]>('GET', API_ENDPOINTS.playlists.shares(playlistId));
  }, []);

  const updateShare = useCallback(async (
    playlistId: string,
    shareId: string,
    permission: "view" | "edit"
  ): Promise<PlaylistShare> => {
    return await apiRequestJson<PlaylistShare>(
      'PATCH',
      API_ENDPOINTS.playlists.shareById(playlistId, shareId),
      { permission }
    );
  }, []);

  const revokeShare = useCallback(async (playlistId: string, shareId: string): Promise<void> => {
    await apiRequestJson('DELETE', API_ENDPOINTS.playlists.shareById(playlistId, shareId));
  }, []);

  // ── Sharing — link ────────────────────────────────────────────────────────────

  const generateLink = useCallback(async (
    playlistId: string,
    permission: "view" | "edit"
  ): Promise<{ shareToken: string; linkPermission: "view" | "edit" }> => {
    const result = await apiRequestJson<{ shareToken: string; linkPermission: "view" | "edit" }>(
      'POST',
      API_ENDPOINTS.playlists.link(playlistId),
      { permission }
    );
    // Refresh currentPlaylist so shareToken is up to date
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(prev => prev ? { ...prev, shareToken: result.shareToken, linkPermission: result.linkPermission } : prev);
    }
    setPlaylists(prev => prev.map(p => p.id === playlistId
      ? { ...p, shareToken: result.shareToken, linkPermission: result.linkPermission }
      : p
    ));
    return result;
  }, [currentPlaylist]);

  const updateLink = useCallback(async (playlistId: string, permission: "view" | "edit"): Promise<void> => {
    await apiRequestJson('PATCH', API_ENDPOINTS.playlists.link(playlistId), { permission });
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(prev => prev ? { ...prev, linkPermission: permission } : prev);
    }
  }, [currentPlaylist]);

  const revokeLink = useCallback(async (playlistId: string): Promise<void> => {
    await apiRequestJson('DELETE', API_ENDPOINTS.playlists.link(playlistId));
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(prev => prev ? { ...prev, shareToken: null, linkPermission: undefined } : prev);
    }
    setPlaylists(prev => prev.map(p => p.id === playlistId
      ? { ...p, shareToken: null, linkPermission: undefined }
      : p
    ));
  }, [currentPlaylist]);

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        sharedWithMe,
        currentPlaylist,
        loading,
        error,
        fetchPlaylists,
        fetchSharedWithMe,
        fetchPlaylistById,
        fetchPublicPlaylistsByUser,
        fetchPlaylistByLink,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        reorderPlaylistTracks,
        setCurrentPlaylist,
        clearError,
        shareWithUser,
        listShares,
        updateShare,
        revokeShare,
        generateLink,
        updateLink,
        revokeLink,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error("usePlaylists must be used within a PlaylistProvider");
  }
  return context;
}
