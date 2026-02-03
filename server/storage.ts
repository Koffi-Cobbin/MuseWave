import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type {
  User,
  CreateUser,
  Track,
  CreateTrack,
  UpdateTrack,
  Like,
  Download,
  Play,
  Follow,
  Playlist,
  Comment,
  UserStats,
  TrackStats,
  SearchIndex,
} from "@shared/schema";

// ============================================================================
// DATABASE FILE PATHS
// ============================================================================

const DB_DIR = path.join(process.cwd(), "db-data");
const DB_FILES = {
  users: path.join(DB_DIR, "users.json"),
  tracks: path.join(DB_DIR, "tracks.json"),
  likes: path.join(DB_DIR, "likes.json"),
  downloads: path.join(DB_DIR, "downloads.json"),
  plays: path.join(DB_DIR, "plays.json"),
  follows: path.join(DB_DIR, "follows.json"),
  playlists: path.join(DB_DIR, "playlists.json"),
  comments: path.join(DB_DIR, "comments.json"),
  userStats: path.join(DB_DIR, "user-stats.json"),
  trackStats: path.join(DB_DIR, "track-stats.json"),
  searchIndex: path.join(DB_DIR, "search-index.json"),
};

// ============================================================================
// DATABASE INTERFACE
// ============================================================================

export interface IJsonDatabase {
  // Users
  createUser(user: CreateUser): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  listUsers(limit?: number, offset?: number): Promise<User[]>;

  // Tracks
  createTrack(track: CreateTrack): Promise<Track>;
  getTrack(id: string): Promise<Track | null>;
  getTracksByUser(userId: string): Promise<Track[]>;
  updateTrack(id: string, updates: UpdateTrack): Promise<Track | null>;
  deleteTrack(id: string): Promise<boolean>;
  listTracks(filters?: TrackFilters): Promise<Track[]>;
  incrementTrackPlays(trackId: string): Promise<void>;
  incrementTrackLikes(trackId: string): Promise<void>;
  decrementTrackLikes(trackId: string): Promise<void>;
  incrementTrackDownloads(trackId: string): Promise<void>;

  // Likes
  createLike(userId: string, trackId: string): Promise<Like>;
  deleteLike(userId: string, trackId: string): Promise<boolean>;
  getLikesByUser(userId: string): Promise<Like[]>;
  getLikesByTrack(trackId: string): Promise<Like[]>;
  hasUserLikedTrack(userId: string, trackId: string): Promise<boolean>;

  // Downloads
  createDownload(download: Omit<Download, "id" | "createdAt">): Promise<Download>;
  getDownloadsByTrack(trackId: string): Promise<Download[]>;
  getDownloadsByUser(userId: string): Promise<Download[]>;

  // Plays
  createPlay(play: Omit<Play, "id" | "createdAt">): Promise<Play>;
  getPlaysByTrack(trackId: string): Promise<Play[]>;
  getPlaysByUser(userId: string): Promise<Play[]>;

