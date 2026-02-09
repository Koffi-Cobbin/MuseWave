import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Bell,
  Compass,
  Flame,
  Home as HomeIcon,
  Music2,
  Play,
  Pause,
  Search,
  Sparkles,
  UploadCloud,
  Users,
  LogIn,
  LogOut,
  User as UserIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track, User } from "../../../shared/schema";

type Artist = {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  coverGradient: string;
  genre: string;
  mood?: string;
  audioDuration: number;
  plays: number;
  publishedAt?: string;
  audioUrl?: string;
  coverUrl?: string;
};

type ArtistRowData = {
  slug: string;
  name: string;
  tagline: string;
  followers: number;
  monthlyListeners: number;
  accent: string;
  avatarUrl?: string;
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function secondsToTime(duration: number) {
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  const s = `${sec}`.padStart(2, "0");
  return `${min}:${s}`;
}

function timeAgo(dateString?: string) {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

function Logo() {
  return (
    <div className="flex items-center gap-2" data-testid="brand-indiewave">
      <div
        className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400/90 via-emerald-400/20 to-fuchsia-500/80 shadow-[0_12px_40px_-24px_rgba(16,185,129,.9)]"
        aria-hidden="true"
      />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">IndieWave</div>
        <div className="text-xs text-muted-foreground">music for the next favorite</div>
      </div>
    </div>
  );
}

function LoginDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      setOpen(false);
      setUsername("");
      setPassword("");
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full justify-start"
          variant="ghost"
          data-testid="button-login"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Log in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>
            Log in to your IndieWave account to upload music and connect with listeners.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:gap-4">
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              required
              disabled={isLoading}
              data-testid="input-login-username"
            />
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                data-testid="input-login-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isLoading} data-testid="button-submit-login">
              {isLoading ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log in
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Demo: Use username "koffi-cobbin" from the database
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SidebarNav({ onMobileClose }: { onMobileClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const items = [
    { href: "/", label: "Home", icon: HomeIcon, testId: "link-nav-home" },
    {
      href: "/#discover",
      label: "Discover",
      icon: Compass,
      testId: "link-nav-discover",
    },
    {
      href: "/#community",
      label: "Community",
      icon: Users,
      testId: "link-nav-community",
    },
    {
      href: "/upload",
      label: "Upload",
      icon: UploadCloud,
      testId: "link-nav-upload",
    },
  ];

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
    onMobileClose?.();
  };

  return (
    <div className="glass glow noise h-full rounded-2xl p-4 lg:h-auto">
      <div className="flex items-center justify-between lg:block">
        <Logo />
        {onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileClose}
            data-testid="button-close-nav"
          >
            <Sparkles className="h-5 w-5 rotate-45" />
          </Button>
        )}
      </div>

      <Separator className="my-4 opacity-60" />

      <nav className="grid gap-1">
        {items.map((it) => {
          const active = it.href === "/" ? location === "/" : false;
          const Icon = it.icon;
          return (
            <a
              key={it.label}
              href={it.href}
              data-testid={it.testId}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "hover:bg-white/5 hover:border-white/10 border border-transparent",
                active && "bg-white/6 border-white/10",
              )}
            >
              <Icon className="h-4 w-4 text-foreground/80 group-hover:text-foreground" />
              <span className="font-medium">{it.label}</span>
            </a>
          );
        })}
      </nav>

      <Separator className="my-4 opacity-60" />

      {isAuthenticated && user && (
        <>
          <Link href={`/artist/${user.username}`}>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/4 p-3 cursor-pointer hover:bg-white/6 transition">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" data-testid="text-user-name">
                    {user.displayName || user.username}
                  </div>
                  <div className="truncate text-xs text-muted-foreground" data-testid="text-user-email">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </>
      )}

      {isAuthenticated ? (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      ) : (
        <LoginDialog onSuccess={onMobileClose} />
      )}
    </div>
  );
}

function TopBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1
          className="text-balance text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl xl:text-3xl"
          data-testid="text-title"
        >
          Discover indie music, fast.
        </h1>
        <p
          className="mt-1 text-xs text-muted-foreground sm:text-sm"
          data-testid="text-subtitle"
        >
          A simple platform for beginner and indie artists to upload music, share releases, and
          grow an audience.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-[280px] lg:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tracks, artists, vibes…"
            className="pl-9 text-sm"
            data-testid="input-search"
          />
        </div>
      </div>
    </div>
  );
}

