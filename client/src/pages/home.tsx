import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Bell,
  Compass,
  Flame,
  Home as HomeIcon,
  Music2,
  Play,
  Search,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Track = {
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
};

type Artist = {
  slug: string;
  name: string;
  tagline: string;
  followers: number;
  monthlyListeners: number;
  accent: string;
};

const mockArtists: Artist[] = [
  {
    slug: "nova-sky",
    name: "Nova Sky",
    tagline: "glitter-pop with midnight drums",
    followers: 12840,
    monthlyListeners: 54700,
    accent: "from-emerald-400/30 via-emerald-400/0 to-fuchsia-500/20",
  },
  {
    slug: "cassette-ghost",
    name: "Cassette Ghost",
    tagline: "lo-fi memories, high-voltage hooks",
    followers: 7800,
    monthlyListeners: 22100,
    accent: "from-fuchsia-500/25 via-fuchsia-500/0 to-cyan-400/20",
  },
  {
    slug: "afterglow-park",
    name: "Afterglow Park",
    tagline: "indie rock for late trains",
    followers: 19200,
    monthlyListeners: 80300,
    accent: "from-cyan-400/25 via-cyan-400/0 to-emerald-400/15",
  },
];

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

function SidebarNav({ onMobileClose }: { onMobileClose?: () => void }) {
  const [location] = useLocation();

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

      <div className="mt-4 rounded-xl border border-white/10 bg-white/4 p-3">
        <div className="text-xs text-muted-foreground" data-testid="text-tip">
          Tip
        </div>
        <div className="mt-1 text-sm leading-snug text-foreground/90">
          Upload a demo, get a shareable artist page, and start building your audience.
        </div>
        <div className="mt-3">
          <Link href="/upload">
            <Button
              size="sm"
              className="w-full"
              onClick={onMobileClose}
              data-testid="button-sidebar-upload"
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload a track
            </Button>
          </Link>
        </div>
      </div>
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
          className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
          data-testid="text-title"
        >
          Discover indie music, fast.
        </h1>
        <p
          className="mt-1 text-sm text-muted-foreground"
          data-testid="text-subtitle"
        >
          A simple platform for beginner and indie artists to upload music, share releases, and
          grow an audience.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tracks, artists, vibes…"
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Button
          variant="secondary"
          className="hidden sm:inline-flex"
          data-testid="button-notifications"
        >
          <Bell className="mr-2 h-4 w-4" />
          Alerts
        </Button>
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
            "bg-gradient-to-br",
            track.coverGradient,
          )}
          aria-hidden="true"
        >
          <div className="absolute inset-0 opacity-50 blur-[10px]" />
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

            <Button
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => onPlay(track)}
              data-testid={`button-play-${track.id}`}
            >
              <Play className="h-4 w-4 fill-current" />
            </Button>
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

