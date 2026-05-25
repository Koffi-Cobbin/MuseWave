import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Music2,
  Disc3,
  Headphones,
  Share2,
  Globe,
  Lock,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
  Clock,
  Heart,
  UploadCloud,
  Search,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useSharedTracks } from "@/hooks/use-shared-tracks";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import { TrackCard } from "@/components/TrackCard";
import { PaginationControls } from "@/components/PaginationControls";

import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Track, Album, User } from "../../../shared/schema";
import type { SharedTrack } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type PrimaryTab = "tracks" | "albums";
type TracksSubTab = "my" | "shared";

// ─── Constants ───────────────────────────────────────────────────────────────

const SHARED_PAGE_SIZE = 10;

const SHARED_SORT_OPTIONS = [
  { value: "sharedAt", label: "Recently Shared", icon: Clock },
  { value: "createdAt", label: "Latest", icon: TrendingUp },
  { value: "likes", label: "Most Liked", icon: Heart },
] as const;

type SharedSortBy = (typeof SHARED_SORT_OPTIONS)[number]["value"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

// ─── Pagination (for shared tracks) ──────────────────────────────────────────

function SimplePagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "\u2026")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "\u2026") {
      pages.push("\u2026");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 border-white/10 bg-white/5"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        data-testid="button-prev-page"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      {pages.map((p, i) =>
        p === "\u2026" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            {"\u2026"}
          </span>
        ) : (
          <Button
            key={p}
            variant="secondary"
            size="icon"
            className={cn(
              "h-8 w-8 text-xs border-white/10",
              p === page
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-white/5 hover:bg-white/10",
            )}
            onClick={() => onPage(p)}
            data-testid={`button-page-${p}`}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 border-white/10 bg-white/5"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        data-testid="button-next-page"
      >
        <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
      </Button>
    </div>
  );
}

// ─── My Track Row (like DashboardTrackRow) ───────────────────────────────────

