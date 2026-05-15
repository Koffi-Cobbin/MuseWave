import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_url?: string;
  is_active?: boolean;
  /** camelCase variant after toCamelCaseObject transform */
  isActive?: boolean;
}

const FALLBACK_GENRES = [
  "Afrobeats", "Indie", "Lo-fi", "Pop", "Hip-Hop",
  "R&B", "Electronic", "Folk", "Jazz", "Classical",
  "Rock", "Alternative", "Ambient", "Dancehall",
];

export function useGenres(): { genres: string[]; loading: boolean } {
  const [genres, setGenres] = useState<string[]>(FALLBACK_GENRES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequestJson<Genre[]>("GET", API_ENDPOINTS.genres.list)
      .then((data) => {
        if (cancelled) return;
        const names = data
          // apiRequestJson converts snake_case → camelCase, so check both.
          .filter((g) => g.isActive ?? g.is_active)
          .map((g) => g.name);
        if (names.length > 0) setGenres(names);
      })
      .catch(() => {
        // silently keep fallback list
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { genres, loading };
}
