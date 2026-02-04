import type { Express } from "express";
import { type Server } from "http";
import { jsonDb } from "./storage";
import { z } from "zod";
import {
  createUserSchema,
  createTrackSchema,
  updateTrackSchema,
  createAlbumSchema,
} from "@shared/schema";

// Helper function to handle async route errors
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============================================================================
  // USERS
  // ============================================================================

  // Get user by ID
  app.get(
    "/api/users/:id",
    asyncHandler(async (req: any, res: any) => {
      const user = await jsonDb.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    })
  );

  // Get user by username
  app.get(
    "/api/users/username/:username",
    asyncHandler(async (req: any, res: any) => {
      const user = await jsonDb.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    })
  );

  // Create user
  app.post(
    "/api/users",
    asyncHandler(async (req: any, res: any) => {
      try {
        const userData = createUserSchema.parse(req.body);

        const existingUsername = await jsonDb.getUserByUsername(userData.username);
        if (existingUsername) {
          return res.status(400).json({ error: "Username already taken" });
        }

        const existingEmail = await jsonDb.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already registered" });
        }

        const user = await jsonDb.createUser(userData);
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        throw error;
      }
    })
  );

  // Update user
  app.patch(
    "/api/users/:id",
    asyncHandler(async (req: any, res: any) => {
      const user = await jsonDb.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    })
  );

  // Get user stats
  app.get(
    "/api/users/:id/stats",
    asyncHandler(async (req: any, res: any) => {
      const stats = await jsonDb.getUserStats(req.params.id);
      res.json(stats);
    })
  );

  // List users
  app.get(
    "/api/users",
    asyncHandler(async (req: any, res: any) => {
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset) : undefined;
      const users = await jsonDb.listUsers(limit, offset);
      const safeUsers = users.map(({ password, ...u }) => u);
      res.json(safeUsers);
    })
  );

  // ============================================================================
  // TRACKS
  // ============================================================================

  // List tracks with filters
  app.get(
    "/api/tracks",
    asyncHandler(async (req: any, res: any) => {
      const filters = {
        userId: req.query.userId as string | undefined,
        genre: req.query.genre as string | undefined,
        mood: req.query.mood as string | undefined,
        tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
        published: req.query.published === "true" ? true : req.query.published === "false" ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
      };

      const tracks = await jsonDb.listTracks(filters);
      res.json(tracks);
    })
  );

  // Get track by ID
  app.get(
    "/api/tracks/:id",
    asyncHandler(async (req: any, res: any) => {
      const track = await jsonDb.getTrack(req.params.id);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }
      res.json(track);
    })
  );

  // Create track
  app.post(
    "/api/tracks",
    asyncHandler(async (req: any, res: any) => {
      try {
        const trackData = createTrackSchema.parse(req.body);
        const track = await jsonDb.createTrack(trackData);
        res.status(201).json(track);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        throw error;
      }
    })
  );

  // Update track
  app.patch(
    "/api/tracks/:id",
    asyncHandler(async (req: any, res: any) => {
      try {
        const updates = updateTrackSchema.parse(req.body);
        const track = await jsonDb.updateTrack(req.params.id, updates);
        if (!track) {
          return res.status(404).json({ error: "Track not found" });
        }
        res.json(track);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        throw error;
      }
    })
  );

  // Delete track
  app.delete(
    "/api/tracks/:id",
    asyncHandler(async (req: any, res: any) => {
      const deleted = await jsonDb.deleteTrack(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Track not found" });
      }
      res.json({ success: true });
    })
  );

  // Get track stats
  app.get(
    "/api/tracks/:id/stats",
    asyncHandler(async (req: any, res: any) => {
      const stats = await jsonDb.getTrackStats(req.params.id);
      res.json(stats);
    })
  );

  // ============================================================================
  // LIKES
  // ============================================================================

  app.post("/api/tracks/:trackId/like", asyncHandler(async (req: any, res: any) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const like = await jsonDb.createLike(userId, req.params.trackId);
    res.status(201).json(like);
  }));

  app.delete("/api/tracks/:trackId/like", asyncHandler(async (req: any, res: any) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const deleted = await jsonDb.deleteLike(userId, req.params.trackId);
    if (!deleted) return res.status(404).json({ error: "Like not found" });
    res.json({ success: true });
  }));

  app.get("/api/tracks/:trackId/like/:userId", asyncHandler(async (req: any, res: any) => {
    const hasLiked = await jsonDb.hasUserLikedTrack(req.params.userId, req.params.trackId);
    res.json({ hasLiked });
  }));

  app.get("/api/users/:userId/likes", asyncHandler(async (req: any, res: any) => {
    const likes = await jsonDb.getLikesByUser(req.params.userId);
    res.json(likes);
  }));

  // ============================================================================
  // DOWNLOADS
  // ============================================================================

  app.post("/api/tracks/:trackId/download", asyncHandler(async (req: any, res: any) => {
    const download = await jsonDb.createDownload({
      userId: req.body.userId,
      trackId: req.params.trackId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(201).json(download);
  }));

  app.get("/api/tracks/:trackId/downloads", asyncHandler(async (req: any, res: any) => {
    const downloads = await jsonDb.getDownloadsByTrack(req.params.trackId);
    res.json(downloads);
  }));

  // ============================================================================
  // PLAYS
  // ============================================================================

  app.post("/api/tracks/:trackId/play", asyncHandler(async (req: any, res: any) => {
    const play = await jsonDb.createPlay({
      userId: req.body.userId,
      trackId: req.params.trackId,
      duration: req.body.duration || 0,
      completed: req.body.completed || false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(201).json(play);
  }));

  app.get("/api/tracks/:trackId/plays", asyncHandler(async (req: any, res: any) => {
    const plays = await jsonDb.getPlaysByTrack(req.params.trackId);
    res.json(plays);
  }));

  app.get("/api/users/:userId/plays", asyncHandler(async (req: any, res: any) => {
    const plays = await jsonDb.getPlaysByUser(req.params.userId);
    res.json(plays);
  }));

  // ============================================================================
  // FOLLOWS
  // ============================================================================

  app.post("/api/users/:userId/follow", asyncHandler(async (req: any, res: any) => {
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: "followerId is required" });
    const follow = await jsonDb.createFollow(followerId, req.params.userId);
    res.status(201).json(follow);
  }));

  app.delete("/api/users/:userId/follow", asyncHandler(async (req: any, res: any) => {
    const { followerId } = req.body;
    if (!followerId) return res.status(400).json({ error: "followerId is required" });
    const deleted = await jsonDb.deleteFollow(followerId, req.params.userId);
    if (!deleted) return res.status(404).json({ error: "Follow not found" });
    res.json({ success: true });
  }));

  app.get("/api/users/:userId/follow/:followerId", asyncHandler(async (req: any, res: any) => {
    const isFollowing = await jsonDb.isFollowing(req.params.followerId, req.params.userId);
    res.json({ isFollowing });
  }));

  app.get("/api/users/:userId/followers", asyncHandler(async (req: any, res: any) => {
    const followers = await jsonDb.getFollowers(req.params.userId);
    res.json(followers);
  }));

  app.get("/api/users/:userId/following", asyncHandler(async (req: any, res: any) => {
    const following = await jsonDb.getFollowing(req.params.userId);
    res.json(following);
  }));

  // ============================================================================
  // SEARCH
  // ============================================================================

  app.get("/api/search", asyncHandler(async (req: any, res: any) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const filters = {
      type: req.query.type as "tracks" | "users" | "all" | undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const results = await jsonDb.search(query, filters);
    res.json(results);
  }));

  app.post("/api/search/rebuild", asyncHandler(async (req: any, res: any) => {
    await jsonDb.rebuildSearchIndex();
    res.json({ success: true });
  }));

  // Get artists (users with tracks)
  app.get(
    "/api/artists",
    asyncHandler(async (req: any, res: any) => {
      const artists = await jsonDb.getArtists();
      const safeArtists = artists.map(({ password, ...u }) => u);
      res.json(safeArtists);
    })
  );

  return httpServer;
}