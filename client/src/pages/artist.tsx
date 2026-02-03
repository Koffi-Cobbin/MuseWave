import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  ExternalLink,
  Heart,
  Music2,
  Play,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Artist = {
  id: string;
  username: string;
  name: string;
  bio?: string;
  tagline?: string;
  followers: number;
  monthlyListeners: number;
  accent?: string;
};

type Track = {
  id: string;
  title: string;
  audioDuration: number;
  plays: number;
  coverGradient: string;
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function time(duration: number) {
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${`${sec}`.padStart(2, "0")}`;
}

export default function ArtistPage() {
  const params = useParams();
  const slug = (params as any)?.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user by username (slug)
        const userRes = await fetch(`/api/users/username/${slug}`);
        if (!userRes.ok) return;
        const userData = await userRes.json();
        
        // Fetch user stats
        const statsRes = await fetch(`/api/users/${userData.id}/stats`);
        const statsData = statsRes.ok ? await statsRes.json() : { followers: 0, monthlyListeners: 0 };
        
        setArtist({
          ...userData,
          followers: statsData.followers || 0,
          monthlyListeners: statsData.monthlyListeners || 0,
          tagline: userData.tagline || "Fresh sounds, new era energy",
          accent: userData.accent || "from-emerald-400/28 via-transparent to-cyan-400/22"
        });

        // Fetch user tracks
        const tracksRes = await fetch(`/api/tracks?userId=${userData.id}&published=true`);
        if (tracksRes.ok) {
          const tracksData = await tracksRes.json();
          setTracks(tracksData);
        }
      } catch (error) {
        console.error("Failed to fetch artist data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading artist profile...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold">Artist not found</div>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const followCount = artist.followers + (following ? 1 : 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="secondary"
                className="border-white/10 bg-white/5"
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <div className="text-xs text-muted-foreground" data-testid="text-artist-route">
                Artist
              </div>
              <div className="text-lg font-semibold" data-testid="text-artist-title">
                {artist.name}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={following ? "secondary" : "default"}
              className={cn(
                "border-white/10",
                following ? "bg-white/5" : "",
              )}
              onClick={() => setFollowing((v) => !v)}
              data-testid="button-follow"
            >
              <Heart className={cn("mr-2 h-4 w-4", following && "fill-current")} />
              {following ? "Following" : "Follow"}
            </Button>
            <Button
              variant="secondary"
              className="border-white/10 bg-white/5"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
              }}
              data-testid="button-share"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/6 via-white/2 to-transparent">
          <div className="grid gap-5 p-6 sm:grid-cols-12 sm:items-center">
            <div className="sm:col-span-7">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-verified">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Emerging
                </Badge>
                <span className="text-xs text-muted-foreground" data-testid="text-artist-tagline">
                  {artist.tagline}
                </span>
              </div>
              <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-artist-name">
                {artist.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="text-xs text-muted-foreground">Followers</div>
                  <div className="text-sm font-semibold" data-testid="text-followers">
                    {formatCount(followCount)}
                  </div>
                </div>
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="text-xs text-muted-foreground">Monthly listeners</div>
                  <div className="text-sm font-semibold" data-testid="text-monthly">
                    {formatCount(artist.monthlyListeners)}
                  </div>
                </div>
                <div className="glass rounded-2xl px-3 py-2">
                  <div className="text-xs text-muted-foreground">Support</div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Tip jar</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                {artist.bio || "IndieWave artist sharing their latest releases and demos."}
              </p>
            </div>

            <div className="sm:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 p-5">
                <div className={cn("absolute inset-0 bg-gradient-to-br", artist.accent)} />
                <div className="absolute inset-0 opacity-60 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-foreground/90" />
                      <div className="text-sm font-semibold" data-testid="text-growth-title">
                        Growth snapshot
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-white/10 bg-white/5"
                      data-testid="button-growth-export"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      { label: "Saves", value: formatCount(artist.monthlyListeners / 10) },
                      { label: "Shares", value: formatCount(artist.followers / 5) },
                      { label: "Monthly Growth", value: "+12%" },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-3 py-2"
                        data-testid={`row-growth-${r.label.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <div className="text-sm text-foreground/90">{r.label}</div>
                        <div className="text-sm font-semibold">{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold" data-testid="text-tracks-title">
                  Tracks
                </h2>
              </div>
              <div className="mt-1 text-sm text-muted-foreground" data-testid="text-tracks-sub">
                Quick previews and share-ready cards.
              </div>
            </div>
            <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-track-count">
              {tracks.length} tracks
            </Badge>
          </div>

          <Separator className="my-4 opacity-60" />

          <div className="grid gap-3">
            {tracks.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                No tracks published yet.
              </div>
            ) : (
              tracks.map((t) => (
                <motion.div
                  layout
                  key={t.id}
                  className={cn(
                    "group glass glow noise rounded-2xl p-3 transition",
                    activeId === t.id && "ring-1 ring-primary/60",
                  )}
                  data-testid={`card-artist-track-${t.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br",
                        t.coverGradient,
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold" data-testid={`text-artist-track-title-${t.id}`}>
                        {t.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span data-testid={`text-artist-track-time-${t.id}`}>{time(t.audioDuration)}</span>
                        <span aria-hidden="true">•</span>
                        <span data-testid={`text-artist-track-plays-${t.id}`}>{formatCount(t.plays)} plays</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => setActiveId(t.id)}
                      data-testid={`button-artist-play-${t.id}`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        <div className="h-16" aria-hidden="true" />
      </div>
    </div>
  );
}
