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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { TrackCard } from "@/components/TrackCard";
import { ShareTrackModal } from "@/components/tracks/ShareTrackModal";
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
      className="group relative"
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
      {/* Visibility + Share overlaid on the right */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
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

  const filteredTracks = useMemo(() => {
    if (visibilityFilter === "public")
      return tracks.filter((t) => (t as any).visibility !== "private");
    if (visibilityFilter === "private")
      return tracks.filter((t) => (t as any).visibility === "private");
    return tracks;
  }, [tracks, visibilityFilter]);

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

  const filterTabs: { key: VisibilityFilter; label: string; icon: React.ElementType; count: number }[] = [
    { key: "all", label: "All", icon: Music2, count: tracks.length },
    { key: "public", label: "Public", icon: Globe, count: publicCount },
    { key: "private", label: "Private", icon: Lock, count: privateCount },
  ];

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

        {/* Filter tabs */}
        {!loading && tracks.length > 0 && (
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/3 p-1 [scrollbar-width:none]">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = visibilityFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setVisibilityFilter(tab.key)}
                  data-testid={`tab-filter-${tab.key}`}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "bg-white/10 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Track list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="py-20 text-center">
            <Music2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
            {tracks.length === 0 ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">No tracks yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Upload your first track to get started.</p>
                <Link href="/upload">
                  <Button type="button" className="glow mt-5">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload a track
                  </Button>
                </Link>
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
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-2 sm:gap-3">
              {filteredTracks.map((track, idx) => (
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
