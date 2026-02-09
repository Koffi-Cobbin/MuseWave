// API Configuration for Django REST Framework Backend

// Base URL for the Django API
// Update this to match your Django server URL
export const API_BASE_URL = 'https://kofficobbin.pythonanywhere.com/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Users
  users: {
    list: '/musewave/users/',
    byId: (id: string) => `/musewave/users/${id}/`,
    byUsername: (username: string) => `/musewave/users/username/${username}/`,
    create: '/musewave/users/create/',
    update: (id: string) => `/musewave/users/${id}/update/`,
    stats: (id: string) => `/musewave/users/${id}/stats/`,
  },

  // Tracks
  tracks: {
    list: '/musewave/tracks/',
    byId: (id: string) => `/musewave/tracks/${id}/`,
    create: '/musewave/tracks/create/',
    update: (id: string) => `/musewave/tracks/${id}/update/`,
    delete: (id: string) => `/musewave/tracks/${id}/delete/`,
    stats: (id: string) => `/musewave/tracks/${id}/stats/`,
  },

  // Albums
  albums: {
    byUser: (userId: string) => `/musewave/users/${userId}/albums`,
    byId: (id: string) => `/musewave/albums/${id}`,
    create: '/musewave/albums',
    update: (id: string) => `/musewave/albums/${id}/update`,
    delete: (id: string) => `/musewave/albums/${id}/delete`,
  },

  // Likes
  likes: {
    create: (trackId: string) => `/musewave/tracks/${trackId}/like/`,
    delete: (trackId: string) => `/musewave/tracks/${trackId}/like/delete/`,
    check: (trackId: string, userId: string) => `/musewave/tracks/${trackId}/like/${userId}/`,
    byUser: (userId: string) => `/musewave/users/${userId}/likes/`,
  },

  // Downloads
  downloads: {
    create: (trackId: string) => `/musewave/tracks/${trackId}/download/`,
    byTrack: (trackId: string) => `/musewave/tracks/${trackId}/downloads/`,
  },

  // Plays
  plays: {
    create: (trackId: string) => `/musewave/tracks/${trackId}/play/`,
    byTrack: (trackId: string) => `/musewave/tracks/${trackId}/plays/`,
    byUser: (userId: string) => `/musewave/users/${userId}/plays/`,
  },

  // Follows
  follows: {
    create: (userId: string) => `/musewave/users/${userId}/follow/`,
    delete: (userId: string) => `/musewave/users/${userId}/follow/delete/`,
    check: (userId: string, followerId: string) => `/musewave/users/${userId}/follow/${followerId}/`,
    followers: (userId: string) => `/musewave/users/${userId}/followers/`,
    following: (userId: string) => `/musewave/users/${userId}/following/`,
  },

  // Search
  search: {
    query: '/musewave/search/',
    rebuild: '/musewave/search/rebuild/',
  },

  // Artists
  artists: {
    list: '/musewave/artists/',
  },
} as const;