function TrackCard({
  track,
  onPlay,
  isActive,
}: {
  track: Track;
  onPlay: (t: Track) => void;
  isActive: boolean;
}) {
  const [justPlayed, setJustPlayed] = useState(false);

  const handlePlay = () => {
    onPlay(track);
    setJustPlayed(true);
    setTimeout(() => setJustPlayed(false), 1000);
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      className={cn(
        "group glass glow noise rounded-2xl p-3 transition",
        isActive && "ring-1 ring-primary/60",
      )}
      data-testid={`card-track-${track.id}`}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10",
            !track.coverUrl && "bg-gradient-to-br",
            track.coverUrl ? "" : track.coverGradient,
          )}
          aria-hidden="true"
        >
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={`${track.title} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-50 blur-[10px]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="truncate text-sm font-semibold"
                data-testid={`text-track-title-${track.id}`}
              >
                {track.title}
              </div>
              <Link href={`/artist/${track.artistSlug}`}>
                <a
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`link-track-artist-${track.id}`}
                >
                  <Music2 className="h-3.5 w-3.5" />
                  <span className="truncate">{track.artist}</span>
                </a>
              </Link>
            </div>

            {isActive ? (
              <Badge variant="secondary" className="border-white/10 bg-primary/20 text-primary px-3 py-1">
                Playing
              </Badge>
            ) : (
              <motion.div
                animate={justPlayed ? { scale: 1.2, rotate: 360 } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={handlePlay}
                  data-testid={`button-play-${track.id}`}
                >
                  <Play className="h-4 w-4 fill-current" />
                </Button>
              </motion.div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border-white/10 bg-white/5">
              {track.genre}
            </Badge>
            {track.mood && (
              <Badge variant="outline" className="border-white/12 bg-transparent">
                {track.mood}
              </Badge>
            )}
            <span
              className="ml-auto text-xs text-muted-foreground"
              data-testid={`text-track-meta-${track.id}`}
            >
              {secondsToTime(track.audioDuration)} • {formatCount(track.plays)} plays
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ArtistRow({ artist }: { artist: ArtistRowData }) {
  return (
    <Link href={`/artist/${artist.slug}`}>
      <a
        className="group glass glow noise flex items-center justify-between rounded-2xl p-3 transition hover:translate-y-[-2px]"
        data-testid={`row-artist-${artist.slug}`}
      >
        <div className="flex min-w-0 items-center gap-3">         
          <div
            className={cn(
              "h-12 w-12 shrink-0 rounded-2xl border border-white/10 overflow-hidden",
              !artist.avatarUrl && "bg-gradient-to-br",
              !artist.avatarUrl && artist.accent,
            )}
            aria-hidden="true"
          >
            {artist.avatarUrl ? (
              <img
                src={artist.avatarUrl}
                alt={`${artist.name} profile`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" data-testid={`text-artist-name-${artist.slug}`}>
              {artist.name}
            </div>
            <div className="truncate text-xs text-muted-foreground" data-testid={`text-artist-tagline-${artist.slug}`}>
              {artist.tagline}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground" data-testid={`text-artist-followers-${artist.slug}`}>
            {formatCount(artist.followers)} followers
          </div>
          <div className="text-xs text-muted-foreground/80" data-testid={`text-artist-listeners-${artist.slug}`}>
            {formatCount(artist.monthlyListeners)} monthly
          </div>
        </div>
      </a>
    </Link>
  );
}


export default function Home() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<ArtistRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { active, setActive, setAutoPlay } = usePlayer();

  useEffect(() => {
    async function fetchTracks() {
      try {
        const data = await apiRequestJson<Track[]>(
          'GET',
          API_ENDPOINTS.tracks.list,
          undefined,
          { published: true }
        );
        setTracks(data);
      } catch (error) {
        console.error("Failed to fetch tracks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
  }, []);

  useEffect(() => {
    async function fetchArtists() {
      try {
        const data = await apiRequestJson<User[]>('GET', API_ENDPOINTS.artists.list);

        const mappedArtists: ArtistRowData[] = await Promise.all(data.map(async (user: any) => {
          const followers = await apiRequestJson<any[]>(
            'GET',
            API_ENDPOINTS.follows.followers(user.id)
          ).catch(() => []);

          const plays = await apiRequestJson<any[]>(
            'GET',
            API_ENDPOINTS.plays.byUser(user.id)
          ).catch(() => []);

          return {
            slug: user.username,
            name: user.displayName,
            tagline: user.bio || "Indie artist",
            followers: followers.length,
            monthlyListeners: plays.length,
            accent: "from-emerald-400/30 via-emerald-400/0 to-fuchsia-500/20",
            avatarUrl: user.avatarUrl,
          };
        }));
        setArtists(mappedArtists);
      } catch (error) {
        console.error("Failed to fetch artists:", error);
      }
    }
    fetchArtists();
  }, []);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => {
      const hay = `${t.title} ${t.artist} ${t.genre} ${t.mood || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, tracks]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => {
      const hay = `${a.name} ${a.tagline}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, artists]);

  return (
    <div className="min-h-screen bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-2 py-3 sm:px-3 sm:py-4 lg:px-4 lg:py-6 xl:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="fixed bottom-24 right-4 z-50 lg:hidden">
            <Button
              size="icon"
              className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20"
              onClick={() => setIsSidebarOpen(true)}
              data-testid="button-toggle-nav"
            >
              <HomeIcon className="h-6 w-6" />
            </Button>
          </div>

          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                className="h-full w-4/5 max-w-xs p-4"
              >
                <SidebarNav onMobileClose={() => setIsSidebarOpen(false)} />
              </motion.div>
              <div className="absolute inset-0 -z-10" onClick={() => setIsSidebarOpen(false)} />
            </div>
          )}

          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6">
              <SidebarNav />
            </div>
          </aside>

          <main className="lg:col-span-9">
            <TopBar query={query} onQueryChange={setQuery} />

            <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:gap-6">
              {!query && (
                <section
                  className="glass glow noise overflow-hidden rounded-2xl border border-white/10 sm:rounded-3xl"
                  aria-label="Hero"
                >
                  <div className="grid gap-3 p-3 sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-4 lg:p-5 xl:p-6">
                    <div className="sm:col-span-7">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="border-white/10 bg-white/5 text-xs"
                          variant="secondary"
                          data-testid="badge-new"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          New
                        </Badge>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                          Featured release
                        </span>
                      </div>
                      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
                        Midnight in Lagos
                      </h2>
                      <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm lg:text-base">
                        The latest project from emergent afro-fusion artists. 12 tracks of pure wave.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
                        <Button className="h-9 px-4 sm:h-11 sm:px-6 sm:text-base" data-testid="button-play-featured">
                          <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                          Listen Now
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-9 border-white/10 bg-white/5 px-4 sm:h-11 sm:px-6 sm:text-base"
                          data-testid="button-view-featured"
                        >
                          View Album
                        </Button>
                      </div>
                    </div>
                    <div className="hidden sm:col-span-5 sm:block">
                      <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-400/30 via-fuchsia-500/20 to-cyan-400/40 p-1 shadow-2xl shadow-emerald-500/10">
                        <div className="h-full w-full rounded-xl bg-background/20 backdrop-blur-md border border-white/5" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-lg font-semibold" data-testid="text-discover-title">
                        {query ? `Search results for "${query}"` : "Discover now"}
                      </h2>
                    </div>
                    <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-track-count">
                      {filteredTracks.length} tracks
                    </Badge>
                  </div>
                  <div id="discover" className="mt-4 grid gap-3 scroll-mt-20">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white/5" />
                      ))
                    ) : filteredTracks.length > 0 ? (
                      filteredTracks.map((track) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          onPlay={(t) => {
                            setAutoPlay(true);
                            setActive(t);
                          }}
                          isActive={active?.id === track.id}
                        />
                      ))
                    ) : (
                      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                        No tracks found matching your search.
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-fuchsia-500" />
                    <h2 className="text-lg font-semibold" data-testid="text-trending-title">
                      {query ? "Matching Artists" : "Trending in community"}
                    </h2>
                  </div>
                  <div id="community" className="mt-4 grid gap-3 scroll-mt-20">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/5" />
                      ))
                    ) : filteredArtists.length > 0 ? (
                      filteredArtists.slice(0, 6).map((artist) => (
                        <ArtistRow key={artist.slug} artist={artist} />
                      ))
                    ) : (
                      <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
                        No artists match your search.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
        <div className="h-24" aria-hidden="true" />
      </div>
    </div>
  );
}
