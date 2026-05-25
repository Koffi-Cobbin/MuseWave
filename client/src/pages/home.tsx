import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Compass,
  Flame,
  Music2,
  Search,
  UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { TrackCard } from "@/components/TrackCard";
import { NewReleasesCarousel } from "@/components/NewReleasesCarousel";
import {
  FeaturedSection,
  type FeaturedTrackItem,
} from "@/components/FeaturedSection";
import { Logo } from "@/components/SidebarNav";
import type { Track } from "../../../shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtistRowData = {
  slug: string;
  name: string;
  tagline: string;
  followers: number;
  monthlyListeners: number;
  accent: string;
  avatarUrl?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function secondsToTime(duration: number) {
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${`${sec}`.padStart(2, "0")}`;
}

// ─── Artist Row ───────────────────────────────────────────────────────────────

function ArtistRow({ artist }: { artist: ArtistRowData }) {
  return (
    <Link
      href={`/artist/${artist.slug}`}
      className="group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-transparent p-3 transition hover:border-white/10 hover:bg-white/4"
      data-testid={`link-artist-${artist.slug}`}
    >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10",
            !artist.avatarUrl && "bg-gradient-to-br",
            artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
          )}
        >
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt={`${artist.name} profile`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold">{(artist.name || artist.slug).charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-sm font-semibold" data-testid={`text-artist-name-${artist.slug}`}>
            {artist.name || artist.slug}
          </div>
          <div className="truncate text-xs text-muted-foreground" data-testid={`text-artist-tagline-${artist.slug}`}>
            {artist.tagline || "Indie artist"}
          </div>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <div className="text-xs tabular-nums text-muted-foreground font-medium" data-testid={`text-artist-followers-${artist.slug}`}>
            {formatCount(artist.followers || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground/60 leading-none">{artist.followers === 1 ? "follower" : "followers"}</div>
        </div>
    </Link>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

const HOME_TRACK_LIMIT = 4;

export default function Home() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<ArtistRowData[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedTrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // All tracks sorted by publish date (descending), shared by New Releases and Latest Tracks
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      const dateA = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  }, [tracks]);

  const newReleases = useMemo(() => sortedTracks.slice(0, 8), [sortedTracks]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [tracksData, trendingArtists, featuredData] = await Promise.all([
          apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, { published: true }),
          apiRequestJson<any[]>("GET", API_ENDPOINTS.artists.trending).catch(() => []),
          apiRequestJson<any[]>("GET", API_ENDPOINTS.featured.list).catch(() => []),
        ]);
        if (mounted) {
          setTracks(Array.isArray(tracksData) ? tracksData : []);

          const raw = Array.isArray(trendingArtists) ? trendingArtists : [];
          const normalized: ArtistRowData[] = raw.map((a) => ({
            slug: a.username ?? "",
            name: a.displayName ?? a.display_name ?? a.username ?? "",
            tagline: a.bio ?? "",
            followers: a.totalFollowers ?? a.total_followers ?? 0,
            monthlyListeners: 0,
            accent: "",
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? undefined,
          }));
          setArtists(normalized);

          // Normalize featured track entries
          const rawFeatured = Array.isArray(featuredData) ? featuredData : [];
          const normalizedFeatured: FeaturedTrackItem[] = rawFeatured
            .filter((entry: any) => entry.track)
            .map((entry: any) => ({
              track: entry.track as Track,
              label: entry.label ?? undefined,
            }));
          setFeaturedItems(normalizedFeatured);
        }
      } catch {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    // When searching, search ALL tracks; otherwise skip the 8 shown in New Releases
    const source = q ? sortedTracks : sortedTracks.slice(8);
    if (!q) return source;
    return source.filter((t) =>
      `${t.title} ${t.artist} ${t.genre ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, sortedTracks]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => `${a.name} ${a.tagline}`.toLowerCase().includes(q));
  }, [query, artists]);

  const previewTracks = filteredTracks.slice(0, HOME_TRACK_LIMIT);
  const hasMore = filteredTracks.length > HOME_TRACK_LIMIT;

  const handlePlay = (t: Track) => {
    if (active?.id === t.id) {
      setIsPlaying(!isPlaying);
    } else {
      setAutoPlay(true);
      setActive(t);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">

      <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:py-8">
        <div className="grid gap-4 lg:gap-6">

          {/* ── Main Content ── */}
          <main className="min-w-0">

            {/* ── Mobile Top Bar ── */}
            <div className="mb-5 lg:hidden">
              <Logo />
            </div>

            {/* ── Search + Title ── */}
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1
                  className="text-balance text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl"
                  data-testid="text-title"
                >
                  No gatekeepers. Just music.
                </h1>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="text-subtitle">
                  Artists upload, listeners discover — that's the whole deal.
                </p>
              </div>
              <div className="relative w-full sm:w-56 lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tracks, artists…"
                  className="h-11 pl-9 text-sm"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* ── Featured Section (API) ── */}
            {!query && featuredItems.length > 0 && (
              <div className="mb-5 sm:mb-6">
                <FeaturedSection items={featuredItems} />
              </div>
            )}

            {/* ── New Releases Carousel ── */}
            {!query && newReleases.length > 0 && (
              <div className="mb-5 sm:mb-6">
                <NewReleasesCarousel tracks={newReleases} />
              </div>
            )}

            {/* ── Main Grid: Tracks + Trending ── */}
            <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-8">

              {/* Tracks */}
              <div className="min-w-0 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    <h2 className="text-base font-semibold sm:text-lg" data-testid="text-tracks-title">
                      {query ? "Matching Tracks" : "Latest Tracks"}
                    </h2>
                  </div>
                  {!query && (
                    <Link
                      href="/discover"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-see-all-tracks"
                    >
                      See all <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>

                <div className="grid gap-3">
                  {loading ? (
                    Array.from({ length: HOME_TRACK_LIMIT }).map((_, i) => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/5" />
                    ))
                  ) : previewTracks.length > 0 ? (
                    <>
                      {previewTracks.map((track, i) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          onPlay={handlePlay}
                          isActive={active?.id === track.id}
                          index={i}
                        />
                      ))}
                      {hasMore && (
                        <Link href={query ? `/discover?q=${encodeURIComponent(query)}` : "/discover"}>
                          <div
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-sm text-muted-foreground transition hover:border-white/25 hover:bg-white/5 hover:text-foreground"
                            data-testid="link-browse-all-tracks"
                          >
                            <Compass className="h-4 w-4 shrink-0" />
                            <span className="truncate">Browse all {query ? filteredTracks.length : sortedTracks.length} tracks on Discover</span>
                            <ArrowRight className="h-4 w-4 shrink-0" />
                          </div>
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      No tracks found matching your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Trending Artists */}
              <div className="min-w-0 lg:col-span-3">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 shrink-0 text-fuchsia-500" />
                  <h2 className="text-base font-semibold sm:text-lg" data-testid="text-trending-title">
                    {query ? "Matching Artists" : "Trending Artists"}
                  </h2>
                </div>
                <div className="glass glow noise overflow-hidden rounded-2xl border border-white/10 p-2">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/5 mb-2" />
                    ))
                  ) : filteredArtists.length > 0 ? (
                    filteredArtists.slice(0, 6).map((artist) => (
                      <ArtistRow key={artist.slug} artist={artist} />
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No artists found.</div>
                  )}
                </div>

                {!query && (
                  <Link href="/upload">
                    <div
                      className="mt-4 flex min-w-0 overflow-hidden cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/5 p-4 transition hover:border-emerald-400/35 hover:bg-emerald-400/8"
                      data-testid="link-upload-cta"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15">
                        <UploadCloud className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="truncate text-sm font-semibold text-emerald-400">Share your music</div>
                        <div className="truncate text-xs text-muted-foreground">Upload a track in minutes</div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            <div className="h-32 lg:h-24" aria-hidden="true" />
          </main>
        </div>
      </div>
    </div>
  );
}