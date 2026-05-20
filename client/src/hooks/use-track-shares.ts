import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TrackShare } from "@shared/schema";
import {
  listTrackShares,
  shareTrackWithUser,
  revokeTrackShare,
} from "@/lib/queryClient";

export function useTrackShares(trackId: string) {
  const { toast } = useToast();
  const [shares, setShares] = useState<TrackShare[]>([]);
  const [loading, setLoading] = useState(false);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTrackShares(trackId);
      setShares(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load shares";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }, [trackId, toast]);

  const addShare = useCallback(
    async (input: { username?: string; email?: string }) => {
      const share = await shareTrackWithUser(trackId, input);
      setShares((prev) => [...prev, share]);
      return share;
    },
    [trackId]
  );

  const removeShare = useCallback(
    async (shareId: string) => {
      await revokeTrackShare(trackId, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    },
    [trackId]
  );

  return { shares, loading, loadShares, addShare, removeShare };
}
