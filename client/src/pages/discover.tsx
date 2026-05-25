import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Compass,
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
import { TrackCard } from "@/components/TrackCard";
import { useGenres } from "@/hooks/use-genres";
import type { Track } from "../../../shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

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
  genres,
  active,
  onChange,
  counts,
}: {
  genres: string[];
  active: string;
  onChange: (g: string) => void;
  counts: Record<string, number>;
}) {
  const all = ["All", ...genres];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Genre filter"
    >
      {all.map((genre) => {
        const count = genre === "All" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[genre] ?? 0);
        const isActive = genre === active;
        return (
          <button
            key={genre}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(genre)}
            data-testid={`tab-genre-${genre.toLowerCase().replace(/[\s/&]/g, "-")}`}
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

  const { genres } = useGenres();

  const { active, isPlaying, setIsPlaying, playTrack } = usePlayer();

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

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTracks) {
      counts[t.genre] = (counts[t.genre] ?? 0) + 1;
    }
    return counts;
  }, [allTracks]);

  const processed = useMemo(() => {
    let list = allTracks;

    if (genre !== "All") list = list.filter((t) => t.genre === genre);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        `${t.title} ${t.artist} ${t.genre} ${t.mood ?? ""}`.toLowerCase().includes(q),
      );
    }

    const sorted = [...list].sort((a, b) => {
      let diff: number;
      if (sortBy === "createdAt") {
        const getTime = (t: Track) => {
          const d = t.publishedAt ?? t.createdAt ?? t.updatedAt;
          return d ? new Date(d).getTime() : 0;
        };
        diff = getTime(b) - getTime(a);
      } else {
        // Numeric sorts (plays, likes) — safely default undefined to 0.
        diff = (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
      }
      // Secondary sort by title (ascending) so ties always produce a visible change.
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });

    return sorted;
  }, [allTracks, genre, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [genre, search, sortBy]);

  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePlay = useCallback(
    (t: Track) => {
      if (active?.id === t.id) {
        setIsPlaying(!isPlaying);
      } else {
        playTrack(t);
      }
    },
    [active, isPlaying, playTrack, setIsPlaying],
  );

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
          <GenreTabs genres={genres} active={genre} onChange={setGenre} counts={genreCounts} />
        </div>

        {/* ── Results header ── */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {genre !== "All" && (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15" aria-hidden="true">
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
            {/* Active sort badge — always visible so the user can see which sort is applied */}
            {!loading && processed.length > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                {(() => {
                  const opt = SORT_OPTIONS.find((o) => o.value === sortBy);
                  const Icon = opt?.icon;
                  return (
                    <>
                      {Icon && <Icon className="h-3 w-3" />}
                      {opt?.label ?? sortBy}
                    </>
                  );
                })()}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
          )}
        </div>

        {/* ── Track list ── */}
        {/* key=sortBy forces a full re-mount when sort changes, bypassing
            framer-motion layout issues with CSS Grid reordering. */}
        <div key={sortBy} className="flex-1 grid gap-2 sm:gap-3 lg:grid-cols-2 content-start" data-testid="discover-track-list">
          {loading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))
          ) : paged.length > 0 ? (
            <>
              {paged.map((track, i) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={handlePlay}
                  isActive={active?.id === track.id}
                  index={i}
                />
              ))}
            </>
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
        <div className="mt-auto pt-4 sm:pt-6">
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>

        <div className="h-8" aria-hidden="true" />
      </div>
    </div>
  );
}
