import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music2,
  Globe,
  Lock,
  Share2,
  UploadCloud,
  Loader2,
  TrendingUp,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { TrackCard } from "@/components/TrackCard";
import { ShareTrackModal } from "@/components/tracks/ShareTrackModal";
import { PaginationControls } from "@/components/PaginationControls";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import type { Track } from "../../../shared/schema";

type VisibilityFilter = "all" | "public" | "private";

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-black tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ─── Dashboard Track Row ──────────────────────────────────────────────────────

function DashboardTrackRow({
  track,
  index,
  onPlay,
  onTrackUpdated,
  onTrackDeleted,
  onShareClick,
  isActive,
  togglingId,
  onToggleVisibility,
}: {
  track: Track;
  index: number;
  onPlay: (t: Track) => void;
  onTrackUpdated: (t: Track) => void;
  onTrackDeleted: (id: string) => void;
  onShareClick: (trackId: string) => void;
  isActive: boolean;
  togglingId: string | null;
  onToggleVisibility: (track: Track) => void;
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
        isOwner
        onTrackDeleted={onTrackDeleted}
        onTrackUpdated={onTrackUpdated}
      />
      {/* Visibility + Share overlaid on the right — desktop only */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden items-center gap-1.5 sm:flex">
        <button
          type="button"
          onClick={() => onToggleVisibility(track)}
          disabled={isToggling}
          title={isPrivate ? "Make public" : "Make private"}
          data-testid={`button-toggle-visibility-${track.id}`}
          className={cn(
            "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition",
            isPrivate
              ? "border-white/15 bg-white/5 text-muted-foreground hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
              : "border-white/15 bg-white/5 text-muted-foreground hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300",
          )}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPrivate ? (
            <><Lock className="h-3 w-3" /><span className="hidden sm:inline">Private</span></>
          ) : (
            <><Globe className="h-3 w-3" /><span className="hidden sm:inline">Public</span></>
          )}
        </button>
        {isPrivate && (
          <button
            type="button"
            onClick={() => onShareClick(track.id)}
            title="Manage sharing"
            data-testid={`button-share-track-${track.id}`}
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <Share2 className="h-3 w-3" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { toast } = useToast();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [shareModalTrackId, setShareModalTrackId] = useState<string | null>(null);

  // ── Search / Sort config ─────────────────────────────────────────────────
  const trackSortConfig = useMemo(() => [
    { value: "latest", label: "Latest", comparer: (a: Track, b: Track) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
    { value: "oldest", label: "Oldest", comparer: (a: Track, b: Track) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
    { value: "plays", label: "Most Played", comparer: (a: Track, b: Track) => (b.plays ?? 0) - (a.plays ?? 0) },
    { value: "likes", label: "Most Liked", comparer: (a: Track, b: Track) => (b.likes ?? 0) - (a.likes ?? 0) },
    { value: "az", label: "A → Z", comparer: (a: Track, b: Track) => a.title.localeCompare(b.title) },
    { value: "za", label: "Z → A", comparer: (a: Track, b: Track) => b.title.localeCompare(a.title) },
  ], []);

  const trackSearchFields: (keyof Track)[] = useMemo(() => ["title", "genre", "artist"], []);

  const loadTracks = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await apiRequestJson<Track[]>(
        "GET",
        API_ENDPOINTS.tracks.list,
        undefined,
        { userId: user.id },
      );
      setTracks(
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadTracks();
  }, [user?.id]);

  // Step 1: Visibility filter (remains separate)
  const visibilityFiltered = useMemo(() => {
    if (visibilityFilter === "public")
      return tracks.filter((t) => (t as any).visibility !== "private");
    if (visibilityFilter === "private")
      return tracks.filter((t) => (t as any).visibility === "private");
    return tracks;
  }, [tracks, visibilityFilter]);

  // Step 2: Search + Sort + Pagination (reusable across any data)
  const {
    search: trackSearch,
    setSearch: setTrackSearch,
    sort: trackSort,
    setSort: setTrackSort,
    page: trackPage,
    setPage: setTrackPage,
    filtered: searchFiltered,
    paged: pagedTracks,
    totalPages: trackTotalPages,
  } = useSearchFilter({
    data: visibilityFiltered,
    searchFields: trackSearchFields,
    defaultSort: "latest",
    sortConfig: trackSortConfig,
    itemsPerPage: 10,
  });

  const publicCount = useMemo(
    () => tracks.filter((t) => (t as any).visibility !== "private").length,
    [tracks],
  );
  const privateCount = useMemo(
    () => tracks.filter((t) => (t as any).visibility === "private").length,
    [tracks],
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
      setTracks((prev) =>
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

  const handlePlay = (t: Track) => {
    if (active?.id === t.id) {
      setIsPlaying(!isPlaying);
    } else {
      setAutoPlay(true);
      setActive(t);
    }
  };

  const handleTrackDeleted = (id: string) =>
    setTracks((prev) => prev.filter((t) => t.id !== id));

  const handleTrackUpdated = (updated: Track) =>
    setTracks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
    );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-44 sm:pb-36 lg:py-8 lg:pb-8">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl" data-testid="heading-dashboard">
              My Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your tracks and visibility
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => loadTracks(true)}
              disabled={refreshing}
              className="border-white/10 bg-white/5"
              data-testid="button-refresh-dashboard"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Link href="/upload">
              <Button type="button" className="glow" data-testid="button-upload-new">
                <UploadCloud className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Stats row */}
        {!loading && tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatCard
              icon={BarChart3}
              label="Total tracks"
              value={tracks.length}
              accent="bg-primary/15 text-primary"
            />
            <StatCard
              icon={Globe}
              label="Public"
              value={publicCount}
              accent="bg-emerald-500/15 text-emerald-400"
            />
            <StatCard
              icon={Lock}
              label="Private"
              value={privateCount}
              accent="bg-amber-500/15 text-amber-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Visibility rate"
              value={tracks.length > 0 ? Math.round((publicCount / tracks.length) * 100) : 0}
              accent="bg-fuchsia-500/15 text-fuchsia-400"
            />
          </motion.div>
        )}

        {/* Toolbar — Search + Visibility pills + Sort */}
        {!loading && tracks.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  placeholder="Search tracks, genres…"
                  data-testid="input-search-filter"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                />
              </div>

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
                <Select value={trackSort} onValueChange={(v) => setTrackSort(v)}>
                  <SelectTrigger
                    data-testid="select-sort-filter"
                    className="h-auto w-auto gap-1.5 rounded-xl border-white/15 bg-white/10 px-3 py-2 text-xs text-white focus:ring-0 focus:border-white/30"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    sideOffset={4}
                    align="end"
                    className="rounded-xl border-white/15 bg-background/95 backdrop-blur-md"
                  >
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="plays">Most Played</SelectItem>
                    <SelectItem value="likes">Most Liked</SelectItem>
                    <SelectItem value="az">A → Z</SelectItem>
                    <SelectItem value="za">Z → A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Result count */}
            <p className="mt-3 text-xs text-muted-foreground/60">
              {trackSearch.trim()
                ? `${searchFiltered.length} ${searchFiltered.length === 1 ? "track" : "tracks"} for "${trackSearch}"`
                : `${searchFiltered.length} ${searchFiltered.length === 1 ? "track" : "tracks"}`}
            </p>
          </div>
        )}

        {/* Track list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : searchFiltered.length === 0 && tracks.length > 0 ? (
          // No results after search/visibility filter (but tracks exist)
          <div className="py-20 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
            {trackSearch.trim() ? (
              <>
                <p className="text-sm text-muted-foreground">
                  No tracks match "{trackSearch}"
                  {visibilityFilter !== "all" && ` in ${visibilityFilter}`}
                </p>
                <button
                  type="button"
                  onClick={() => { setTrackSearch(""); }}
                  className="mt-3 text-xs text-primary hover:underline"
                  data-testid="button-clear-search"
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
        ) : pagedTracks.length === 0 && tracks.length === 0 ? (
          // No tracks at all
          <div className="py-20 text-center">
            <Music2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
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
              <div className="grid gap-2 sm:gap-3">
                {pagedTracks.map((track, idx) => (
                  <DashboardTrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    onPlay={handlePlay}
                    onTrackUpdated={handleTrackUpdated}
                    onTrackDeleted={handleTrackDeleted}
                    onShareClick={(id) => setShareModalTrackId(id)}
                    isActive={active?.id === track.id}
                    togglingId={togglingId}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Pagination at the bottom of the track list */}
            <PaginationControls
              currentPage={trackPage}
              totalPages={trackTotalPages}
              onPageChange={setTrackPage}
            />
          </>
        )}
      </div>

      {/* Share modal */}
      {shareModalTrackId && (
        <ShareTrackModal
          trackId={shareModalTrackId}
          open={!!shareModalTrackId}
          onOpenChange={(open) => { if (!open) setShareModalTrackId(null); }}
        />
      )}
    </div>
  );
}
