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
    create: '/api/users/create',
    update: (id: string) => `/api/users/${id}/update`,
    stats: (id: string) => `/api/users/${id}/stats`,
    delete: (id: string) => `/api/users/${id}`,
    login: '/api/users/login',    // Django URLconf shows no trailing slash
    logout: '/api/users/logout',  // Django URLconf shows no trailing slash
    refreshToken: '/api/users/refresh',  // Django URLconf shows no trailing slash
    verifyToken: '/api/users/verify-token',
    changePassword: '/api/users/password/change',
    resetPassword: '/api/users/password/reset',
    resetPasswordConfirm: '/api/users/password/reset/confirm',
    // Email verification endpoints
    verifyEmail: (uidb64: string, token: string) => `/api/users/verify-email/${uidb64}/${token}/`,
    resendVerification: '/api/users/resend-verification',
    verificationStatus: '/api/users/verification-status',
    // Account management
    likes: (userId: string) => `/api/users/${userId}/likes`,
    plays: (userId: string) => `/api/users/${userId}/plays`,
    albums: (userId: string) => `/api/users/${userId}/albums`,
    followers: (userId: string) => `/api/users/${userId}/followers`,
    following: (userId: string) => `/api/users/${userId}/following`,
    follow: (userId: string) => `/api/users/${userId}/follow`,
    followCheck: (userId: string, followerId: string) => `/api/users/${userId}/follow/${followerId}`,
  },

  // Tracks
  tracks: {
    list: '/api/tracks',
    byId: (id: string) => `/api/tracks/${id}`,
    create: '/api/tracks/create',
    update: (id: string) => `/api/tracks/${id}`,
    delete: (id: string) => `/api/tracks/${id}`,
    stats: (id: string) => `/api/tracks/${id}/stats`,
    // NEW: Streaming and download endpoints
    stream: (id: string) => `/api/tracks/${id}/stream/`,
    streamUrl: (id: string) => `/api/tracks/${id}/stream-url/`,
    download: (id: string) => `/api/tracks/${id}/download/`,
    shares: (id: string) => `/api/tracks/${id}/shares`,
    shareById: (id: string, shareId: string) => `/api/tracks/${id}/shares/${shareId}`,
  },
  
  // Albums
  albums: {
    byUser: (userId: string) => `/api/users/${userId}/albums`,
    byId: (id: string) => `/api/albums/${id}`,
    create: '/api/albums',
    update: (id: string) => `/api/albums/${id}/update`,
    delete: (id: string) => `/api/albums/${id}/delete`,
  },

  // Playlists
  playlists: {
    list: '/api/playlists',
    byId: (id: string) => `/api/playlists/${id}`,
    byIdWithToken: (id: string, token: string) => `/api/playlists/${id}?token=${token}`,
    create: '/api/playlists',
    update: (id: string) => `/api/playlists/${id}`,
    delete: (id: string) => `/api/playlists/${id}`,
    addTrack: (id: string) => `/api/playlists/${id}/add-track`,
    removeTrack: (id: string) => `/api/playlists/${id}/remove-track`,
    reorder: (id: string) => `/api/playlists/${id}/reorder`,
    // Sharing — direct user grants
    shares: (id: string) => `/api/playlists/${id}/shares`,
    shareById: (id: string, shareId: string) => `/api/playlists/${id}/shares/${shareId}`,
    // Sharing — link
    link: (id: string) => `/api/playlists/${id}/link`,
    byLink: (token: string) => `/api/playlists/link/${token}`,
    // Shared with me
    sharedWithMe: '/api/playlists/shared-with-me',
    // Public playlists by user
    byUser: (userId: string) => `/api/users/${userId}/playlists`,
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

  // Genres
  genres: {
    list: '/api/genres',
    byId: (id: string) => `/api/genres/${id}`,
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
    const accessToken = localStorage.getItem("accessToken");
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const response = await fetch(getTrackDownloadUrl(trackId), {
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const contentType = response.headers.get("Content-Type") || "";

    // Backend may return JSON with a signed URL instead of the raw file
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const downloadUrl = data.audio_url ?? data.url ?? data.download_url ?? data.downloadUrl;

      if (downloadUrl) {
        // Navigate directly — the backend's Content-Disposition header triggers
        // the native download prompt. On mobile this is the only universally
        // reliable approach (no popup blockers, no trusted-click requirements).
        window.location.href = downloadUrl;
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      throw new Error("Unexpected JSON response from download endpoint");
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