  // Follows
  createFollow(followerId: string, followingId: string): Promise<Follow>;
  deleteFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<Follow[]>;
  getFollowing(userId: string): Promise<Follow[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Stats
  getUserStats(userId: string): Promise<UserStats>;
  getTrackStats(trackId: string): Promise<TrackStats>;
  updateUserStats(userId: string): Promise<UserStats>;
  updateTrackStats(trackId: string): Promise<TrackStats>;

  // Search
  search(query: string, filters?: SearchFilters): Promise<SearchResults>;
  rebuildSearchIndex(): Promise<void>;

  // Artists (users with tracks)
  getArtists(): Promise<User[]>;
}

export interface TrackFilters {
  userId?: string;
  genre?: string;
  mood?: string;
  tags?: string[];
  published?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "plays" | "likes" | "downloads";
  sortOrder?: "asc" | "desc";
}

export interface SearchFilters {
  type?: "tracks" | "users" | "all";
  limit?: number;
}

export interface SearchResults {
  tracks: Track[];
  users: User[];
}

// ============================================================================
// JSON DATABASE IMPLEMENTATION
// ============================================================================

export class JsonDatabase implements IJsonDatabase {
  constructor() {
    this.ensureDbDirectory();
    this.initializeDbFiles();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private ensureDbDirectory(): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private initializeDbFiles(): void {
    Object.values(DB_FILES).forEach((filePath) => {
      if (!fs.existsSync(filePath)) {
        const initialData = filePath.includes("search-index")
          ? { tracks: [], users: [] }
          : [];
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
      }
    });
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  private readFile<T>(filePath: string): T {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return (filePath.includes("search-index") ? { tracks: [], users: [] } : []) as T;
    }
  }

  private writeFile<T>(filePath: string, data: T): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // USERS
  // ============================================================================

  async createUser(createUser: CreateUser): Promise<User> {
    const users = this.readFile<User[]>(DB_FILES.users);

    const user: User = {
      ...createUser,
      id: randomUUID(),
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(user);
    this.writeFile(DB_FILES.users, users);

    // Initialize user stats
    await this.updateUserStats(user.id);

    return user;
  }

  async getUser(id: string): Promise<User | null> {
    const users = this.readFile<User[]>(DB_FILES.users);
    return users.find((u) => u.id === id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = this.readFile<User[]>(DB_FILES.users);
    return users.find((u) => u.username === username) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.readFile<User[]>(DB_FILES.users);
    return users.find((u) => u.email === email) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const users = this.readFile<User[]>(DB_FILES.users);
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    this.writeFile(DB_FILES.users, users);
    return users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = this.readFile<User[]>(DB_FILES.users);
    const filtered = users.filter((u) => u.id !== id);

    if (filtered.length === users.length) return false;

    this.writeFile(DB_FILES.users, filtered);
    return true;
  }

  async listUsers(limit = 50, offset = 0): Promise<User[]> {
    const users = this.readFile<User[]>(DB_FILES.users);
    return users.slice(offset, offset + limit);
  }

  // ============================================================================
  // TRACKS
  // ============================================================================

  async createTrack(createTrack: CreateTrack): Promise<Track> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);

    const track: Track = {
      ...createTrack,
      id: randomUUID(),
      plays: 0,
      likes: 0,
      downloads: 0,
      shares: 0,
      publishedAt: createTrack.published ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tracks.push(track);
    this.writeFile(DB_FILES.tracks, tracks);

    // Update user stats
    await this.updateUserStats(track.userId);

    // Rebuild search index
    await this.rebuildSearchIndex();

    return track;
  }

  async getTrack(id: string): Promise<Track | null> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    return tracks.find((t) => t.id === id) || null;
  }

  async getTracksByUser(userId: string): Promise<Track[]> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    return tracks.filter((t) => t.userId === userId);
  }

  async updateTrack(id: string, updates: UpdateTrack): Promise<Track | null> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const index = tracks.findIndex((t) => t.id === id);

    if (index === -1) return null;

    const wasPublished = tracks[index].published;
    const nowPublished = updates.published ?? wasPublished;

    tracks[index] = {
      ...tracks[index],
      ...updates,
      id, // Ensure ID doesn't change
      publishedAt: nowPublished && !wasPublished ? new Date().toISOString() : tracks[index].publishedAt,
      updatedAt: new Date().toISOString(),
    };

    this.writeFile(DB_FILES.tracks, tracks);
    await this.rebuildSearchIndex();

    return tracks[index];
  }

  async deleteTrack(id: string): Promise<boolean> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const filtered = tracks.filter((t) => t.id !== id);

    if (filtered.length === tracks.length) return false;

    this.writeFile(DB_FILES.tracks, filtered);
    await this.rebuildSearchIndex();