function ArtistRow({ artist }: { artist: Artist }) {
  return (
    <Link href={`/artist/${artist.slug}`}>
      <a
        className="group glass glow noise flex items-center justify-between rounded-2xl p-3 transition hover:translate-y-[-2px]"
        data-testid={`row-artist-${artist.slug}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br",
              artist.accent,
            )}
            aria-hidden="true"
          />
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

function PlayerBar({
  active,
  onClear,
}: {
  active: Track | null;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-gradient-to-br",
                active ? active.coverGradient : "from-white/10 via-white/0 to-white/10",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" data-testid="text-player-title">
                {active ? active.title : "Nothing playing"}
              </div>
              <div className="truncate text-xs text-muted-foreground" data-testid="text-player-artist">
                {active ? active.artist : "Pick a track to preview"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="hidden sm:inline-flex"
              data-testid="button-player-discover"
              asChild
            >
              <a href="#discover">Discover</a>
            </Button>
            <Button
              variant="ghost"
              onClick={onClear}
              disabled={!active}
              data-testid="button-player-clear"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchTracks() {
      try {
        const response = await fetch("/api/tracks?published=true");
        if (response.ok) {
          const data = await response.json();
          setTracks(data);
        }
      } catch (error) {
        console.error("Failed to fetch tracks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => {
      const hay = `${t.title} ${t.artist} ${t.genre} ${t.mood || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, tracks]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Mobile Toggle */}
          <div className="fixed bottom-20 right-4 z-50 lg:hidden">
            <Button
              size="icon"
              className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20"
              onClick={() => setIsSidebarOpen(true)}
              data-testid="button-toggle-nav"
            >
              <HomeIcon className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile Sidebar Overlay */}
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

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6">
              <SidebarNav />
            </div>
          </aside>

          <main className="lg:col-span-9">
            <TopBar query={query} onQueryChange={setQuery} />

            <div className="mt-6 grid gap-6">
              <section
                className="glass glow noise overflow-hidden rounded-3xl border border-white/10"
                aria-label="Hero"
              >
                <div className="grid gap-4 p-5 sm:grid-cols-12 sm:items-center sm:p-6">
                  <div className="sm:col-span-7">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="border-white/10 bg-white/5"
                        variant="secondary"
                        data-testid="badge-new"
                      >
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        New
                      </Badge>
                      <span className="text-xs text-muted-foreground" data-testid="text-hero-note">
                        Built for beginners, designed for listeners.
                      </span>
                    </div>
                    <h2
                      className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
                      data-testid="text-hero-title"
                    >
                      Upload a track. Get discovered.
                      <span className="text-primary"> Build your audience.</span>
                    </h2>
                    <p
                      className="mt-2 max-w-xl text-sm text-muted-foreground"
                      data-testid="text-hero-description"
                    >
                      IndieWave is a free, simple platform where artists share demos, fans find
                      new sounds, and everyone helps the next release take off.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link href="/upload">
                        <Button data-testid="button-hero-upload">
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Upload music
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        className="border-white/10 bg-white/5"
                        data-testid="button-hero-discover"
                        asChild
                      >
                        <a href="#discover">
                          <Compass className="mr-2 h-4 w-4" />
                          Discover artists
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="sm:col-span-5">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/0 to-white/8 p-4">
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/25 blur-3xl" />
                      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />

                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            <div className="text-xs text-muted-foreground">Trending in community</div>
                          </div>
                          <Badge variant="outline" className="border-white/12">
                            Live
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-2">
                          {loading ? (
                            <div className="text-xs text-muted-foreground animate-pulse">Loading trending...</div>
                          ) : (
                            tracks.slice(0, 3).map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setActive(t)}
                                className={cn(
                                  "w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-left transition",
                                  "hover:bg-white/6",
                                  active?.id === t.id && "bg-white/6 border-primary/40",
                                )}
                                data-testid={`button-mini-track-${t.id}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold">{t.title}</div>
                                    <div className="truncate text-[11px] text-muted-foreground">
                                      {t.artist} • {timeAgo(t.publishedAt)}
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {secondsToTime(t.audioDuration)}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="discover" aria-label="Discover" className="scroll-mt-24">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold" data-testid="text-section-discover">
                        Discover now
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground" data-testid="text-section-discover-sub">
                      Fresh uploads with quick previews.
                    </p>
                  </div>
                  <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-count">
                    {filtered.length} tracks
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  {loading ? (
                    <div className="glass glow noise rounded-2xl p-6 text-center animate-pulse">
                      <div className="text-sm text-muted-foreground">Finding fresh sounds...</div>
                    </div>
                  ) : (
                    filtered.map((t) => (
                      <TrackCard
                        key={t.id}
                        track={t}
                        onPlay={(trk) => setActive(trk)}
                        isActive={active?.id === t.id}
                      />
                    ))
                  )}

                  {!loading && filtered.length === 0 && (
                    <div
                      className="glass glow noise rounded-2xl p-6 text-center"
                      data-testid="status-empty-search"
                    >
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="mt-3 text-sm font-medium">No tracks found</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Try a different search or genre.
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section aria-label="Artists">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-lg font-semibold" data-testid="text-section-artists">
                      Artists to watch
                    </h3>
                  </div>
                  <Button
                    variant="secondary"
                    className="border-white/10 bg-white/5"
                    data-testid="button-community-refresh"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {mockArtists.map((a) => (
                    <ArtistRow key={a.slug} artist={a} />
                  ))}
                </div>

                <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/6 via-white/2 to-transparent p-5 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-8">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold" data-testid="text-community-cta-title">
                        Build an audience—without the noise.
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground" data-testid="text-community-cta-sub">
                      Share your link, track followers, and connect with listeners who love discovering.
                    </div>
                  </div>
                  <div className="sm:col-span-4 sm:flex sm:justify-end">
                    <Link href="/upload">
                      <Button data-testid="button-community-upload">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload now
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>

        <div className="h-24" aria-hidden="true" />
      </div>

      <PlayerBar active={active} onClear={() => setActive(null)} />
    </div>
  );
}
