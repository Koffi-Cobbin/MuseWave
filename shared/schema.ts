import { z } from "zod";

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string(), // hashed
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  headerUrl: z.string().url().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  socialLinks: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    spotify: z.string().optional(),
    soundcloud: z.string().optional(),
  }).optional(),
  verified: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  verified: true 
});

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;

// ============================================================================
// ALBUM SCHEMAS
// ============================================================================

export const albumSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
  coverGradient: z.string().optional(),
  releaseDate: z.string(),
  genre: z.string().max(50),
  published: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createAlbumSchema = albumSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Album = z.infer<typeof albumSchema>;
export type CreateAlbum = z.infer<typeof createAlbumSchema>;

// ============================================================================
// TRACK SCHEMAS
// ============================================================================

export const trackSchema = z.object({
  id: z.string(),
  userId: z.string(), // owner/artist
  albumId: z.string().optional(), // Association with album
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  artistSlug: z.string(),
  description: z.string().max(2000).optional(),
  genre: z.string().max(50),
  mood: z.string().max(50).optional(),
  tags: z.array(z.string()).default([]),

  // File information
  audioUrl: z.string().url(),
  audioFileSize: z.number(), // bytes
  audioDuration: z.number(), // seconds
  audioFormat: z.string(), // mp3, wav, etc.

  coverUrl: z.string().url().optional(),
  coverGradient: z.string().optional(),

  waveformData: z.string().optional(), // JSON string of waveform data

  // Metadata
  bpm: z.number().optional(),
  key: z.string().optional(), // Musical key

  // Stats
  plays: z.number().default(0),
  likes: z.number().default(0),
  downloads: z.number().default(0),
  shares: z.number().default(0),

  // Status
  published: z.boolean().default(false),
  publishedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTrackSchema = trackSchema.omit({
  id: true,
  plays: true,
  likes: true,
  downloads: true,
  shares: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const updateTrackSchema = trackSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type Track = z.infer<typeof trackSchema>;
export type CreateTrack = z.infer<typeof createTrackSchema>;
export type UpdateTrack = z.infer<typeof updateTrackSchema>;

// ============================================================================
// LIKE SCHEMAS
// ============================================================================

export const likeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  trackId: z.string(),
  createdAt: z.string(),
});

export type Like = z.infer<typeof likeSchema>;

// ============================================================================
// DOWNLOAD SCHEMAS
// ============================================================================

export const downloadSchema = z.object({
  id: z.string(),
  userId: z.string().optional(), // Can be anonymous
  trackId: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
});

export type Download = z.infer<typeof downloadSchema>;

// ============================================================================
// PLAY SCHEMAS
// ============================================================================

export const playSchema = z.object({
  id: z.string(),
  userId: z.string().optional(), // Can be anonymous
  trackId: z.string(),
  duration: z.number(), // How long they listened in seconds
  completed: z.boolean().default(false), // Did they listen to >80%?
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
});

export type Play = z.infer<typeof playSchema>;

// ============================================================================
// FOLLOW SCHEMAS
// ============================================================================

export const followSchema = z.object({
  id: z.string(),
  followerId: z.string(), // User doing the following
  followingId: z.string(), // User being followed
  createdAt: z.string(),
});

export type Follow = z.infer<typeof followSchema>;

// ============================================================================
// PLAYLIST SCHEMAS
// ============================================================================

export const playlistSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coverUrl: z.string().url().optional(),
  trackIds: z.array(z.string()).default([]),
  public: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Playlist = z.infer<typeof playlistSchema>;

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const commentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  trackId: z.string(),
  content: z.string().min(1).max(500),
  timestamp: z.number().optional(), // Position in track (seconds)
  likes: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

// ============================================================================
// SEARCH INDEX SCHEMAS
// ============================================================================

export const searchIndexSchema = z.object({
  tracks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    artistSlug: z.string(),
    genre: z.string(),
    mood: z.string().optional(),
    tags: z.array(z.string()),
    plays: z.number(),
    likes: z.number(),
    publishedAt: z.string().optional(),
  })),
  users: z.array(z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().optional(),
    bio: z.string().optional(),
    verified: z.boolean(),
  })),
});

export type SearchIndex = z.infer<typeof searchIndexSchema>;

// ============================================================================
// AGGREGATE SCHEMAS (for stats/analytics)
// ============================================================================

export const userStatsSchema = z.object({
  userId: z.string(),
  totalTracks: z.number().default(0),
  totalPlays: z.number().default(0),
  totalLikes: z.number().default(0),
  totalDownloads: z.number().default(0),
  totalFollowers: z.number().default(0),
  totalFollowing: z.number().default(0),
  monthlyListeners: z.number().default(0), // Unique plays in last 30 days
  updatedAt: z.string(),
});

export type UserStats = z.infer<typeof userStatsSchema>;

export const trackStatsSchema = z.object({
  trackId: z.string(),
  dailyPlays: z.record(z.string(), z.number()).default({}), // date -> count
  totalUniqueListeners: z.number().default(0),
  avgListenDuration: z.number().default(0), // seconds
  completionRate: z.number().default(0), // percentage
  updatedAt: z.string(),
});

export type TrackStats = z.infer<typeof trackStatsSchema>;