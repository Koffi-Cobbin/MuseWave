// API Configuration for Django REST Framework Backend
// Base URL for the Django API
// Update this to match your Django server URL
export const API_BASE_URL = 'https://kofficobbin.pythonanywhere.com';

// API Endpoints
export const API_ENDPOINTS = {
  // Users
  users: {
    list: '/api/users',
    byId: (id: string) => `/api/users/${id}`,
    byUsername: (username: string) => `/api/users/username/${username}`,
    create: '/api/users',
    update: (id: string) => `/api/users/${id}`,
    stats: (id: string) => `/api/users/${id}/stats`,
    delete: (id: string) => `/api/users/${id}`,
    login: '/api/users/login',
    logout: '/api/users/logout',
    refreshToken: '/api/users/refresh',
    verifyToken: '/api/users/verify-token',
    changePassword: '/api/users/password/change',
    resetPassword: '/api/users/password/reset',
    resetPasswordConfirm: '/api/users/password/reset/confirm',
  },

  // Tracks
  tracks: {
    list: '/api/tracks',
    byId: (id: string) => `/api/tracks/${id}`,
    create: '/api/tracks',
    update: (id: string) => `/api/tracks/${id}`,
    delete: (id: string) => `/api/tracks/${id}`,
    stats: (id: string) => `/api/tracks/${id}/stats`,
    // NEW: Streaming and download endpoints
    stream: (id: string) => `/api/tracks/${id}/stream/`,
    streamUrl: (id: string) => `/api/tracks/${id}/stream-url/`,
    download: (id: string) => `/api/tracks/${id}/download/`,
  },

  // Albums
  albums: {
    byUser: (userId: string) => `/api/users/${userId}/albums`,
    byId: (id: string) => `/api/albums/${id}`,
    create: '/api/albums',
    update: (id: string) => `/api/albums/${id}/update`,
    delete: (id: string) => `/api/albums/${id}/delete`,
  },

  // Likes
  likes: {
    create: (trackId: string) => `/api/tracks/${trackId}/like`,
    delete: (trackId: string) => `/api/tracks/${trackId}/like`,
    check: (trackId: string, userId: string) => `/api/tracks/${trackId}/like/${userId}`,
    byUser: (userId: string) => `/api/users/${userId}/likes`,
  },

  // Downloads
  downloads: {
    create: (trackId: string) => `/api/tracks/${trackId}/download`,
    byTrack: (trackId: string) => `/api/tracks/${trackId}/downloads`,
  },

  // Plays
  plays: {
    create: (trackId: string) => `/api/tracks/${trackId}/play`,
    byTrack: (trackId: string) => `/api/tracks/${trackId}/plays`,
    byUser: (userId: string) => `/api/users/${userId}/plays`,
  },

  // Follows
  follows: {
    create: (userId: string) => `/api/users/${userId}/follow`,
    delete: (userId: string) => `/api/users/${userId}/follow`,
    check: (userId: string, followerId: string) => `/api/users/${userId}/follow/${followerId}`,
    followers: (userId: string) => `/api/users/${userId}/followers`,
    following: (userId: string) => `/api/users/${userId}/following`,
  },

  // Search
  search: {
    query: '/api/search',
    rebuild: '/api/search/rebuild',
  },

  // Artists
  artists: {
    list: '/api/artists',
  },
} as const;

// Helper function to get the full streaming URL for a track
export const getTrackStreamUrl = (trackId: string): string => {
  return `${API_BASE_URL}${API_ENDPOINTS.tracks.stream(trackId)}`;
};

// Helper function to get the download URL for a track
export const getTrackDownloadUrl = (trackId: string): string => {
  return `${API_BASE_URL}${API_ENDPOINTS.tracks.download(trackId)}`;
};

// Helper function to trigger a download
export const downloadTrack = async (trackId: string, filename?: string): Promise<void> => {
  try {
    const response = await fetch(getTrackDownloadUrl(trackId), {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'track.mp3';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};