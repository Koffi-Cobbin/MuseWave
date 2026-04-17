import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Playlist, Track } from "../../../shared/schema";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";

interface PlaylistContextType {
  playlists: Playlist[];
  currentPlaylist: (Playlist & { tracks?: Track[] }) | null;
  loading: boolean;
  error: string | null;
  fetchPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, newName: string, description?: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  setCurrentPlaylist: (playlist: (Playlist & { tracks?: Track[] }) | null) => void;
  clearError: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
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
      const data = await apiRequestJson<Playlist[]>(
        'GET',
        API_ENDPOINTS.playlists.list
      );
      setPlaylists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlists';
      setError(message);
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylistById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequestJson<Playlist & { tracks?: Track[] }>(
        'GET',
        API_ENDPOINTS.playlists.byId(id)
      );
      setCurrentPlaylist(data);
      console.log('Fetched playlist:', data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlist';
      setError(message);
      console.error('Error fetching playlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlaylist = useCallback(async (name: string, description?: string): Promise<Playlist> => {
    setLoading(true);
    setError(null);
    try {
      const newPlaylist = await apiRequestJson<Playlist>(
        'POST',
        API_ENDPOINTS.playlists.create,
        {
          name,
          description: description || '',
          public: true,
          trackIds: [],
        }
      );
      setPlaylists([...playlists, newPlaylist]);
      return newPlaylist;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [playlists]);

  const deletePlaylist = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestJson(
        'DELETE',
        API_ENDPOINTS.playlists.delete(id)
      );
      setPlaylists(playlists.filter(p => p.id !== id));
      if (currentPlaylist?.id === id) {
        setCurrentPlaylist(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [playlists, currentPlaylist]);

  const renamePlaylist = useCallback(async (id: string, newName: string, description?: string) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await apiRequestJson<Playlist>(
        'PATCH',
        API_ENDPOINTS.playlists.update(id),
        {
          name: newName,
          description: description !== undefined ? description : currentPlaylist?.description,
        }
      );
      setPlaylists(playlists.map(p => p.id === id ? updated : p));
      if (currentPlaylist?.id === id) {
        setCurrentPlaylist({ ...currentPlaylist, ...updated });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [playlists, currentPlaylist]);

  const addSongToPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestJson(
        'POST',
        API_ENDPOINTS.playlists.addTrack(playlistId),
        { trackId }
      );
      // Refresh the playlist
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
      await apiRequestJson(
        'POST',
        API_ENDPOINTS.playlists.removeTrack(playlistId),
        { trackId }
      );
      // Refresh the playlist
      await fetchPlaylistById(playlistId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove song from playlist';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPlaylistById]);

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        currentPlaylist,
        loading,
        error,
        fetchPlaylists,
        fetchPlaylistById,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        setCurrentPlaylist,
        clearError,
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
