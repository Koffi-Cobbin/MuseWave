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
    update: (id: string) => `/api/users/${id}/update`,
    stats: (id: string) => `/api/users/${id}/stats`,
    delete: (id: string) => `/api/users/${id}/delete`,
    login: '/api/users/login',
    logout: '/api/users/logout',
    refreshToken: '/api/users/refresh',
    verifyToken: '/api/users/verify-token'
  },
  
  // Tracks
  tracks: {
    list: '/api/tracks',
    byId: (id: string) => `/api/tracks/${id}`,
    create: '/api/tracks',
    update: (id: string) => `/api/tracks/${id}/update`,
    delete: (id: string) => `/api/tracks/${id}/delete`,
    stats: (id: string) => `/api/tracks/${id}/stats`,
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
    delete: (trackId: string) => `/api/tracks/${trackId}/like/delete`,
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
    delete: (userId: string) => `/api/users/${userId}/follow/delete`,
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
