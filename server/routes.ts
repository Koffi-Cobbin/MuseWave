import type { Express } from "express";
import { type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  _app: Express
): Promise<Server> {
  // All API routes are handled by the Django backend at the URL configured in
  // client/src/lib/apiConfig.ts. The local Express server only serves the
  // Vite-built frontend assets — no local database or API routes are needed.
  return httpServer;
}