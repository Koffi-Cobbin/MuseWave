/**
 * useOfflineAudio — resolves an <audio> src to a blob URL when the track
 * is stored offline, falling back to the original network URL.
 *
 * Drop-in replacement for directly passing `track.audioUrl`:
 *
 * ```tsx
 * const audioSrc = useOfflineAudio(active);
 * <audio ref={audioRef} src={audioSrc} preload="metadata" />
 * ```
 *
 * ## Stale-blob guard
 *
 * The blob state is stored as `{ trackId, url }`. When the active track
 * changes, the previous render still holds the old `blobState` until the
 * next state update. By comparing `blobState.trackId` against the current
 * `track?.id` at render time, we ensure a blob URL from track B is NEVER
 * returned while track A is active — even during the brief window before
 * the async lookup for A completes and the state is reset.
 *
 * Without this guard the offline-blob swap effect in PlayerBar would see a
 * (now-revoked) "blob:…" src and overwrite audio.src with it, causing a
 * media error and silently killing playback of the new track.
 */

import { useState, useEffect, useRef } from "react";
import type { Track } from "@shared/schema";
import { getTrackBlob } from "@/lib/offlineStorage";

interface BlobState {
  trackId: string;
  url: string;
}

export function useOfflineAudio(track: Track | null): string | undefined {
  const [blobState, setBlobState] = useState<BlobState | undefined>();
  const currentBlobUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Revoke the previous blob URL and clear state before starting a new lookup
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = undefined;
    }
    setBlobState(undefined);

    if (!track) {
      return;
    }

    let cancelled = false;

    getTrackBlob(track.id).then((blob) => {
      if (cancelled) return;

      if (blob) {
        const url = URL.createObjectURL(blob);
        currentBlobUrl.current = url;
        setBlobState({ trackId: track.id, url });
      }
    });

    return () => {
      cancelled = true;
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = undefined;
      }
    };
  }, [track?.id]);

  // Only use the blob URL if it belongs to the current track.
  // If `blobState` is stale (left over from the previous track before the
  // async lookup resets it), treat it as absent and fall back to the network URL.
  const blobUrl =
    blobState && blobState.trackId === track?.id ? blobState.url : undefined;

  return blobUrl ?? track?.audioUrl;
}
