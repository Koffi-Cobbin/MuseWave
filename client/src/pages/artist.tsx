import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AlbumCreate } from "@/components/album-create";
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
  Copy,
  Check,
  Settings,
  Eye,
  EyeOff,
  Bell,
  Disc,
  Mail,
  UserIcon,
  ListMusic,
  Clock,
  Radio,
  ChevronRight,
  Pause,
  TrendingUp,
  Calendar,
  Headphones,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track, User } from "../../../shared/schema";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type Artist = User & {
  followers: number;
  monthlyListeners: number;
  tagline?: string;
  accent?: string;
};

type Album = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  description?: string;
  coverUrl?: string;
  coverGradient?: string;
  releaseDate?: string;
  published: boolean;
  trackCount?: number;
  tracks?: Track[];
  createdAt?: string;
};

type Tab = "tracks" | "albums" | "about";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Creates a local object URL preview for an image file. */
function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <div>
        <div className="text-xs text-muted-foreground leading-none">{label}</div>
        <div className="text-sm font-semibold leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function AlbumCard({
  album,
  onPlayAll,
  onExpand,
}: {
  album: Album;
  onPlayAll: (album: Album) => void;
  onExpand: (album: Album) => void;
}) {
  const releaseYear = album.releaseDate
    ? new Date(album.releaseDate).getFullYear()
    : album.createdAt
    ? new Date(album.createdAt).getFullYear()
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group glass glow noise rounded-2xl border border-white/10 p-4 transition hover:border-white/20"
    >
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 mb-3">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br flex items-center justify-center",
              album.coverGradient || "from-emerald-400/30 to-fuchsia-500/20",
            )}
          >
            <Disc className="h-10 w-10 text-white/30" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-xl"
            onClick={() => onPlayAll(album)}
          >
            <Play className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{album.title}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {releaseYear && (
                <span className="text-xs text-muted-foreground">{releaseYear}</span>
              )}
              {releaseYear && album.genre && (
                <span className="text-xs text-muted-foreground">·</span>
              )}
              {album.genre && (
                <span className="text-xs text-muted-foreground">{album.genre}</span>
              )}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="border-white/10 bg-white/5 text-xs shrink-0"
          >
            {album.trackCount ?? album.tracks?.length ?? 0} tracks
          </Badge>
        </div>

        {album.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {album.description}
          </p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-between border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
          onClick={() => onExpand(album)}
        >
          View tracks
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function AlbumDetailSheet({
  album,
  open,
  onClose,
  onPlayTrack,
  activeTrackId,
}: {
  album: Album | null;
  open: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  activeTrackId: string | null;
}) {
  if (!album) return null;
  const tracks = album.tracks ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="w-full max-w-lg glass glow noise rounded-3xl border border-white/10 p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className={cn(
                  "h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10",
                  !album.coverUrl && "bg-gradient-to-br",
                  album.coverUrl ? "" : album.coverGradient || "from-emerald-400/30 to-fuchsia-500/20",
                )}
              >
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Disc className="h-8 w-8 text-white/30" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{album.title}</div>
                {album.genre && (
                  <Badge variant="secondary" className="mt-1 border-white/10 bg-white/5 text-xs">
                    {album.genre}
                  </Badge>
                )}
                {album.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{album.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onClose}
              >
                ✕
              </Button>
            </div>

            <Separator className="mb-4 opacity-40" />

            {/* Track list */}
            {tracks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tracks in this album yet.
              </div>
            ) : (
              <div className="grid gap-2">
                {tracks.map((t, i) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5 cursor-pointer",
                      activeTrackId === t.id && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                    onClick={() => onPlayTrack(t)}
                  >
                    <div className="text-xs text-muted-foreground w-5 text-center shrink-0">
                      {activeTrackId === t.id ? (
                        <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div
                      className={cn(
                        "h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10",
                        !t.coverUrl && "bg-gradient-to-br",
                        t.coverUrl ? "" : t.coverGradient,
                      )}
                    >
                      {t.coverUrl ? (
                        <img src={t.coverUrl} alt={t.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music2 className="h-3.5 w-3.5 text-white/30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.genre}</div>
                    </div>
                    {t.audioDuration && (
                      <div className="text-xs text-muted-foreground shrink-0">
                        {time(t.audioDuration)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArtistPage() {
  const params = useParams();
  const slug = (params as any)?.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tracks");
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [albumDetailOpen, setAlbumDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [justPlayedId, setJustPlayedId] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAlbumCreateOpen, setIsAlbumCreateOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const isOwner = authUser?.id === artist?.id;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied", description: `${type} copied to clipboard` });
  };

  const handleUpdateCredentials = async () => {
    if (!artist) return;

    // Build payload with only the fields the user actually changed.
    // Use apiRequestJson (application/json) — the backend rejects multipart.
    // apiRequestJson auto-converts camelCase → snake_case, so use camelCase keys.
    const updates: Record<string, string> = {};
    if (newUsername.trim())    updates.username    = newUsername.trim();
    if (newPassword.trim())    updates.password    = newPassword.trim();
    if (newEmail.trim())       updates.email       = newEmail.trim();
    if (newDisplayName.trim()) updates.displayName = newDisplayName.trim();
    if (newBio.trim())         updates.bio         = newBio.trim();
    // Avatar: only include if user picked a new file (sent as base64 data URL)
    // or explicitly pasted a new URL — never send the empty-string default.
    if (newAvatarFile) {
      updates.avatarUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(newAvatarFile);
      });
    } else if (newAvatarUrl.trim()) {
      updates.avatarUrl = newAvatarUrl.trim();
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: "Nothing to update", description: "Make a change first." });
      return;
    }

    try {
      // Use raw fetch so we can inspect the full error body from Django.
      // apiRequestJson swallows the detail — we need to see every field.
      const { API_BASE_URL } = await import("@/lib/apiConfig");
      const { toSnakeCaseObject, toCamelCaseObject } = await import("@/lib/caseTransform");

      const accessToken = localStorage.getItem("accessToken") ?? "";
      const snakePayload = toSnakeCaseObject(updates);

      console.log("[updateCredentials] sending payload:", JSON.stringify(snakePayload, null, 2));

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.users.update(artist.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(snakePayload),
        },
      );

      const responseBody = await response.json().catch(() => ({}));
      console.log("[updateCredentials] response status:", response.status, "body:", responseBody);

      if (!response.ok) {
        // Flatten all validation error messages into one readable string
        const detail = Object.entries(responseBody)
          .map(([field, msgs]) =>
            `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
          )
          .join(" | ");
        throw new Error(detail || `${response.status} ${response.statusText}`);
      }

      const updatedUser = toCamelCaseObject(responseBody);

      // Merge returned data back into local state (response is camelCased by apiRequestJson)
      setArtist((prev) => (prev ? { ...prev, ...updatedUser } : null));
      setIsEditingCredentials(false);
      setNewUsername(""); setNewPassword(""); setNewEmail("");
      setNewDisplayName(""); setNewBio(""); setNewAvatarUrl("");
      setNewAvatarFile(null); setAvatarPreview(null);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      toast({
        variant: "destructive",
        title: "Update failed",
        description: msg,
      });
    }
  };

  // Fetch artist data, tracks, albums
  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await apiRequestJson("GET", API_ENDPOINTS.users.byUsername(slug));
        const statsData = await apiRequestJson(
          "GET",
          API_ENDPOINTS.users.stats(userData.id),
        ).catch(() => ({ totalFollowers: 0, monthlyListeners: 0 }));

        setArtist({
          ...userData,
          followers: statsData.totalFollowers || 0,
          monthlyListeners: statsData.monthlyListeners || 0,
          tagline: userData.tagline || "Fresh sounds, new era energy",
          accent: userData.accent || "from-emerald-400/28 via-transparent to-cyan-400/22",
        });

        const [tracksData, albumsData] = await Promise.all([
          apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, {
            userId: userData.id,
            published: true,
          }),
          apiRequestJson<Album[]>("GET", API_ENDPOINTS.albums.byUser(userData.id)).catch(() => []),
        ]);

        setTracks(tracksData);

        // Enrich albums with full track data if available
        const enriched = await Promise.all(
          albumsData.map(async (album) => {
            try {
              const detail = await apiRequestJson<Album>("GET", API_ENDPOINTS.albums.byId(album.id));
              return { ...album, ...detail };
            } catch {
              return album;
            }
          }),
        );
        setAlbums(enriched);
      } catch (error) {
        console.error("Failed to fetch artist data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // Sync active player track id
  useEffect(() => {
    setActiveId(active?.id ?? null);
  }, [active]);

  const handlePlayTrack = (t: Track) => {
    if (active?.id === t.id) {
      setIsPlaying(!isPlaying);
    } else {
      setAutoPlay(true);
      setActive(t);
      setJustPlayedId(t.id);
      setTimeout(() => setJustPlayedId(null), 1000);
    }
  };

  const handlePlayAlbum = (album: Album) => {
    const albumTracks = album.tracks ?? [];
    if (albumTracks.length > 0) {
      setAutoPlay(true);
      setActive(albumTracks[0]);
      toast({
        title: `Playing: ${album.title}`,
        description: `${albumTracks.length} tracks queued`,
      });
    }
  };

  const handleExpandAlbum = async (album: Album) => {
    setActiveAlbum(album);
    setAlbumDetailOpen(true);
    // Fetch full album detail if tracks not yet loaded
    if (!album.tracks) {
      try {
        const detail = await apiRequestJson<Album>("GET", API_ENDPOINTS.albums.byId(album.id));
        const merged = { ...album, ...detail };
        setActiveAlbum(merged);
        setAlbums((prev) => prev.map((a) => (a.id === album.id ? merged : a)));
      } catch {
        /* ignore */
      }
    }
  };

  const followCount = artist ? artist.followers + (following ? 1 : 0) : 0;

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <div className="text-sm text-muted-foreground animate-pulse">Loading artist profile…</div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold">Artist not found</div>
        <Link href="/"><Button>Back to Home</Button></Link>
      </div>
    );
  }

  // ── Tabs config ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "tracks", label: "Tracks", icon: Music2, count: tracks.length },
    { key: "albums", label: "Albums", icon: Disc, count: albums.length },
    { key: "about", label: "About", icon: UserIcon },
  ];

  const displayName = artist.displayName || artist.username;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">

        {/* ── Top nav ── */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="secondary" className="border-white/10 bg-white/5" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="secondary"
                className="border-white/10 bg-white/5"
                data-testid="button-notifications"
              >
                <Bell className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Alerts</span>
              </Button>
            )}
            <Button
              variant="secondary"
              className="border-white/10 bg-white/5"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied!", description: "Artist page link copied to clipboard." });
              }}
            >
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </header>

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 mb-6"
        >
          {/* Background gradient */}
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", artist.accent)} />
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                className={cn(
                  "h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl",
                  !artist.avatarUrl && "bg-gradient-to-br",
                  artist.avatarUrl ? "" : artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
                )}
              >
                {artist.avatarUrl ? (
                  <img
                    src={artist.avatarUrl}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-primary/90 font-medium uppercase tracking-widest mb-1">
                  Artist
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {displayName}
                </h1>
                {artist.tagline && (
                  <p className="mt-1 text-sm text-white/60">{artist.tagline}</p>
                )}

                {/* Stat pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatPill icon={Users} label="Followers" value={formatCount(followCount)} />
                  <StatPill icon={Headphones} label="Monthly" value={formatCount(artist.monthlyListeners)} />
                  <StatPill icon={Music2} label="Tracks" value={tracks.length} />
                  {albums.length > 0 && (
                    <StatPill icon={Disc} label="Albums" value={albums.length} />
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                <Button
                  variant={following ? "secondary" : "default"}
                  className={cn(
                    "border-white/10",
                    following ? "bg-white/10" : "glow",
                  )}
                  onClick={() => setFollowing(!following)}
                  data-testid="button-follow"
                >
                  {following ? (
                    <><Check className="mr-2 h-4 w-4" /> Following</>
                  ) : (
                    <><Heart className="mr-2 h-4 w-4" /> Follow</>
                  )}
                </Button>

                <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="border-white/10 bg-white/10">
                      <Crown className="mr-2 h-4 w-4" />
                      Support
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle>Support {displayName}</DialogTitle>
                      <DialogDescription>Support features coming soon!</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="glass glow noise rounded-2xl p-4 text-center">
                        <Crown className="mx-auto h-8 w-8 text-primary mb-2" />
                        <div className="text-sm font-medium">Tip Jar</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Direct support for {displayName}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        Support functionality is currently in development. Check back soon!
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Owner quick actions */}
            {isOwner && (
              <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                <Dialog open={isAlbumCreateOpen} onOpenChange={setIsAlbumCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="glow">
                      <Disc className="mr-2 h-4 w-4" />
                      Create Album
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-black/95 border-white/10 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle>Create New Album</DialogTitle>
                      <DialogDescription>Group your tracks into an album.</DialogDescription>
                    </DialogHeader>
                    <AlbumCreate
                      onSuccess={() => {
                        setIsAlbumCreateOpen(false);
                        // Refresh albums
                        if (artist) {
                          apiRequestJson<Album[]>(
                            "GET",
                            API_ENDPOINTS.albums.byUser(artist.id),
                          )
                            .then(setAlbums)
                            .catch(() => {});
                        }
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5"
                  onClick={() => {
                    document
                      .getElementById("credentials-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Credentials & Settings
                </Button>

                <Link href="/upload">
                  <Button variant="outline" size="sm" className="border-white/10 bg-white/5">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upload Track
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Sticky Tabs ── */}
        <div
          ref={tabsRef}
          className="sticky top-0 z-30 mb-6 glass border-b border-white/10 -mx-4 px-4 backdrop-blur-xl"
        >
          <div className="flex gap-1 pt-2 overflow-x-auto scrollbar-none">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 sm:px-4 text-sm font-medium rounded-t-xl border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      activeTab === key
                        ? "bg-primary/20 text-primary"
                        : "bg-white/8 text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">

          {/* TRACKS TAB */}
          {activeTab === "tracks" && (
            <motion.section
              key="tracks"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {tracks.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
                  <Music2 className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  <div className="text-sm">No tracks published yet.</div>
                  {isOwner && (
                    <Link href="/upload">
                      <Button size="sm" className="mt-4">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upload your first track
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {tracks.map((t, i) => {
                    const isActive = active?.id === t.id;
                    const isCurrentlyPlaying = isActive && isPlaying;
                    return (
                      <motion.div
                        layout
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "group glass glow noise rounded-2xl p-3 transition",
                          isActive && "ring-1 ring-primary/60",
                        )}
                        data-testid={`card-artist-track-${t.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Track number / play indicator */}
                          <div className="w-5 text-center shrink-0">
                            {isActive ? (
                              <Radio className="h-3.5 w-3.5 text-primary animate-pulse mx-auto" />
                            ) : (
                              <span className="text-xs text-muted-foreground">{i + 1}</span>
                            )}
                          </div>

                          {/* Cover */}
                          <div
                            className={cn(
                              "h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10",
                              !t.coverUrl && "bg-gradient-to-br",
                              t.coverUrl ? "" : t.coverGradient,
                            )}
                            aria-hidden="true"
                          >
                            {t.coverUrl ? (
                              <img src={t.coverUrl} alt={t.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Music2 className="h-4 w-4 text-white/30" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{t.title}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {t.genre && (
                                <Badge
                                  variant="secondary"
                                  className="border-white/10 bg-white/5 text-[10px] px-1.5 py-0"
                                >
                                  {t.genre}
                                </Badge>
                              )}
                              {t.mood && (
                                <span className="text-xs text-muted-foreground">{t.mood}</span>
                              )}
                              {t.audioDuration && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {time(t.audioDuration)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-white/10"
                              onClick={() => {
                                const url = `${window.location.origin}/track/${t.id}`;
                                navigator.clipboard.writeText(url);
                                copyToClipboard(url, "Track link");
                              }}
                            >
                              {copied === "Track link" ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>

                            {isActive ? (
                              <Button
                                size="icon"
                                className="h-9 w-9 rounded-xl"
                                onClick={() => setIsPlaying(!isPlaying)}
                                data-testid={`button-artist-play-${t.id}`}
                              >
                                {isCurrentlyPlaying ? (
                                  <Pause className="h-4 w-4 fill-current" />
                                ) : (
                                  <Play className="h-4 w-4 fill-current" />
                                )}
                              </Button>
                            ) : (
                              <motion.div
                                animate={
                                  justPlayedId === t.id
                                    ? { scale: 1.2, rotate: 360 }
                                    : { scale: 1, rotate: 0 }
                                }
                                transition={{ duration: 0.5 }}
                              >
                                <Button
                                  size="icon"
                                  className="h-9 w-9 rounded-xl"
                                  onClick={() => handlePlayTrack(t)}
                                  data-testid={`button-artist-play-${t.id}`}
                                >
                                  <Play className="h-4 w-4 fill-current" />
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {/* ALBUMS TAB */}
          {activeTab === "albums" && (
            <motion.section
              key="albums"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {albums.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
                  <Disc className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  <div className="text-sm">No albums yet.</div>
                  {isOwner && (
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => setIsAlbumCreateOpen(true)}
                    >
                      <Disc className="mr-2 h-4 w-4" />
                      Create your first album
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {isOwner && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        size="sm"
                        className="glow"
                        onClick={() => setIsAlbumCreateOpen(true)}
                      >
                        <Disc className="mr-2 h-4 w-4" />
                        New Album
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {albums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                        onPlayAll={handlePlayAlbum}
                        onExpand={handleExpandAlbum}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.section>
          )}

          {/* ABOUT TAB */}
          {activeTab === "about" && (
            <motion.section
              key="about"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="grid gap-4 lg:grid-cols-2"
            >
              {/* Bio */}
              <div className="glass glow noise rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Biography</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {artist.bio || "MuseWave artist sharing their latest releases and demos."}
                </p>
              </div>

              {/* Growth snapshot */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5">
                <div className={cn("absolute inset-0 bg-gradient-to-br", artist.accent)} />
                <div className="absolute inset-0 opacity-60 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-foreground/90" />
                    <h2 className="text-sm font-semibold" data-testid="text-growth-title">
                      Growth snapshot
                    </h2>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="ml-auto border-white/10 bg-white/5 h-7 text-xs"
                      data-testid="button-growth-export"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Export
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {[
                      { label: "Saves", value: formatCount(artist.monthlyListeners / 10) },
                      { label: "Shares", value: formatCount(artist.followers / 5) },
                      { label: "Monthly Growth", value: "+12%" },
                      { label: "Track Count", value: tracks.length },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-3 py-2"
                        data-testid={`row-growth-${r.label.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <div className="text-sm text-foreground/90">{r.label}</div>
                        <div className="text-sm font-semibold">{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact / links */}
              {artist.email && (
                <div className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Contact</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{artist.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(artist.email!, "Email")}
                    >
                      {copied === "Email" ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Owner Credentials Section ── */}
        {isOwner && (
          <section
            id="credentials-section"
            className="mt-8 glass glow noise rounded-3xl border border-white/10 p-5 lg:p-6"
            data-testid="section-account-credentials"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Account Credentials</h2>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Your login information for accessing MuseWave
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-white/10 bg-white/5"
                  onClick={() => setShowCredentials(!showCredentials)}
                  data-testid="button-toggle-credentials"
                >
                  {showCredentials ? (
                    <><EyeOff className="mr-2 h-3.5 w-3.5" />Hide</>
                  ) : (
                    <><Eye className="mr-2 h-3.5 w-3.5" />Show</>
                  )}
                </Button>
                {showCredentials && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/10 bg-white/5"
                    onClick={() => setIsEditingCredentials(!isEditingCredentials)}
                    data-testid="button-edit-credentials"
                  >
                    {isEditingCredentials ? "Cancel" : <><Settings className="mr-2 h-3.5 w-3.5" />Edit</>}
                  </Button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showCredentials && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {isEditingCredentials && (
                      <>
                        <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                          <div className="text-xs text-muted-foreground mb-2">Profile Bio</div>
                          <Textarea
                            value={newBio}
                            onChange={(e) => setNewBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="bg-transparent border border-white/10 text-sm focus:outline-none w-full min-h-[100px] rounded-xl p-3"
                          />
                        </div>
                        <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                          <div className="text-xs text-muted-foreground mb-2">Profile Picture</div>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10",
                                !avatarPreview && !artist.avatarUrl && "bg-gradient-to-br",
                                avatarPreview || artist.avatarUrl
                                  ? ""
                                  : artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
                              )}
                            >
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                              ) : artist.avatarUrl ? (
                                <img src={artist.avatarUrl} alt="Current avatar" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-xl font-bold text-white">
                                    {displayName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <Label htmlFor="avatar-upload" className="cursor-pointer">
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition">
                                  Choose image…
                                </div>
                              </Label>
                              <Input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setNewAvatarFile(file);
                                    setAvatarPreview(createLocalPreview(file));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Username */}
                    <div className="glass rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground mb-1">Username</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mt-1"
                          onClick={() => copyToClipboard(artist.username, "Username")}
                        >
                          {copied === "Username" ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {isEditingCredentials ? (
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder={artist.username}
                          className="bg-transparent border-white/10 text-sm mt-1"
                        />
                      ) : (
                        <div className="text-sm font-medium">{artist.username}</div>
                      )}
                    </div>

                    {/* Email */}
                    {(artist.email || isEditingCredentials) && (
                      <div className="glass rounded-2xl p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground mb-1">Email</div>
                          {artist.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 -mt-1"
                              onClick={() => copyToClipboard(artist.email!, "Email")}
                            >
                              {copied === "Email" ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        {isEditingCredentials ? (
                          <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder={artist.email || "your@email.com"}
                            className="bg-transparent border-white/10 text-sm mt-1"
                          />
                        ) : (
                          <div className="text-sm font-medium">{artist.email || "—"}</div>
                        )}
                      </div>
                    )}

                    {/* Password */}
                    {isEditingCredentials && (
                      <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">New Password</div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="bg-transparent border-white/10 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 border border-white/10 bg-white/5 shrink-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {isEditingCredentials && (
                      <div className="sm:col-span-2 flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingCredentials(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleUpdateCredentials}>
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Spacer for PlayerBar */}
        <div className="h-28" aria-hidden="true" />
      </div>

      {/* ── Album Detail Sheet ── */}
      <AlbumDetailSheet
        album={activeAlbum}
        open={albumDetailOpen}
        onClose={() => setAlbumDetailOpen(false)}
        onPlayTrack={handlePlayTrack}
        activeTrackId={active?.id ?? null}
      />
    </div>
  );
}