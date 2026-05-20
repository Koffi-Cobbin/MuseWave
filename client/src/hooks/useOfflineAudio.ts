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
 */

import { useState, useEffect, useRef } from "react";
import type { Track } from "@shared/schema";
import { getTrackBlob } from "@/lib/offlineStorage";

export function useOfflineAudio(track: Track | null): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>();
  const currentBlobUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Revoke the previous blob URL before setting up a new one
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = undefined;
    }

    if (!track) {
      setBlobUrl(undefined);
      return;
    }

    let cancelled = false;

    getTrackBlob(track.id).then((blob) => {
      if (cancelled) return;

      if (blob) {
        const url = URL.createObjectURL(blob);
        currentBlobUrl.current = url;
        setBlobUrl(url);
      } else {
        setBlobUrl(undefined);
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

  // Blob URL when offline, otherwise fall back to the original network URL
  return blobUrl ?? track?.audioUrl;
}