function MyTrackRow({
  track,
  index,
  onPlay,
  onTrackUpdated,
  onTrackDeleted,
  isActive,
  togglingId,
  onToggleVisibility,
  isOwner,
}: {
  track: Track;
  index: number;
  onPlay: (t: Track) => void;
  onTrackUpdated: (t: Track) => void;
  onTrackDeleted: (id: string) => void;
  isActive: boolean;
  togglingId: string | null;
  onToggleVisibility: (track: Track) => void;
  isOwner?: boolean;
}) {
  const isPrivate = (track as any).visibility === "private";
  const isToggling = togglingId === track.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      className="group relative overflow-hidden"
    >
      <TrackCard
        track={track}
        onPlay={onPlay}
        isActive={isActive}
        index={index}
        isOwner={isOwner}
        onTrackDeleted={onTrackDeleted}
        onTrackUpdated={onTrackUpdated}
      />
      {/* Visibility icon only — no border/padding */}
      {isOwner && (
        <div
          className="absolute right-14 top-1/2 -translate-y-1/2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            onClick={() => onToggleVisibility(track)}
            title={isPrivate ? "Make public" : "Make private"}
            data-testid={`button-toggle-visibility-${track.id}`}
            className={cn(
              isToggling ? "cursor-not-allowed" : "cursor-pointer",
              isPrivate
                ? "text-muted-foreground/60 hover:text-amber-300"
                : "text-muted-foreground/60 hover:text-emerald-300",
            )}
          >
            {isToggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isPrivate ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function MyTracks() {
  const { user, isAuthenticated } = useAuth();
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { sharedTracks, loading: sharedTracksLoading, fetchSharedTracks } = useSharedTracks();
  const { toast } = useToast();

  // ── Primary tab: Tracks / Playlists ────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PrimaryTab>("tracks");

  // ── Sub-tab within Tracks: My Tracks / Shared with Me ──────────────────
  const [activeTracksTab, setActiveTracksTab] = useState<TracksSubTab>("my");

  // ── State: My Tracks (user's own tracks) ───────────────────────────────
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [myTracksLoading, setMyTracksLoading] = useState(true);
  const [myTracksRefreshing, setMyTracksRefreshing] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── State: Shared with Me ──────────────────────────────────────────────
  const [sharedSearch, setSharedSearch] = useState("");
  const [sharedSortBy, setSharedSortBy] = useState<SharedSortBy>("sharedAt");
  const [sharedShowFilters, setSharedShowFilters] = useState(false);
  const [sharedPage, setSharedPage] = useState(1);

  // ── State: Albums ──────────────────────────────────────────────────────
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumSearch, setAlbumSearch] = useState("");

  // ── My Tracks: sort config ─────────────────────────────────────────────
  const myTrackSortConfig = useMemo(() => [
    { value: "latest", label: "Latest", comparer: (a: Track, b: Track) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
    { value: "oldest", label: "Oldest", comparer: (a: Track, b: Track) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
    { value: "plays", label: "Most Played", comparer: (a: Track, b: Track) => (b.plays ?? 0) - (a.plays ?? 0) },
    { value: "likes", label: "Most Liked", comparer: (a: Track, b: Track) => (b.likes ?? 0) - (a.likes ?? 0) },
    { value: "az", label: "A → Z", comparer: (a: Track, b: Track) => a.title.localeCompare(b.title) },
    { value: "za", label: "Z → A", comparer: (a: Track, b: Track) => b.title.localeCompare(a.title) },
  ], []);

  const myTrackSearchFields: (keyof Track)[] = useMemo(() => ["title", "genre", "artist"], []);

  // ── Load my tracks ─────────────────────────────────────────────────────
  const loadMyTracks = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setMyTracksLoading(true);
    else setMyTracksRefreshing(true);
    try {
      const data = await apiRequestJson<Track[]>(
        "GET",
        API_ENDPOINTS.tracks.list,
        undefined,
        { userId: user.id },
      );
      setMyTracks(
        (Array.isArray(data) ? data : []).filter(
          (t) => t.userId === user.id || (t as any).user_id === user.id,
        ),
      );
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't load tracks",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setMyTracksLoading(false);
      setMyTracksRefreshing(false);
    }
  };

  // ── Initial loads ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) loadMyTracks();
  }, [user?.id]);

  useEffect(() => {
    fetchSharedTracks();
  }, [fetchSharedTracks]);

  // ── Load albums ────────────────────────────────────────────────────────
  const loadAlbums = useCallback(async () => {
    if (!user?.id) return;
    setAlbumsLoading(true);
    try {
      const albumsData = await apiRequestJson<Album[]>(
        "GET",
        API_ENDPOINTS.albums.byUser(user.id),
      );
      const enriched = await Promise.all(
        (Array.isArray(albumsData) ? albumsData : []).map(async (album) => {
          try {
            const detail = await apiRequestJson<Album>("GET", API_ENDPOINTS.albums.byId(album.id));
            return { ...album, ...detail };
          } catch {
            return album;
          }
        }),
      );
      setAlbums(enriched);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't load albums",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setAlbumsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) loadAlbums();
  }, [user?.id, loadAlbums]);

  // ── Artist View: resolve slug to user and fetch their tracks ────────────
  const artistSlug = new URLSearchParams(window.location.search).get("artist");
  const isArtistView = !!artistSlug && artistSlug.length > 0;

  const [viewingArtist, setViewingArtist] = useState<User | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [artistViewLoading, setArtistViewLoading] = useState(false);

  const [artistSearch, setArtistSearch] = useState("");
  const [artistAlbumSearch, setArtistAlbumSearch] = useState("");
  const [artistAlbumTab, setArtistAlbumTab] = useState<"tracks" | "albums">("tracks");
  const [artistSort, setArtistSort] = useState("latest");
  const [artistPage, setArtistPage] = useState(1);

  const ARTIST_PAGE_SIZE = 10;

  useEffect(() => {
    if (!isArtistView) return;
    let cancelled = false;

    (async () => {
      setArtistViewLoading(true);
      try {
        // Resolve slug to user data
        let userData: any;
        try {
          userData = await apiRequestJson("GET", API_ENDPOINTS.users.byUsername(artistSlug!));
        } catch {
          const searchResults = await apiRequestJson<any>(
            "GET", API_ENDPOINTS.search.query, undefined,
            { q: artistSlug!, type: "tracks", limit: 1 },
          ).catch(() => null);
          const trackResult = searchResults?.tracks?.[0];
          const resolvedId = trackResult?.userId ?? trackResult?.user_id;
          if (!resolvedId) throw new Error("Could not resolve artist slug");
          userData = await apiRequestJson("GET", API_ENDPOINTS.users.byId(resolvedId));
        }
        if (cancelled) return;
        setViewingArtist(userData);

        // Fetch their tracks
        const data = await apiRequestJson<Track[]>(
          "GET",
          API_ENDPOINTS.tracks.list,
          undefined,
          { userId: userData.id },
        );
        if (cancelled) return;
        const rawTracks = (Array.isArray(data) ? data : []).filter(
          (t) => t.userId === userData.id || (t as any).user_id === userData.id,
        );
        const isOwnerOfArtistView = userData.id === user?.id;
        setArtistTracks(
          isOwnerOfArtistView
            ? rawTracks
            : rawTracks.filter((t) => (t as any).visibility !== "private"),
        );

        // Fetch their albums (hide unpublished for non-owners)
        const albumsData = await apiRequestJson<Album[]>(
          "GET",
          API_ENDPOINTS.albums.byUser(userData.id),
        );
        if (cancelled) return;
        const enriched = await Promise.all(
          (Array.isArray(albumsData) ? albumsData : []).map(async (album) => {
            try {
              const detail = await apiRequestJson<Album>("GET", API_ENDPOINTS.albums.byId(album.id));
              return { ...album, ...detail };
            } catch {
              return album;
            }
          }),
        );
        setArtistAlbums(
          isOwnerOfArtistView
            ? enriched
            : enriched.filter((a) => a.published === true),
        );
      } catch (err) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Couldn't load artist tracks",
            description: err instanceof Error ? err.message : "Please try again.",
          });
        }
      } finally {
        if (!cancelled) setArtistViewLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [artistSlug]);

  // Artist tracks: filter/sort/paginate
  const filteredArtistTracks = useMemo(() => {
    if (!artistSearch) return artistTracks;
    const q = artistSearch.toLowerCase();
    return artistTracks.filter((t) =>
      ["title", "genre", "artist"].some((f) =>
        String((t as any)[f] ?? "").toLowerCase().includes(q),
      ),
    );
  }, [artistTracks, artistSearch]);

  const sortedArtistTracks = useMemo(() => {
    const arr = [...filteredArtistTracks];
    if (artistSort === "latest") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (artistSort === "oldest") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (artistSort === "plays") {
      arr.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
    } else if (artistSort === "likes") {
      arr.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    } else if (artistSort === "az") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else if (artistSort === "za") {
      arr.sort((a, b) => b.title.localeCompare(a.title));
    }
    return arr;
  }, [filteredArtistTracks, artistSort]);

  const artistTotalPages = Math.max(1, Math.ceil(sortedArtistTracks.length / ARTIST_PAGE_SIZE));
  const artistSafePage = Math.min(artistPage, artistTotalPages);
  const pagedArtistTracks = sortedArtistTracks.slice(
    (artistSafePage - 1) * ARTIST_PAGE_SIZE,
    artistSafePage * ARTIST_PAGE_SIZE,
  );

  // Artist albums: filter
  const filteredArtistAlbums = useMemo(() => {
    if (!artistAlbumSearch) return artistAlbums;
    const q = artistAlbumSearch.toLowerCase();
    return artistAlbums.filter((a) =>
      a.title.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q),
    );
  }, [artistAlbums, artistAlbumSearch]);

  useEffect(() => { setArtistPage(1); }, [artistSearch, artistSort]);

  // ── My Tracks: visibility filter + search/sort/paginate ────────────────
  const visibilityFiltered = useMemo(() => {
    if (visibilityFilter === "public")
      return myTracks.filter((t) => (t as any).visibility !== "private");
    if (visibilityFilter === "private")
      return myTracks.filter((t) => (t as any).visibility === "private");
    return myTracks;
  }, [myTracks, visibilityFilter]);

  const {
    search: mySearch,
    setSearch: setMySearch,
    sort: mySort,
    setSort: setMySort,
    page: myPage,
    setPage: setMyPage,
    filtered: myFiltered,
    paged: myPaged,
    totalPages: myTotalPages,
  } = useSearchFilter({
    data: visibilityFiltered,
    searchFields: myTrackSearchFields,
    defaultSort: "latest",
    sortConfig: myTrackSortConfig,
    itemsPerPage: 10,
  });

  // ── Shared with Me: filter/sort/paginate ───────────────────────────────
  const filterBySearch = <T extends Record<string, unknown>>(
    items: T[],
    fields: (keyof T)[],
  ): T[] => {
    if (!sharedSearch) return items;
    const q = sharedSearch.toLowerCase();
    return items.filter((item) =>
      fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)),
    );
  };

  const filteredSharedTracks = useMemo(
    () => filterBySearch(sharedTracks, [
      "title", "artist", "album", "sharedByUsername",
    ] as (keyof SharedTrack)[]),
    [sharedTracks, sharedSearch],
  );

  const sortedSharedTracks = useMemo(() => {
    const arr = [...filteredSharedTracks];
    if (sharedSortBy === "sharedAt") {
      arr.sort((a, b) =>
        new Date(b.sharedAt ?? 0).getTime() - new Date(a.sharedAt ?? 0).getTime(),
      );
    } else if (sharedSortBy === "createdAt") {
      arr.sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    } else if (sharedSortBy === "likes") {
      arr.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    }
    return arr;
  }, [filteredSharedTracks, sharedSortBy]);

  const sharedTotalPages = Math.max(1, Math.ceil(sortedSharedTracks.length / SHARED_PAGE_SIZE));
  const sharedSafePage = Math.min(sharedPage, sharedTotalPages);
  const pagedSharedTracks = sortedSharedTracks.slice(
    (sharedSafePage - 1) * SHARED_PAGE_SIZE,
    sharedSafePage * SHARED_PAGE_SIZE,
  );

  useEffect(() => { setSharedPage(1); }, [sharedSearch, sharedSortBy]);

  // ── Albums: filter ─────────────────────────────────────────────────────
  const filteredAlbums = useMemo(() => {
    if (!albumSearch) return albums;
    const q = albumSearch.toLowerCase();
    return albums.filter((a) =>
      a.title.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q),
    );
  }, [albums, albumSearch]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePlay = useCallback(
    (t: Track) => {
      if (active?.id === t.id) {
        setIsPlaying(!isPlaying);
      } else {
        setAutoPlay(true);
        setActive(t);
      }
    },
    [active, isPlaying, setActive, setAutoPlay, setIsPlaying],
  );

  const handleToggleVisibility = async (track: Track) => {
    const current = (track as any).visibility ?? "public";
    const next = current === "private" ? "public" : "private";
    setTogglingId(track.id);
    try {
      const accessToken = localStorage.getItem("accessToken") ?? "";
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.tracks.update(track.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `${res.status}`);
      }
      const updated = await res.json();
      setMyTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, ...(updated as Track), visibility: (updated.visibility ?? next) as any } : t,
        ),
      );
      toast({
        title: next === "private" ? "Track set to private" : "Track is now public",
        description: next === "private"
          ? "Only you and people you share with can access it."
          : "Everyone can discover this track.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't update visibility",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleTrackDeleted = (id: string) =>
    setMyTracks((prev) => prev.filter((t) => t.id !== id));

  const handleTrackUpdated = (updated: Track) =>
    setMyTracks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
    );

  // ── Primary tabs config ────────────────────────────────────────────────
  const primaryTabs: { key: PrimaryTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "tracks", label: "Tracks", icon: Music2, count: myTracks.length + sharedTracks.length },
    { key: "albums", label: "Albums", icon: Disc3, count: albums.length },
  ];

  // ── Sub-tabs config (within Tracks) ────────────────────────────────────
  const tracksSubTabs: { key: TracksSubTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "my", label: "My Tracks", icon: Headphones, count: myTracks.length },
    { key: "shared", label: "Shared with Me", icon: Share2, count: sharedTracks.length },
  ];

  // ── Shared with Me: sort badge helper ──────────────────────────────────
  const sharedSortBadge = (() => {
    const opt = SHARED_SORT_OPTIONS.find((o) => o.value === sharedSortBy);
    const Icon = opt?.icon;
    return (
      <>
        {Icon && <Icon className="h-3 w-3" />}
        {opt?.label ?? sharedSortBy}
      </>
    );
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-hidden px-2 py-4 pb-44 sm:px-4 sm:py-6 sm:pb-36 lg:py-8 lg:pb-24">

        {/* ── Header ── */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="secondary"
                size="sm"
                className="border-white/10 bg-white/5"
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5 opacity-40" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20 border border-white/10">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight sm:text-lg" data-testid="text-my-tracks-heading">
                  {isArtistView ? `Music by ${viewingArtist?.displayName || viewingArtist?.username || artistSlug}` : "My Tracks"}
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {isArtistView
                    ? `${artistTracks.length} track${artistTracks.length !== 1 ? "s" : ""}`
                    : `${myTracks.length} track${myTracks.length !== 1 ? "s" : ""}${sharedTracks.length > 0 ? ` \u00b7 ${sharedTracks.length} shared` : ""}`
                  }
                </p>
              </div>
            </div>
          </div>
          {!isArtistView && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => loadMyTracks(true)}
              disabled={myTracksRefreshing}
              className="border-white/10 bg-white/5 h-9 w-9 shrink-0"
              title="Refresh"
              data-testid="button-refresh-my-tracks"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", myTracksRefreshing && "animate-spin")} />
            </Button>
          )}
        </header>

        {/* ── Artist View (read-only tracks + albums) ── */}
        {isArtistView ? (
          <div className="flex flex-1 flex-col">
            {artistViewLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/3 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setArtistAlbumTab("tracks")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all",
                      artistAlbumTab === "tracks"
                        ? "bg-white/10 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Music2 className="h-3.5 w-3.5 shrink-0" />
                    Tracks
                    {artistTracks.length > 0 && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", artistAlbumTab === "tracks" ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground")}>
                        {artistTracks.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtistAlbumTab("albums")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all",
                      artistAlbumTab === "albums"
                        ? "bg-white/10 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Disc3 className="h-3.5 w-3.5 shrink-0" />
                    Albums
                    {artistAlbums.length > 0 && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", artistAlbumTab === "albums" ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground")}>
                        {artistAlbums.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tracks tab */}
                {artistAlbumTab === "tracks" && (
                  artistTracks.length === 0 ? (
                    <div className="py-16 text-center">
                      <Headphones className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                      <p className="text-sm font-medium text-muted-foreground">No tracks found</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">This artist hasn't released any tracks yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Toolbar: Search + Sort */}
                      <div className="mb-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="relative flex-1 sm:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={artistSearch}
                              onChange={(e) => setArtistSearch(e.target.value)}
                              placeholder="Search tracks, genres…"
                              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="relative">
                              <select
                                value={artistSort}
                                onChange={(e) => setArtistSort(e.target.value)}
                                className="rounded-xl border border-white/15 bg-white/10 pl-3 pr-8 py-2 text-xs text-white focus:outline-none transition cursor-pointer appearance-none [&>option]:bg-popover [&>option]:text-popover-foreground"
                              >
                                <option value="latest">Latest</option>
                                <option value="oldest">Oldest</option>
                                <option value="plays">Most Played</option>
                                <option value="likes">Most Liked</option>
                                <option value="az">A → Z</option>
                                <option value="za">Z → A</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground/60">
                          {artistSearch.trim()
                            ? `${sortedArtistTracks.length} ${sortedArtistTracks.length === 1 ? "track" : "tracks"} for "${artistSearch}"`
                            : `${sortedArtistTracks.length} ${sortedArtistTracks.length === 1 ? "track" : "tracks"}`}
                        </p>
                      </div>

                      {pagedArtistTracks.length === 0 ? (
                        <div className="py-16 text-center">
                          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
                          <p className="text-sm text-muted-foreground">No tracks match "{artistSearch}"</p>
                          <button type="button" onClick={() => setArtistSearch("")} className="mt-3 text-xs text-primary hover:underline">Clear search</button>
                        </div>
                      ) : (
                        <>
                          <AnimatePresence mode="popLayout">
                            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                              {pagedArtistTracks.map((track, idx) => (
                                <TrackCard
                                  key={track.id}
                                  track={track}
                                  onPlay={handlePlay}
                                  isActive={active?.id === track.id}
                                  index={idx}
                                />
                              ))}
                            </div>
                          </AnimatePresence>
                          <PaginationControls
                            currentPage={artistSafePage}
                            totalPages={artistTotalPages}
                            onPageChange={setArtistPage}
                          />
                        </>
                      )}
                    </>
                  )
                )}

                {/* Albums tab */}
                {artistAlbumTab === "albums" && (
                  <>
                    <div className="mb-6">
                      <div className="relative max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={artistAlbumSearch}
                          onChange={(e) => setArtistAlbumSearch(e.target.value)}
                          placeholder="Search albums…"
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {filteredArtistAlbums.length === 0 && artistAlbums.length > 0 ? (
                      <div className="glass rounded-2xl p-12 text-center">
                        <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No albums matching "{artistAlbumSearch}"</p>
                        <button type="button" onClick={() => setArtistAlbumSearch("")} className="mt-3 text-xs text-primary hover:underline">Clear search</button>
                      </div>
                    ) : artistAlbums.length === 0 ? (
                      <div className="glass rounded-2xl p-12 text-center">
                        <Disc3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No albums yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredArtistAlbums.map((album, idx) => (
                          <motion.div
                            key={album.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="group rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                          >
                            <div className={cn("mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10", !album.coverUrl && "bg-gradient-to-br", album.coverUrl ? "" : (album.coverGradient ?? "from-emerald-500/20 to-fuchsia-500/20"))}>
                              {album.coverUrl ? (
                                <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Disc3 className="h-8 w-8 text-white/20" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{album.title}</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {album.genre}
                                  {(album as any).trackCount ? ` \u00b7 ${(album as any).trackCount} track${(album as any).trackCount !== 1 ? "s" : ""}` : ""}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <>
        {/* ── Primary tabs (Artist-style) ── */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/3 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground")}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TRACKS TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === "tracks" && (
            <motion.div
              key="tracks"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              {/* ── Sub-tabs: My Tracks / Shared with Me ── */}
              <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/3 p-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full sm:self-start">
                {tracksSubTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTracksTab === tab.key;
                  return (
                    <button
                      type="button"
                      key={tab.key}
                      onClick={() => setActiveTracksTab(tab.key)}
                      className={cn(
                        "flex flex-1 sm:flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
                        isActive
                          ? "bg-white/10 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      data-testid={`subtab-${tab.key}`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] tabular-nums", isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground")}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {/* ──── MY TRACKS ──── */}
                {activeTracksTab === "my" && (
                  <motion.div
                    key="my-tracks"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-1 flex-col"
                  >
                    {/* Toolbar: Search + Visibility pills + Sort */}
                    {!myTracksLoading && myTracks.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {/* Search */}
                          <div className="relative flex-1 sm:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={mySearch}
                              onChange={(e) => setMySearch(e.target.value)}
                              placeholder="Search tracks, genres…"
                              data-testid="input-my-tracks-search"
                              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                            />
                          </div>

                          {/* Filter + Sort row */}
                          <div className="flex items-center justify-between gap-2 sm:justify-start">
                            {/* Visibility pills */}
                            <div className="flex items-center gap-1 shrink-0">
                              {(["all", "public", "private"] as const).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setVisibilityFilter(key)}
                                  data-testid={`pill-visibility-${key}`}
                                  className={cn(
                                    "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition",
                                    visibilityFilter === key
                                      ? "bg-primary/20 text-primary"
                                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                                  )}
                                >
                                  {key === "all" ? "All" : key === "public" ? "Public" : "Private"}
                                </button>
                              ))}
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-2 shrink-0">
                              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="relative">
                                <select
                                  value={mySort}
                                  onChange={(e) => setMySort(e.target.value)}
                                  data-testid="select-sort-my-tracks"
                                  className="rounded-xl border border-white/15 bg-white/10 pl-3 pr-8 py-2 text-xs text-white focus:outline-none transition cursor-pointer appearance-none [&>option]:bg-popover [&>option]:text-popover-foreground"
                                >
                                  <option value="latest">Latest</option>
                                  <option value="oldest">Oldest</option>
                                  <option value="plays">Most Played</option>
                                  <option value="likes">Most Liked</option>
                                  <option value="az">A → Z</option>
                                  <option value="za">Z → A</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Result count */}
                        <p className="mt-3 text-xs text-muted-foreground/60">
                          {mySearch.trim()
                            ? `${myFiltered.length} ${myFiltered.length === 1 ? "track" : "tracks"} for "${mySearch}"`
                            : `${myFiltered.length} ${myFiltered.length === 1 ? "track" : "tracks"}`}
                          {visibilityFilter !== "all" && ` (${visibilityFilter})`}
                        </p>
                      </div>
                    )}

                    {/* My Tracks content */}
                    {myTracksLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                        ))}
                      </div>
                    ) : myFiltered.length === 0 && myTracks.length > 0 ? (
                      <div className="py-16 text-center">
                        <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
                        {mySearch.trim() ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              No tracks match "{mySearch}"
                              {visibilityFilter !== "all" && ` in ${visibilityFilter}`}
                            </p>
                            <button
                              type="button"
                              onClick={() => setMySearch("")}
                              className="mt-3 text-xs text-primary hover:underline"
                            >
                              Clear search
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              No {visibilityFilter} tracks
                            </p>
                            <button
                              type="button"
                              onClick={() => setVisibilityFilter("all")}
                              className="mt-3 text-xs text-primary hover:underline"
                            >
                              View all tracks
                            </button>
                          </>
                        )}
                      </div>
                    ) : myTracks.length === 0 ? (
                      <div className="py-16 text-center">
                        <Headphones className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                        <p className="text-sm font-medium text-muted-foreground">No tracks yet</p>
                        <p className="mt-1 text-xs text-muted-foreground/60">Upload your first track to get started.</p>
                        <Link href="/upload">
                          <Button type="button" className="glow mt-5">
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Upload a track
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <>
                        <AnimatePresence mode="popLayout">
                          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                            {myPaged.map((track, idx) => (
                              <MyTrackRow
                                key={track.id}
                                track={track}
                                index={idx}
                                onPlay={handlePlay}
                                onTrackUpdated={handleTrackUpdated}
                                onTrackDeleted={handleTrackDeleted}
                                isActive={active?.id === track.id}
                                togglingId={togglingId}
                                onToggleVisibility={handleToggleVisibility}
                                isOwner={!isArtistView}
                              />
                            ))}
                          </div>
                        </AnimatePresence>
                        <PaginationControls
                          currentPage={myPage}
                          totalPages={myTotalPages}
                          onPageChange={setMyPage}
                        />
                      </>
                    )}
                  </motion.div>
                )}

                {/* ──── SHARED WITH ME ──── */}
                {activeTracksTab === "shared" && (
                  <motion.div
                    key="shared-tracks"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-1 flex-col"
                  >
                    {/* Search + Sort */}
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="relative flex-1 sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={sharedSearch}
                          onChange={(e) => setSharedSearch(e.target.value)}
                          placeholder="Search shared tracks…"
                          data-testid="input-shared-tracks-search"
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                        />
                        {sharedSearch && (
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setSharedSearch("")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className={cn(
                          "border-white/10 bg-white/5 gap-1.5 shrink-0",
                          sharedShowFilters && "border-primary/40 bg-primary/10 text-primary",
                        )}
                        onClick={() => setSharedShowFilters((v) => !v)}
                        data-testid="button-toggle-shared-filters"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">Sort</span>
                      </Button>
                    </div>

                    {/* Sort panel */}
                    <AnimatePresence>
                      {sharedShowFilters && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="mb-4 glass glow noise rounded-2xl border border-white/10 p-3 sm:p-4">
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort by</p>
                            <div className="flex flex-wrap gap-2">
                              {SHARED_SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  onClick={() => setSharedSortBy(value)}
                                  data-testid={`button-shared-sort-${value}`}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                                    sharedSortBy === value
                                      ? "border-primary/40 bg-primary/15 text-primary"
                                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Result header */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {sharedTracksLoading ? (
                          "Loading\u2026"
                        ) : sortedSharedTracks.length === 0 ? (
                          "No tracks found"
                        ) : (
                          <>
                            <span className="text-foreground font-semibold">{sortedSharedTracks.length}</span>{" "}
                            track{sortedSharedTracks.length !== 1 ? "s" : ""}
                            {sharedSearch && ` matching "${sharedSearch}"`}
                          </>
                        )}
                      </p>
                      {!sharedTracksLoading && sortedSharedTracks.length > 0 && (
                        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {sharedSortBadge}
                        </span>
                      )}
                    </div>

                    {/* Shared tracks grid */}
                    <div key={sharedSortBy} className="flex-1 grid gap-2 sm:gap-3 lg:grid-cols-2 content-start" data-testid="shared-tracks-list">
                      {sharedTracksLoading ? (
                        Array.from({ length: SHARED_PAGE_SIZE }).map((_, i) => (
                          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
                        ))
                      ) : pagedSharedTracks.length > 0 ? (
                        pagedSharedTracks.map((track, i) => (
                          <div key={track.id} className="relative">
                            <TrackCard
                              track={track}
                              onPlay={handlePlay}
                              isActive={active?.id === track.id}
                              index={i}
                            />
                            {/* Shared by badge */}
                            <div className="absolute top-2 right-11 sm:top-3 sm:right-13 z-10 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/70 border border-white/10 pointer-events-none">
                              <Share2 className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[100px] sm:max-w-[140px]">
                                {track.sharedByDisplayName || track.sharedByUsername}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="glass rounded-2xl p-12 text-center col-span-full">
                          <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            {sharedSearch
                              ? `No tracks matching "${sharedSearch}"`
                              : "No tracks have been shared with you yet"}
                          </p>
                          {!sharedSearch && (
                            <p className="mt-1 text-xs text-muted-foreground/60">
                              When someone shares a private track with you, it will appear here
                            </p>
                          )}
                          {sharedSearch && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-4 border-white/10 bg-white/5"
                              onClick={() => setSharedSearch("")}
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {!sharedTracksLoading && pagedSharedTracks.length > 0 && (
                      <div className="mt-auto pt-4 sm:pt-6">
                        <SimplePagination page={sharedSafePage} totalPages={sharedTotalPages} onPage={setSharedPage} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ALBUMS TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "albums" && (
            <motion.div
              key="albums"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={albumSearch}
                    onChange={(e) => setAlbumSearch(e.target.value)}
                    placeholder="Search albums…"
                    data-testid="input-album-search"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Album content */}
              {albumsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : filteredAlbums.length === 0 && albums.length > 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No albums matching "{albumSearch}"
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 border-white/10 bg-white/5"
                    onClick={() => setAlbumSearch("")}
                  >
                    Clear search
                  </Button>
                </div>
              ) : albums.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Disc3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No albums yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Create your first album to organize your tracks.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAlbums.map((album, idx) => (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="group rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                    >
                      <div
                        className={cn(
                          "mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10",
                          !album.coverUrl && "bg-gradient-to-br",
                          album.coverUrl ? "" : (album.coverGradient ?? "from-emerald-500/20 to-fuchsia-500/20"),
                        )}
                      >
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Disc3 className="h-8 w-8 text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{album.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {album.genre}
                            {(album as any).trackCount ? ` · ${(album as any).trackCount} track${(album as any).trackCount !== 1 ? "s" : ""}` : ""}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
        <div className="h-8" aria-hidden="true" />
      </div>
    </div>
  );
}