    return true;
  }

  async listTracks(filters: TrackFilters = {}): Promise<Track[]> {
    let tracks = this.readFile<Track[]>(DB_FILES.tracks);

    // Apply filters
    if (filters.userId) {
      tracks = tracks.filter((t) => t.userId === filters.userId);
    }
    if (filters.genre) {
      tracks = tracks.filter((t) => t.genre.toLowerCase() === filters.genre!.toLowerCase());
    }
    if (filters.mood) {
      tracks = tracks.filter((t) => t.mood?.toLowerCase() === filters.mood!.toLowerCase());
    }
    if (filters.tags && filters.tags.length > 0) {
      tracks = tracks.filter((t) =>
        filters.tags!.some((tag) => t.tags.includes(tag))
      );
    }
    if (filters.published !== undefined) {
      tracks = tracks.filter((t) => t.published === filters.published);
    }

    // Sort
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder || "desc";

    tracks.sort((a, b) => {
      const aVal = a[sortBy] as number | string;
      const bVal = b[sortBy] as number | string;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    return tracks.slice(offset, offset + limit);
  }

  async incrementTrackPlays(trackId: string): Promise<void> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      tracks[index].plays += 1;
      tracks[index].updatedAt = new Date().toISOString();
      this.writeFile(DB_FILES.tracks, tracks);
    }
  }

  async incrementTrackLikes(trackId: string): Promise<void> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      tracks[index].likes += 1;
      tracks[index].updatedAt = new Date().toISOString();
      this.writeFile(DB_FILES.tracks, tracks);
    }
  }

  async decrementTrackLikes(trackId: string): Promise<void> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      tracks[index].likes = Math.max(0, tracks[index].likes - 1);
      tracks[index].updatedAt = new Date().toISOString();
      this.writeFile(DB_FILES.tracks, tracks);
    }
  }

  async incrementTrackDownloads(trackId: string): Promise<void> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      tracks[index].downloads += 1;
      tracks[index].updatedAt = new Date().toISOString();
      this.writeFile(DB_FILES.tracks, tracks);
    }
  }

  // ============================================================================
  // LIKES
  // ============================================================================

  async createLike(userId: string, trackId: string): Promise<Like> {
    const likes = this.readFile<Like[]>(DB_FILES.likes);

    // Check if already liked
    const existing = likes.find((l) => l.userId === userId && l.trackId === trackId);
    if (existing) return existing;

    const like: Like = {
      id: randomUUID(),
      userId,
      trackId,
      createdAt: new Date().toISOString(),
    };

    likes.push(like);
    this.writeFile(DB_FILES.likes, likes);

    // Increment track likes
    await this.incrementTrackLikes(trackId);

    return like;
  }

  async deleteLike(userId: string, trackId: string): Promise<boolean> {
    const likes = this.readFile<Like[]>(DB_FILES.likes);
    const filtered = likes.filter((l) => !(l.userId === userId && l.trackId === trackId));

    if (filtered.length === likes.length) return false;

    this.writeFile(DB_FILES.likes, filtered);

    // Decrement track likes
    await this.decrementTrackLikes(trackId);

    return true;
  }

  async getLikesByUser(userId: string): Promise<Like[]> {
    const likes = this.readFile<Like[]>(DB_FILES.likes);
    return likes.filter((l) => l.userId === userId);
  }

  async getLikesByTrack(trackId: string): Promise<Like[]> {
    const likes = this.readFile<Like[]>(DB_FILES.likes);
    return likes.filter((l) => l.trackId === trackId);
  }

  async hasUserLikedTrack(userId: string, trackId: string): Promise<boolean> {
    const likes = this.readFile<Like[]>(DB_FILES.likes);
    return likes.some((l) => l.userId === userId && l.trackId === trackId);
  }

  // ============================================================================
  // DOWNLOADS
  // ============================================================================

  async createDownload(download: Omit<Download, "id" | "createdAt">): Promise<Download> {
    const downloads = this.readFile<Download[]>(DB_FILES.downloads);

    const newDownload: Download = {
      ...download,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    downloads.push(newDownload);
    this.writeFile(DB_FILES.downloads, downloads);

    // Increment track downloads
    await this.incrementTrackDownloads(download.trackId);

    return newDownload;
  }

  async getDownloadsByTrack(trackId: string): Promise<Download[]> {
    const downloads = this.readFile<Download[]>(DB_FILES.downloads);
    return downloads.filter((d) => d.trackId === trackId);
  }

  async getDownloadsByUser(userId: string): Promise<Download[]> {
    const downloads = this.readFile<Download[]>(DB_FILES.downloads);
    return downloads.filter((d) => d.userId === userId);
  }

  // ============================================================================
  // PLAYS
  // ============================================================================

  async createPlay(play: Omit<Play, "id" | "createdAt">): Promise<Play> {
    const plays = this.readFile<Play[]>(DB_FILES.plays);

    const newPlay: Play = {
      ...play,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    plays.push(newPlay);
    this.writeFile(DB_FILES.plays, plays);

    // Increment track plays
    await this.incrementTrackPlays(play.trackId);

    // Update track stats
    await this.updateTrackStats(play.trackId);

    return newPlay;
  }

  async getPlaysByTrack(trackId: string): Promise<Play[]> {
    const plays = this.readFile<Play[]>(DB_FILES.plays);
    return plays.filter((p) => p.trackId === trackId);
  }

  async getPlaysByUser(userId: string): Promise<Play[]> {
    const plays = this.readFile<Play[]>(DB_FILES.plays);
    return plays.filter((p) => p.userId === userId);
  }

  // ============================================================================
  // FOLLOWS
  // ============================================================================

  async createFollow(followerId: string, followingId: string): Promise<Follow> {
    const follows = this.readFile<Follow[]>(DB_FILES.follows);

    // Check if already following
    const existing = follows.find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (existing) return existing;

    const follow: Follow = {
      id: randomUUID(),
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    };

    follows.push(follow);
    this.writeFile(DB_FILES.follows, follows);

    // Update user stats
    await this.updateUserStats(followerId);
    await this.updateUserStats(followingId);

    return follow;
  }

  async deleteFollow(followerId: string, followingId: string): Promise<boolean> {
    const follows = this.readFile<Follow[]>(DB_FILES.follows);
    const filtered = follows.filter(
      (f) => !(f.followerId === followerId && f.followingId === followingId)
    );

    if (filtered.length === follows.length) return false;

    this.writeFile(DB_FILES.follows, filtered);

    // Update user stats
    await this.updateUserStats(followerId);
    await this.updateUserStats(followingId);

    return true;
  }

  async getFollowers(userId: string): Promise<Follow[]> {
    const follows = this.readFile<Follow[]>(DB_FILES.follows);
    return follows.filter((f) => f.followingId === userId);
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    const follows = this.readFile<Follow[]>(DB_FILES.follows);
    return follows.filter((f) => f.followerId === userId);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follows = this.readFile<Follow[]>(DB_FILES.follows);
    return follows.some((f) => f.followerId === followerId && f.followingId === followingId);
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getUserStats(userId: string): Promise<UserStats> {
    const allStats = this.readFile<UserStats[]>(DB_FILES.userStats);
    const existing = allStats.find((s) => s.userId === userId);

    if (existing) return existing;

    return this.updateUserStats(userId);
  }

  async getTrackStats(trackId: string): Promise<TrackStats> {
    const allStats = this.readFile<TrackStats[]>(DB_FILES.trackStats);
    const existing = allStats.find((s) => s.trackId === trackId);

    if (existing) return existing;

    return this.updateTrackStats(trackId);
  }

  async updateUserStats(userId: string): Promise<UserStats> {
    const allStats = this.readFile<UserStats[]>(DB_FILES.userStats);
    const tracks = await this.getTracksByUser(userId);
    const followers = await this.getFollowers(userId);
    const following = await this.getFollowing(userId);

    const totalPlays = tracks.reduce((sum, t) => sum + t.plays, 0);
    const totalLikes = tracks.reduce((sum, t) => sum + t.likes, 0);
    const totalDownloads = tracks.reduce((sum, t) => sum + t.downloads, 0);

    // Calculate monthly listeners (unique users in last 30 days)
    const plays = this.readFile<Play[]>(DB_FILES.plays);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPlays = plays.filter((p) => {
      const trackBelongsToUser = tracks.some((t) => t.id === p.trackId);
      const isRecent = new Date(p.createdAt) >= thirtyDaysAgo;
      return trackBelongsToUser && isRecent;
    });

    const uniqueListeners = new Set(recentPlays.map((p) => p.userId).filter(Boolean));

    const stats: UserStats = {
      userId,
      totalTracks: tracks.length,
      totalPlays,
      totalLikes,
      totalDownloads,
      totalFollowers: followers.length,
      totalFollowing: following.length,
      monthlyListeners: uniqueListeners.size,
      updatedAt: new Date().toISOString(),
    };

    const index = allStats.findIndex((s: any) => s.userId === userId);
    if (index >= 0) {
      allStats[index] = stats;
    } else {
      allStats.push(stats);
    }

    this.writeFile(DB_FILES.userStats, allStats);
    return stats;
  }

  async updateTrackStats(trackId: string): Promise<TrackStats> {
    const allStats = this.readFile<TrackStats[]>(DB_FILES.trackStats);
    const plays = await this.getPlaysByTrack(trackId);

    // Daily plays
    const dailyPlays: Record<string, number> = {};
    plays.forEach((p: any) => {
      const date = new Date(p.createdAt).toISOString().split("T")[0];
      dailyPlays[date] = (dailyPlays[date] || 0) + 1;
    });

    // Unique listeners
    const uniqueListeners = new Set(plays.map((p: any) => p.userId).filter(Boolean));

    // Average listen duration
    const totalDuration = plays.reduce((sum: number, p: any) => sum + p.duration, 0);
    const avgListenDuration = plays.length > 0 ? totalDuration / plays.length : 0;

    // Completion rate
    const completedPlays = plays.filter((p: any) => p.completed).length;
    const completionRate = plays.length > 0 ? (completedPlays / plays.length) * 100 : 0;

    const stats: TrackStats = {
      trackId,
      dailyPlays,
      totalUniqueListeners: uniqueListeners.size,
      avgListenDuration,
      completionRate,
      updatedAt: new Date().toISOString(),
    };

    const index = allStats.findIndex((s: any) => s.trackId === trackId);
    if (index >= 0) {
      allStats[index] = stats;
    } else {
      allStats.push(stats);
    }

    this.writeFile(DB_FILES.trackStats, allStats);
    return stats;
  }

  // ============================================================================
  // SEARCH
  // ============================================================================

  async search(query: string, filters: SearchFilters = {}): Promise<SearchResults> {
    const searchIndex = this.readFile<SearchIndex>(DB_FILES.searchIndex);
    const q = query.toLowerCase().trim();

    const results: SearchResults = {
      tracks: [],
      users: [],
    };

    if (!q) return results;

    const limit = filters.limit || 20;

    // Search tracks
    if (!filters.type || filters.type === "tracks" || filters.type === "all") {
      results.tracks = searchIndex.tracks
        .filter((t: any) => {
          const searchText = `${t.title} ${t.artist} ${t.genre} ${t.mood} ${t.tags.join(" ")}`.toLowerCase();
          return searchText.includes(q);
        })
        .slice(0, limit)
        .map((indexItem: any) => {
          const tracks = this.readFile<Track[]>(DB_FILES.tracks);
          return tracks.find((t) => t.id === indexItem.id)!;
        })
        .filter(Boolean);
    }

    // Search users
    if (!filters.type || filters.type === "users" || filters.type === "all") {
      results.users = searchIndex.users
        .filter((u: any) => {
          const searchText = `${u.username} ${u.displayName || ""} ${u.bio || ""}`.toLowerCase();
          return searchText.includes(q);
        })
        .slice(0, limit)
        .map((indexItem: any) => {
          const users = this.readFile<User[]>(DB_FILES.users);
          return users.find((u) => u.id === indexItem.id)!;
        })
        .filter(Boolean);
    }

    return results;
  }

  async rebuildSearchIndex(): Promise<void> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const users = this.readFile<User[]>(DB_FILES.users);

    const searchIndex: SearchIndex = {
      tracks: tracks
        .filter((t) => t.published)
        .map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          artistSlug: t.artistSlug,
          genre: t.genre,
          mood: t.mood || "",
          tags: t.tags,
          plays: t.plays,
          likes: t.likes,
          publishedAt: t.publishedAt,
        })),
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        verified: u.verified,
      })),
    };

    this.writeFile(DB_FILES.searchIndex, searchIndex);
  }

  async getArtists(): Promise<User[]> {
    const tracks = this.readFile<Track[]>(DB_FILES.tracks);
    const userIds = Array.from(new Set(tracks.map((t: Track) => t.userId)));
    const users = this.readFile<User[]>(DB_FILES.users);
    return users.filter((u: User) => userIds.includes(u.id));
  }
}

export const jsonDb = new JsonDatabase();