import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  Play,
  Pause,
  Music2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  Heart,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/player-context";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track } from "../../../shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const GENRES = [
  "All",
  "Afrobeats",
  "Indie",
  "Lo-fi",
  "Pop",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Folk",
  "Jazz",
  "Classical",
  "Rock",
  "Alternative",
  "Ambient",
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Latest", icon: Clock },
  { value: "plays", label: "Most Played", icon: TrendingUp },
  { value: "likes", label: "Most Liked", icon: Heart },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]["value"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function secondsToTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${`${sec}`.padStart(2, "0")}`;
}

// ─── Track Card ──────────────────────────────────────────────────────────────

function DiscoverTrackCard({
  track,
  index,
  isActive,
  onPlay,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  onPlay: (t: Track) => void;
}) {
  const { isPlaying } = usePlayer();
  const isActiveAndPlaying = isActive && isPlaying;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className={cn(
        "group relative glass glow noise rounded-2xl p-3 sm:p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10",
        isActive && "ring-1 ring-primary/60 bg-primary/5",
      )}
      data-testid={`discover-track-${track.id}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Cover Art */}
        <div
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-16 sm:w-16",
            !track.coverUrl && "bg-gradient-to-br",
            track.coverUrl ? "" : track.coverGradient || "from-emerald-400/30 to-fuchsia-500/20",
          )}
          aria-hidden="true"
        >
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-40 blur-[8px]" />
          )}
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{track.title}</p>
              <Link href={`/artist/${track.artistSlug}`}>
                <a className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Music2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{track.artist}</span>
                </a>
              </Link>
            </div>
            {/* Play button */}
            <div className="shrink-0">
              {isActive ? (
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
                  onClick={() => onPlay(track)}
                  data-testid={`button-play-discover-${track.id}`}
                >
                  {isActiveAndPlaying ? (
                    <Pause className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
                  onClick={() => onPlay(track)}
                  data-testid={`button-play-discover-${track.id}`}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </Button>
              )}
            </div>
          </div>

          {/* Tags + Meta */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="border-white/10 bg-white/5 text-xs">
                {track.genre}
              </Badge>
              {track.mood && (
                <Badge variant="outline" className="border-white/12 bg-transparent text-xs">
                  {track.mood}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
              <span>{secondsToTime(track.audioDuration)}</span>
              <span className="opacity-40">·</span>
              <span>{formatCount(track.plays)} plays</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build visible page numbers — always show first, last, and a window around current
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
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
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "secondary"}
            className={cn(
              "h-8 w-8 text-xs",
              p !== page && "border-white/10 bg-white/5",
            )}
            onClick={() => onPage(p as number)}
            data-testid={`button-page-${p}`}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 border-white/10 bg-white/5"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        data-testid="button-next-page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Genre Tab Strip ─────────────────────────────────────────────────────────

function GenreTabs({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (g: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Genre filter"
    >
      {GENRES.map((genre) => {
        const count = genre === "All" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[genre] ?? 0);
        const isActive = genre === active;
        return (
          <button
            key={genre}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(genre)}
            data-testid={`tab-genre-${genre.toLowerCase().replace(/[\s/]/g, "-")}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              "border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              isActive
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
            )}
          >
            {genre}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-md px-1 text-[10px] leading-4 font-semibold tabular-nums",
                  isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Discover() {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState("All");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();

  // Fetch all published tracks once
  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, {
          published: true,
        });
        setAllTracks(data);
      } catch (e) {
        console.error("Failed to load tracks", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Genre → count map (for tab badges)
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTracks) {
      counts[t.genre] = (counts[t.genre] ?? 0) + 1;
    }
    return counts;
  }, [allTracks]);

  // Filter → sort pipeline
  const processed = useMemo(() => {
    let list = allTracks;

    // Genre filter
    if (genre !== "All") list = list.filter((t) => t.genre === genre);

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        `${t.title} ${t.artist} ${t.genre} ${t.mood ?? ""}`.toLowerCase().includes(q),
      );
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "createdAt") {
        return new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
      }
      return (b[sortBy] as number) - (a[sortBy] as number);
    });

    return sorted;
  }, [allTracks, genre, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [genre, search, sortBy]);

  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const handleGenreChange = (g: string) => {
    setGenre(g);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-5xl overflow-x-hidden px-2 py-4 sm:px-4 sm:py-6 lg:py-8">

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
                <Compass className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight sm:text-lg" data-testid="text-discover-heading">
                  Discover
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {processed.length} tracks across {Object.keys(genreCounts).length} genres
                </p>
              </div>
            </div>
          </div>

          {/* Search + filter toggle */}
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-44 pl-8 text-xs lg:w-56"
                data-testid="input-discover-search"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                "border-white/10 bg-white/5 gap-1.5",
                showFilters && "border-primary/40 bg-primary/10 text-primary",
              )}
              onClick={() => setShowFilters((v) => !v)}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Sort</span>
            </Button>
          </div>
        </header>

        {/* ── Mobile search ── */}
        <div className="mb-4 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks, artists…"
              className="pl-8 text-sm"
              data-testid="input-discover-search-mobile"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Sort panel ── */}
        <AnimatePresence>
          {showFilters && (
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
                  {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSortBy(value)}
                      data-testid={`button-sort-${value}`}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                        sortBy === value
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

        {/* ── Genre tabs ── */}
        <div className="mb-5">
          <GenreTabs active={genre} onChange={handleGenreChange} counts={genreCounts} />
        </div>

        {/* ── Results header ── */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {genre !== "All" && (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15"
                aria-hidden="true"
              >
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {loading ? (
                "Loading…"
              ) : processed.length === 0 ? (
                "No tracks found"
              ) : (
                <>
                  <span className="text-foreground font-semibold">{processed.length}</span>{" "}
                  {genre !== "All" ? `${genre} ` : ""}track{processed.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </>
              )}
            </p>
          </div>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
          )}
        </div>

        {/* ── Track list ── */}
        <div className="grid gap-2 sm:gap-3" data-testid="discover-track-list">
          {loading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))
          ) : paged.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {paged.map((track, i) => (
                <DiscoverTrackCard
                  key={track.id}
                  track={track}
                  index={i}
                  isActive={active?.id === track.id}
                  onPlay={handlePlay}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Compass className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No tracks matching "${search}" in ${genre === "All" ? "any genre" : genre}`
                  : `No tracks in ${genre} yet`}
              </p>
              {(search || genre !== "All") && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 border-white/10 bg-white/5"
                  onClick={() => { setSearch(""); setGenre("All"); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && paged.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        )}

        {/* Spacer for PlayerBar */}
        <div className="h-24" aria-hidden="true" />
      </div>
    </div>
  );
}