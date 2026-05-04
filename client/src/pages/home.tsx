import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Flame,
  Home as HomeIcon,
  Music2,
  Pause,
  Play,
  Search,
  Sparkles,
  UploadCloud,
  LogOut,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { LoginModal } from "@/components/LoginModal";
import { AddToPlaylistButton } from "@/components/playlists/AddToPlaylistButton";
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

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-musewave">
      <div
        className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400/90 via-emerald-400/20 to-fuchsia-500/80 shadow-[0_8px_24px_-8px_rgba(16,185,129,.8)]"
        aria-hidden="true"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-semibold tracking-tight">MuseWave</div>
        <div className="truncate text-xs text-muted-foreground">music for the next fave</div>
      </div>
    </div>
  );
}

// ─── Login Dialog ─────────────────────────────────────────────────────────────

function LoginDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        className="glow shrink-0"
        data-testid="button-open-login"
        onClick={() => setOpen(true)}
      >
        Log in
      </Button>
      <LoginModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function SidebarNav({ onMobileClose }: { onMobileClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const items = [
    { href: "/", label: "Home", icon: HomeIcon, testId: "link-nav-home" },
    { href: "/discover", label: "Discover", icon: Compass, testId: "link-nav-discover" },
    { href: "/upload", label: "Upload", icon: UploadCloud, testId: "link-nav-upload" },
  ];

  const authenticatedItems = [
    { href: "/playlists", label: "My Playlists", icon: Music2, testId: "link-nav-playlists" },
  ];

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out", description: "You've been successfully logged out." });
    onMobileClose?.();
  };

  return (
    <div className="glass glow noise h-full rounded-2xl p-4 lg:h-auto">
      <div className="flex items-center justify-between lg:block">
        <Logo />
        {onMobileClose && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileClose} data-testid="button-close-nav">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Separator className="my-4 opacity-60" />

      <nav className="grid gap-1">
        {items.map((it) => {
          const active = it.href === "/" ? location === "/" : !it.href.includes("#") && location.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.label} href={it.href}>
              <a
                data-testid={it.testId}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                  "hover:bg-white/5 hover:border-white/10 border border-transparent",
                  active && "bg-white/6 border-white/10",
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-foreground/80 group-hover:text-foreground" />
                <span className="font-medium">{it.label}</span>
              </a>
            </Link>
          );
        })}
        {isAuthenticated && authenticatedItems.map((it) => {
          const active = it.href === "/" ? location === "/" : !it.href.includes("#") && location.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.label} href={it.href}>
              <a
                data-testid={it.testId}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                  "hover:bg-white/5 hover:border-white/10 border border-transparent",
                  active && "bg-white/6 border-white/10",
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-foreground/80 group-hover:text-foreground" />
                <span className="font-medium">{it.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4 opacity-60" />

      {isAuthenticated && user && (
        <Link href={`/artist/${user.username}`}>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/4 p-3 cursor-pointer hover:bg-white/6 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" data-testid="text-user-name">{user.displayName || user.username}</div>
                <div className="truncate text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {isAuthenticated ? (
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      ) : (
        <LoginDialog onSuccess={onMobileClose} />
      )}
    </div>
  );
}

// ─── Track Card ──────────────────────────────────────────────────────────────

function TrackCard({ track, onPlay, isActive }: { track: Track; onPlay: (t: Track) => void; isActive: boolean }) {
  const { isPlaying } = usePlayer();
  const isActiveAndPlaying = isActive && isPlaying;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "group glass glow noise overflow-hidden rounded-2xl p-3 sm:p-4 transition-all",
        isActive && "ring-1 ring-primary/60 bg-primary/5"
      )}
      data-testid={`card-track-${track.id}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Cover — bigger on mobile */}
        <div
          className={cn(
            "relative h-14 w-14 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl border border-white/10",
            !track.coverUrl && "bg-gradient-to-br",
            track.coverUrl ? "" : track.coverGradient,
          )}
          aria-hidden="true"
        >
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={`${track.title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-50 blur-[10px]" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-base font-semibold leading-tight" data-testid={`text-track-title-${track.id}`}>
            {track.title}
          </div>
          <Link href={`/artist/${track.artistSlug}`}>
            <a className="mt-1 flex min-w-0 max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid={`link-track-artist-${track.id}`}>
              <Music2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{track.artist}</span>
            </a>
          </Link>
        </div>

        {/* Meta + Play */}
        <div className="flex shrink-0 items-center gap-2">
          {track.audioDuration ? (
            <span className="hidden text-xs text-muted-foreground sm:block">{secondsToTime(track.audioDuration)}</span>
          ) : null}
          {/* Play button — larger touch target on mobile */}
          <Button
            size="icon"
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "h-10 w-10 sm:h-9 sm:w-9 shrink-0 rounded-xl border-white/10 bg-white/5",
              isActive && "bg-primary glow"
            )}
            onClick={() => onPlay(track)}
            data-testid={`button-play-${track.id}`}
          >
            {isActiveAndPlaying
              ? <Pause className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              : <Play className="h-4 w-4 sm:h-3.5 sm:w-3.5 translate-x-px" />
            }
          </Button>
          <AddToPlaylistButton trackId={track.id} size="sm" variant="secondary" />
        </div>
      </div>

      {/* Genre tag */}
      {track.genre && (
        <div className="mt-2 pl-[68px] sm:pl-[60px]">
          <Badge variant="secondary" className="border-white/10 bg-white/5 px-2 py-0.5 text-xs font-normal">
            {track.genre}
          </Badge>
        </div>
      )}
    </motion.div>
  );
}

