import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Globe,
  Lock,
  UploadCloud,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track } from "../../../shared/schema";

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

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const publicCount = useMemo(
    () => tracks.filter((t) => (t as any).visibility !== "private").length,
    [tracks],
  );
  const privateCount = useMemo(
    () => tracks.filter((t) => (t as any).visibility === "private").length,
    [tracks],
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
      </div>
    </div>
  );
}
