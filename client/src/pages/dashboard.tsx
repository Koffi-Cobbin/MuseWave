import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  UploadCloud,
  RefreshCw,
  Music2,
  Heart,
  Download,
  Users,
  Headphones,
  Eye,
  EyeOff,
  Trash2,
  Play,
  ExternalLink,
  Clock,
  CheckCircle2,
  Radio,
  Globe,
  Lock,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  ArrowUpDown,
  SlidersHorizontal,
  UserCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track } from "../../../shared/schema";

// ─── Local Types ──────────────────────────────────────────────────────────────

type UserStats = {
  userId: string;
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  totalDownloads: number;
  totalFollowers: number;
  totalFollowing: number;
  monthlyListeners: number;
  updatedAt: string;
};

type TrackStats = {
  trackId: string;
  dailyPlays: Record<string, number>;
  totalUniqueListeners: number;
  avgListenDuration: number;
  completionRate: number;
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="mb-1 h-6 w-14 animate-pulse rounded bg-white/10" />
        ) : (
          <div className="text-xl font-black tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
            {value}
          </div>
        )}
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  index,
  isSelected,
  onSelect,
  onPlay,
  onToggleVisibility,
  onDelete,
  pendingDelete,
  onConfirmDelete,
  onCancelDelete,
  isActive,
  isPlaying,
}: {
  track: Track;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  pendingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isActive: boolean;
  isPlaying: boolean;
}) {
  const isPrivate = (track as any).visibility === "private";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div
        className={cn(
          "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all cursor-pointer",
          isSelected
            ? "border-primary/30 bg-primary/[0.06]"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
        )}
        onClick={onSelect}
        data-testid={`row-track-${track.id}`}
      >
        {/* Active play indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}

        {/* Cover / index */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/8 text-xs text-muted-foreground font-semibold">
              {index + 1}
            </div>
          )}
          {/* Play overlay */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
            aria-label={`Play ${track.title}`}
            data-testid={`button-play-track-${track.id}`}
          >
            <Play className={cn("h-4 w-4 fill-current", isActive && isPlaying ? "text-primary" : "text-white")} />
          </button>
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={cn(
                "truncate text-sm font-semibold",
                isActive ? "text-primary" : "text-white/90",
              )}
              data-testid={`text-track-title-${track.id}`}
            >
              {track.title}
            </span>
            {!(track as any).published && (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            {track.genre && <span className="truncate">{track.genre}</span>}
            {track.audioDuration > 0 && (
              <span className="shrink-0 tabular-nums">{fmtDuration(track.audioDuration)}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground" title="Plays">
            <Play className="h-3 w-3 fill-current opacity-60" />
            {fmt(track.plays ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground" title="Likes">
            <Heart className="h-3 w-3 fill-current opacity-60" />
            {fmt(track.likes ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground" title="Downloads">
            <Download className="h-3 w-3 opacity-60" />
            {fmt(track.downloads ?? 0)}
          </span>
        </div>

        {/* Visibility + actions */}
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleVisibility}
            title={isPrivate ? "Set public" : "Set private"}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition",
              isPrivate
                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
            )}
            data-testid={`button-toggle-visibility-${track.id}`}
          >
            {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            <span className="hidden sm:inline">{isPrivate ? "Private" : "Public"}</span>
          </button>

          {pendingDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="flex h-7 items-center gap-1 rounded-full bg-red-500/15 px-2 text-[11px] font-medium text-red-400 transition hover:bg-red-500/25"
                data-testid={`button-confirm-delete-${track.id}`}
              >
                <CheckCircle2 className="h-3 w-3" /> Confirm
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              title="Delete track"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/40 transition hover:bg-red-500/10 hover:text-red-400"
              data-testid={`button-delete-track-${track.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({
  track,
  stats,
  loading,
}: {
  track: Track | null;
  stats: TrackStats | null;
  loading: boolean;
}) {
  const last14 = getLast14Days();

  const chartData = useMemo(() => {
    if (!stats?.dailyPlays) return last14.map((d) => ({ date: d.slice(5), plays: 0 }));
    return last14.map((d) => ({
      date: d.slice(5).replace("-", "/"),
      plays: stats.dailyPlays[d] ?? 0,
    }));
  }, [stats]);

  const maxPlays = Math.max(...chartData.map((d) => d.plays), 1);

  if (!track) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/60">Select a track to see its analytics</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      {/* Track header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/8">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{track.title}</div>
          <div className="text-xs text-muted-foreground">{track.artist}</div>
        </div>
        <Link href={`/artist/${(track as any).artistSlug || track.artist?.toLowerCase().replace(/\s+/g, "-")}`}>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition hover:bg-white/8 hover:text-foreground"
            title="View public page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      {/* Metric pills */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          {
            label: "Unique listeners",
            value: loading ? "—" : fmt(stats?.totalUniqueListeners ?? 0),
            icon: UserCheck,
            color: "text-sky-400",
          },
          {
            label: "Avg duration",
            value: loading ? "—" : fmtDuration(stats?.avgListenDuration ?? 0),
            icon: Clock,
            color: "text-violet-400",
          },
          {
            label: "Completion",
            value: loading ? "—" : `${Math.round(stats?.completionRate ?? 0)}%`,
            icon: Zap,
            color: stats && stats.completionRate >= 70 ? "text-emerald-400" : "text-amber-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.04] py-3">
            <Icon className={cn("h-4 w-4", color)} />
            <div className="text-sm font-black tabular-nums">{value}</div>
            <div className="text-center text-[10px] leading-tight text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Daily plays chart */}
      <div className="mb-1">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Daily plays · last 14 days
        </div>
        {loading ? (
          <div className="h-28 w-full animate-pulse rounded-xl bg-white/5" />
        ) : (
          <ResponsiveContainer width="100%" height={112}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -32, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,10,15,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#fff",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 2 }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.plays === maxPlays && maxPlays > 0
                        ? "rgb(16,185,129)"
                        : "rgba(16,185,129,0.4)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "plays", label: "Most played" },
  { key: "likes", label: "Most liked" },
  { key: "downloads", label: "Most downloaded" },
  { key: "newest", label: "Newest" },
  { key: "title", label: "A–Z" },
];

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { active, isPlaying, playTrack, playQueue, setIsPlaying } = usePlayer();

  // ── Data state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Track selection + analytics
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [trackStats, setTrackStats] = useState<TrackStats | null>(null);
  const [trackStatsLoading, setTrackStatsLoading] = useState(false);

  // ── UI state
  const [sortKey, setSortKey] = useState<SortKey>("plays");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // ── Load all data ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const tracksData = await apiRequestJson<Track[]>(
        "GET",
        API_ENDPOINTS.tracks.list,
        undefined,
        { userId: user.id },
      );

      const myTracks = (Array.isArray(tracksData) ? tracksData : []).filter(
        (t) => t.userId === user.id || (t as any).user_id === user.id,
      );
      setTracks(myTracks);

      // Auto-select top track
      if (!selectedTrackId && myTracks.length > 0) {
        const top = [...myTracks].sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))[0];
        setSelectedTrackId(top.id);
      }
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
  }, [user?.id, selectedTrackId]);

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;
    setStatsLoading(true);
    try {
      const data = await apiRequestJson<UserStats>("GET", API_ENDPOINTS.users.stats(user.id));
      setUserStats(data);
    } catch {
      // Stats are best-effort
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadData();
      loadUserStats();
    }
  }, [user?.id]);

  // ── Load selected track stats ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedTrackId) { setTrackStats(null); return; }
    let cancelled = false;
    setTrackStatsLoading(true);
    setTrackStats(null);
    apiRequestJson<TrackStats>("GET", API_ENDPOINTS.tracks.stats(selectedTrackId))
      .then((data) => { if (!cancelled) setTrackStats(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTrackStatsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTrackId]);

  // ── Sorted tracks ──────────────────────────────────────────────────────────

  const sortedTracks = useMemo(() => {
    const arr = [...tracks];
    switch (sortKey) {
      case "plays": return arr.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
      case "likes": return arr.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
      case "downloads": return arr.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
      case "newest":
        return arr.sort(
          (a, b) =>
            new Date((b as any).publishedAt ?? b.createdAt ?? 0).getTime() -
            new Date((a as any).publishedAt ?? a.createdAt ?? 0).getTime(),
        );
      case "title": return arr.sort((a, b) => a.title.localeCompare(b.title));
      default: return arr;
    }
  }, [tracks, sortKey]);

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId],
  );

  // ── Track actions ──────────────────────────────────────────────────────────

  const toggleVisibility = async (track: Track) => {
    const newVis = (track as any).visibility === "private" ? "public" : "private";
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, visibility: newVis } as Track : t)),
    );
    try {
      await apiRequestJson("PATCH", API_ENDPOINTS.tracks.update(track.id), { visibility: newVis });
    } catch {
      // Revert
      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, visibility: (track as any).visibility } as Track : t,
        ),
      );
      toast({ variant: "destructive", title: "Failed to update visibility" });
    }
  };

  const confirmDelete = async (trackId: string) => {
    try {
      await apiRequestJson("DELETE", API_ENDPOINTS.tracks.delete(trackId));
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (selectedTrackId === trackId) setSelectedTrackId(null);
      toast({ title: "Track deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete track" });
    } finally {
      setPendingDelete(null);
    }
  };

  const handlePlay = (track: Track) => {
    if (active?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      playQueue([track, ...tracks.filter(t => t.id !== track.id)]);
    }
  };

  const handleRefresh = () => {
    loadData(true);
    loadUserStats();
  };

  // ── Not logged in ──────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  const publicCount = tracks.filter((t) => (t as any).visibility !== "private").length;
  const privateCount = tracks.filter((t) => (t as any).visibility === "private").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.15),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.12),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.08),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-44 sm:pb-36 lg:py-8 lg:pb-10">

        {/* ── Header ── */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl" data-testid="heading-dashboard">
              Artist Dashboard
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {user?.displayName ?? user?.username} · manage your music &amp; insights
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-white/10 bg-white/5"
              data-testid="button-refresh-dashboard"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            {user?.username && (
              <Link href={`/artist/${user.username}`}>
                <Button
                  type="button"
                  variant="secondary"
                  className="hidden border-white/10 bg-white/5 sm:flex"
                  data-testid="button-view-profile"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
            )}
            <Link href="/upload">
              <Button type="button" className="glow" data-testid="button-upload-new">
                <UploadCloud className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload Track</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Stats Overview ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <StatCard
            icon={Radio}
            label="Total plays"
            value={statsLoading ? "—" : fmt(userStats?.totalPlays ?? 0)}
            accent="bg-emerald-500/15 text-emerald-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Heart}
            label="Total likes"
            value={statsLoading ? "—" : fmt(userStats?.totalLikes ?? 0)}
            accent="bg-rose-500/15 text-rose-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Download}
            label="Downloads"
            value={statsLoading ? "—" : fmt(userStats?.totalDownloads ?? 0)}
            accent="bg-sky-500/15 text-sky-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Users}
            label="Followers"
            value={statsLoading ? "—" : fmt(userStats?.totalFollowers ?? 0)}
            accent="bg-violet-500/15 text-violet-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Headphones}
            label="Monthly listeners"
            value={statsLoading ? "—" : fmt(userStats?.monthlyListeners ?? 0)}
            accent="bg-fuchsia-500/15 text-fuchsia-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Music2}
            label="Tracks"
            value={loading ? "—" : fmt(tracks.length)}
            accent="bg-amber-500/15 text-amber-400"
            loading={loading}
          />
        </motion.div>

        {/* ── Visibility summary bar ── */}
        {!loading && tracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span className="text-sm">
                <strong className="text-emerald-400">{publicCount}</strong>{" "}
                <span className="text-muted-foreground">public</span>
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-sm">
                <strong className="text-amber-400">{privateCount}</strong>{" "}
                <span className="text-muted-foreground">private</span>
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: tracks.length > 0 ? `${(publicCount / tracks.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {tracks.length > 0 ? Math.round((publicCount / tracks.length) * 100) : 0}% public
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Main Grid: Track list + Analytics ── */}
        <div className="mb-6 grid gap-5 lg:grid-cols-5">

          {/* Tracks list */}
          <div className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music2 className="h-5 w-5 shrink-0 text-primary" />
                <h2 className="text-base font-semibold sm:text-lg">My Tracks</h2>
                {!loading && (
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-muted-foreground">
                    {tracks.length}
                  </span>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="border-0 bg-transparent text-xs text-muted-foreground outline-none cursor-pointer hover:text-foreground"
                  data-testid="select-track-sort"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key} className="bg-background text-foreground">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Track rows */}
            <div className="flex flex-col gap-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[60px] animate-pulse rounded-xl bg-white/5" />
                ))
              ) : sortedTracks.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-14 text-center">
                  <Music2 className="h-8 w-8 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No tracks yet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">Upload your first track to get started</p>
                  </div>
                  <Link href="/upload">
                    <Button size="sm" className="glow">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </Link>
                </div>
              ) : (
                sortedTracks.map((track, i) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={i}
                    isSelected={selectedTrackId === track.id}
                    onSelect={() => setSelectedTrackId(track.id)}
                    onPlay={() => handlePlay(track)}
                    onToggleVisibility={() => toggleVisibility(track)}
                    onDelete={() => setPendingDelete(track.id)}
                    pendingDelete={pendingDelete === track.id}
                    onConfirmDelete={() => confirmDelete(track.id)}
                    onCancelDelete={() => setPendingDelete(null)}
                    isActive={active?.id === track.id}
                    isPlaying={active?.id === track.id && isPlaying}
                  />
                ))
              )}
            </div>
          </div>

          {/* Analytics panel */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 shrink-0 text-fuchsia-400" />
              <h2 className="text-base font-semibold sm:text-lg">Track Analytics</h2>
            </div>
            <AnalyticsPanel
              track={selectedTrack}
              stats={trackStats}
              loading={trackStatsLoading}
            />
          </div>
        </div>

        {/* ── Footer quick links ── */}
        <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-6 text-xs text-muted-foreground">
          <Link href="/upload">
            <span className="flex items-center gap-1.5 transition hover:text-foreground cursor-pointer">
              <UploadCloud className="h-3.5 w-3.5" /> Upload a track
            </span>
          </Link>
          {user?.username && (
            <Link href={`/artist/${user.username}`}>
              <span className="flex items-center gap-1.5 transition hover:text-foreground cursor-pointer">
                <ExternalLink className="h-3.5 w-3.5" /> Public profile
              </span>
            </Link>
          )}
          <Link href="/playlists">
            <span className="flex items-center gap-1.5 transition hover:text-foreground cursor-pointer">
              <Music2 className="h-3.5 w-3.5" /> My playlists
            </span>
          </Link>
          <Link href="/albums">
            <span className="flex items-center gap-1.5 transition hover:text-foreground cursor-pointer">
              <ExternalLink className="h-3.5 w-3.5" /> My albums
            </span>
          </Link>
          {userStats && (
            <span className="ml-auto text-muted-foreground/50">
              Following {fmt(userStats.totalFollowing)} artists
            </span>
          )}
        </div>

        <div className="h-20 lg:h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