// ─── Artist Row ───────────────────────────────────────────────────────────────

function ArtistRow({ artist }: { artist: ArtistRowData }) {
  return (
    <Link href={`/artist/${artist.slug}`}>
      <a
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
          <div className="text-[10px] text-muted-foreground/60 leading-none">followers</div>
        </div>
      </a>
    </Link>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

const HOME_TRACK_LIMIT = 4;

export default function Home() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<ArtistRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const featuredTrack = useMemo(() => {
    if (tracks.length === 0) return null;
    const sorted = [...tracks].sort((a, b) => {
      const dateA = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
    return sorted[0];
  }, [tracks]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [tracksData, rawArtists] = await Promise.all([
          apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, { published: true }),
          apiRequestJson<any[]>("GET", API_ENDPOINTS.artists.list).catch(() => []),
        ]);
        if (mounted) {
          setTracks(Array.isArray(tracksData) ? tracksData : []);
          const normalized: ArtistRowData[] = (Array.isArray(rawArtists) ? rawArtists : []).map((a) => ({
            slug: a.username ?? a.slug ?? "",
            name: a.displayName ?? a.display_name ?? a.name ?? a.username ?? "",
            tagline: a.tagline ?? a.bio ?? "",
            followers: a.totalFollowers ?? a.followers ?? 0,
            monthlyListeners: a.monthlyListeners ?? 0,
            accent: a.accent ?? "",
            avatarUrl: a.avatarUrl ?? a.avatar_url ?? undefined,
          }));
          setArtists(normalized);
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
    if (!q) return tracks;
    return tracks.filter((t) =>
      `${t.title} ${t.artist} ${t.genre ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, tracks]);

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
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">

          {/* ── Desktop Sidebar ── */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6">
              <SidebarNav />
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="min-w-0 lg:col-span-9">

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
              {/* Search — full width on mobile */}
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

            {/* ── Hero — Featured Track ── */}
            {!query && featuredTrack && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="glass glow noise mb-5 overflow-hidden rounded-2xl border border-white/10 sm:mb-6"
                aria-label="Hero"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5 lg:p-6">
                  {/* Cover art — taller on mobile for visual impact */}
                  <div
                    className={cn(
                      "relative h-40 w-full overflow-hidden rounded-xl border border-white/10 sm:h-28 sm:w-28 sm:shrink-0",
                      !featuredTrack.coverUrl && "bg-gradient-to-br",
                      featuredTrack.coverUrl ? "" : featuredTrack.coverGradient,
                    )}
                  >
                    {featuredTrack.coverUrl && (
                      <img src={featuredTrack.coverUrl} alt={`${featuredTrack.title} cover`} className="h-full w-full object-cover" />
                    )}
                    {/* Play overlay on mobile cover */}
                    <div className="absolute inset-0 flex items-center justify-center sm:hidden">
                      <Button
                        size="icon"
                        className="h-14 w-14 rounded-full bg-background/50 backdrop-blur-md hover:bg-background/70"
                        onClick={() => handlePlay(featuredTrack)}
                        data-testid="button-hero-play"
                      >
                        {active?.id === featuredTrack.id && isPlaying ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 translate-x-px" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-white/10 bg-white/5 text-xs" variant="secondary" data-testid="badge-new">
                        <Sparkles className="mr-1 h-3 w-3" />
                        New
                      </Badge>
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">Featured release</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl" data-testid="text-featured-title">
                      {featuredTrack.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" data-testid="text-featured-description">
                      {featuredTrack.description || `The latest from ${featuredTrack.artist}.`}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {/* Desktop play button */}
                      <Button
                        size="sm"
                        className="glow hidden h-9 sm:flex"
                        onClick={() => handlePlay(featuredTrack)}
                        data-testid="button-hero-play-desktop"
                      >
                        {active?.id === featuredTrack.id && isPlaying ? (
                          <><Pause className="mr-1.5 h-4 w-4" /> Pause</>
                        ) : (
                          <><Play className="mr-1.5 h-4 w-4 translate-x-px" /> Play</>
                        )}
                      </Button>
                      <Link href={`/artist/${featuredTrack.artistSlug}`}>
                        <a className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-featured-artist">
                          <Music2 className="h-4 w-4" />
                          {featuredTrack.artist}
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.section>
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
                    <Link href="/discover">
                      <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-see-all-tracks">
                        See all <ArrowRight className="h-4 w-4" />
                      </a>
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
                      {previewTracks.map((track) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          onPlay={handlePlay}
                          isActive={active?.id === track.id}
                        />
                      ))}
                      {hasMore && (
                        <Link href={query ? `/discover?q=${encodeURIComponent(query)}` : "/discover"}>
                          <div
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-sm text-muted-foreground transition hover:border-white/25 hover:bg-white/5 hover:text-foreground"
                            data-testid="link-browse-all-tracks"
                          >
                            <Compass className="h-4 w-4 shrink-0" />
                            <span className="truncate">Browse all {filteredTracks.length} tracks on Discover</span>
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
                    {query ? "Matching Artists" : "Trending"}
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

                {/* Upload CTA */}
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

            {/* Spacer for player bar + bottom nav */}
            <div className="h-32 lg:h-24" aria-hidden="true" />
          </main>
        </div>
      </div>
    </div>
  );
}