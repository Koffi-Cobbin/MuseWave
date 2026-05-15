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
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  BadgeCheck,
  X,
  MapPin,
  Globe,
  Link2,
} from "lucide-react";
import { SiSpotify, SiSoundcloud, SiX, SiInstagram } from "react-icons/si";
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
import { usePlaylists } from "@/contexts/playlist-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track, User } from "../../../shared/schema";
import { Label } from "@/components/ui/label";
import { TrackCard } from "@/components/TrackCard";
import type { Playlist } from "../../../shared/schema";


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

type Tab = "tracks" | "albums" | "playlists" | "about";

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

function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
      <Icon className="h-3 w-3 shrink-0 text-primary/80" />
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}

// ─── Resend Verification Banner ───────────────────────────────────────────────

function ResendVerificationBanner({ artist }: { artist: Artist }) {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // The /api/users/username/<slug> endpoint doesn't return sensitive fields like
  // email. Fall back to auth context, then localStorage (saved during login).
  const userEmail = authUser?.email ?? artist.email ?? localStorage.getItem("userEmail");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (sending || cooldown > 0) return;
    if (!userEmail) return;
    setSending(true);
    try {
      await apiRequestJson("POST", API_ENDPOINTS.users.resendVerification, { email: userEmail });
      setSent(true);
      setCooldown(60);
      toast({
        title: "Verification email sent!",
        description: `We've sent a new verification link to ${userEmail}.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't send email",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-200">Email not verified</p>
        <p className="mt-0.5 text-xs text-amber-300/60">
          Verify your email to unlock full artist features.
          {userEmail && (
            <> Sent to <span className="font-medium text-amber-300">{userEmail}</span>.</>
          )}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleResend}
        disabled={sending || cooldown > 0}
        className="shrink-0 border border-amber-400/25 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:text-amber-200 disabled:opacity-50"
        data-testid="button-resend-verification"
      >
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : sent && cooldown > 0 ? (
          <><Check className="mr-1.5 h-3.5 w-3.5" />Sent ({cooldown}s)</>
        ) : (
          <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Resend</>
        )}
      </Button>
    </motion.div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function ArtistHero({
  artist,
  tracks,
  albums,
  followCount,
  following,
  followLoading,
  onToggleFollow,
  isOwner,
  supportOpen,
  setSupportOpen,
  isAlbumCreateOpen,
  setIsAlbumCreateOpen,
  showCredentials,
  setShowCredentials,
  isEditingCredentials,
  setIsEditingCredentials,
  displayName,
}: {
  artist: Artist;
  tracks: Track[];
  albums: Album[];
  followCount: number;
  following: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
  isOwner: boolean;
  supportOpen: boolean;
  setSupportOpen: (v: boolean) => void;
  isAlbumCreateOpen: boolean;
  setIsAlbumCreateOpen: (v: boolean) => void;
  showCredentials: boolean;
  setShowCredentials: (v: boolean) => void;
  isEditingCredentials: boolean;
  setIsEditingCredentials: (v: boolean) => void;
  displayName: string;
}) {
  const { toast } = useToast();

  // Derive a vivid gradient from artist accent or default
  const accentGradient = artist.accent || "from-emerald-500/40 via-cyan-500/20 to-fuchsia-500/30";

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative mb-8 overflow-hidden rounded-3xl border border-white/10"
      style={{ minHeight: 300 }}
    >
      {/* ── Layered background ── */}
      {/* Base gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", accentGradient)} />
      {/* Dark scrim for readability */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-60 w-60 rounded-full bg-fuchsia-500/15 blur-3xl" />

      {/* Cover art full bleed (if available) */}
      {artist.avatarUrl && (
        <div className="absolute inset-0">
          <img
            src={artist.avatarUrl}
            alt=""
            className="h-full w-full object-cover opacity-15 blur-xl scale-110"
            aria-hidden="true"
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 20 }}
            className="relative shrink-0 self-start sm:self-auto"
          >
            <div
              className={cn(
                "h-28 w-28 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl sm:h-36 sm:w-36",
                !artist.avatarUrl && "bg-gradient-to-br",
                artist.avatarUrl ? "" : accentGradient,
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
                  <span className="text-5xl font-black text-white/80 select-none">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {/* Verified badge */}
            {artist.verified && (
              <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary shadow-lg">
                <BadgeCheck className="h-4 w-4 text-white" />
              </div>
            )}
          </motion.div>

          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="min-w-0 flex-1"
          >
            {/* Label */}
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                Artist
              </span>
              {artist.verified && (
                <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              {displayName}
            </h1>

            {/* Tagline */}
            {artist.tagline && (
              <p className="mt-1.5 text-sm text-white/55 sm:text-base">{artist.tagline}</p>
            )}

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap gap-2">
              <StatPill icon={Users} label={followCount === 1 ? "follower" : "followers"} value={formatCount(followCount)} />
              <StatPill icon={Headphones} label="monthly" value={formatCount(artist.monthlyListeners)} />
              <StatPill icon={Music2} label={tracks.length === 1 ? "track" : "tracks"} value={tracks.length} />
              {albums.length > 0 && (
                <StatPill icon={Disc} label={albums.length === 1 ? "album" : "albums"} value={albums.length} />
              )}
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end"
          >
            <Button
              type="button"
              variant={following ? "secondary" : "default"}
              className={cn(
                "border-white/15 backdrop-blur-sm",
                following ? "bg-white/10 hover:bg-white/15" : "glow",
              )}
              onClick={onToggleFollow}
              disabled={followLoading}
              data-testid="button-follow"
            >
              {followLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : following ? (
                <><Check className="mr-2 h-4 w-4" />Following</>
              ) : (
                <><Heart className="mr-2 h-4 w-4" />Follow</>
              )}
            </Button>

            <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-white/15 bg-white/10 backdrop-blur-sm hover:bg-white/15"
                >
                  <Crown className="mr-2 h-4 w-4 text-amber-400" />
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
                    <Crown className="mx-auto h-8 w-8 text-amber-400 mb-2" />
                    <div className="text-sm font-medium">Tip Jar</div>
                    <div className="text-xs text-muted-foreground mt-1">Direct support for {displayName}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Support functionality is currently in development. Check back soon!
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied!", description: "Artist page link copied to clipboard." });
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        {/* Owner quick actions */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4"
          >
            <Dialog open={isAlbumCreateOpen} onOpenChange={setIsAlbumCreateOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="glow">
                  <Disc className="mr-2 h-3.5 w-3.5" />Create Album
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-black/95 border-white/10 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Create New Album</DialogTitle>
                  <DialogDescription>Group your tracks into an album.</DialogDescription>
                </DialogHeader>
                <AlbumCreate onSuccess={() => setIsAlbumCreateOpen(false)} />
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-white/10 bg-white/5"
              onClick={() => setShowCredentials(!showCredentials)}
              data-testid="button-manage-profile"
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              {showCredentials && !isEditingCredentials ? "Hide" : isEditingCredentials ? "Cancel" : "Edit Profile"}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

// ─── Album Detail Sheet ───────────────────────────────────────────────────────

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
  onPlayTrack: (t: Track) => void;
  activeTrackId: string | null;
}) {
  if (!album) return null;
  const tracks = album.tracks ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-background shadow-2xl"
          >
            <div className="flex max-h-[85dvh] flex-col">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-4 px-5 pb-3 pt-2">
                <div
                  className={cn(
                    "h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10",
                    !album.coverUrl && "bg-gradient-to-br",
                    album.coverUrl ? "" : album.coverGradient,
                  )}
                >
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Disc className="h-6 w-6 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{album.title}</div>
                  <div className="text-xs text-muted-foreground">{tracks.length === 1 ? "1 track" : `${tracks.length} tracks`}</div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator className="opacity-30" />

              {/* Track list */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {tracks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No tracks in this album yet.</div>
                ) : (
                  tracks.map((t, i) => (
                    <TrackCard key={t.id} track={t} onPlay={onPlayTrack} isActive={t.id === activeTrackId} index={i} />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
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
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tracks");
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [albumDetailOpen, setAlbumDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [justPlayedId, setJustPlayedId] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();
  const { toast } = useToast();
  const { sharedWithMe, fetchSharedWithMe } = usePlaylists();
  const [copied, setCopied] = useState<string | null>(null);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newTwitter, setNewTwitter] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [newSpotify, setNewSpotify] = useState("");
  const [newSoundcloud, setNewSoundcloud] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAlbumCreateOpen, setIsAlbumCreateOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [artistUserId, setArtistUserId] = useState<string | null>(null);
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

    const formData = new FormData();
    let hasChanges = false;

    if (newUsername.trim())    { formData.append("username",     newUsername.trim());    hasChanges = true; }
    if (newPassword.trim())    { formData.append("password",     newPassword.trim());    hasChanges = true; }
    if (newEmail.trim())       { formData.append("email",        newEmail.trim());       hasChanges = true; }
    if (newDisplayName.trim()) { formData.append("display_name", newDisplayName.trim()); hasChanges = true; }
    if (newBio.trim())         { formData.append("bio",          newBio.trim());         hasChanges = true; }
    if (newLocation.trim())    { formData.append("location",     newLocation.trim());    hasChanges = true; }
    if (newWebsite.trim())     { formData.append("website",      newWebsite.trim());     hasChanges = true; }

    const hasSocial = newTwitter.trim() || newInstagram.trim() || newSpotify.trim() || newSoundcloud.trim();
    if (hasSocial) {
      const merged = {
        ...(artist.socialLinks ?? {}),
        ...(newTwitter.trim()    ? { twitter:    newTwitter.trim()    } : {}),
        ...(newInstagram.trim()  ? { instagram:  newInstagram.trim()  } : {}),
        ...(newSpotify.trim()    ? { spotify:    newSpotify.trim()    } : {}),
        ...(newSoundcloud.trim() ? { soundcloud: newSoundcloud.trim() } : {}),
      };
      formData.append("social_links", JSON.stringify(merged));
      hasChanges = true;
    }

    if (newAvatarFile) {
      formData.append("avatar_file", newAvatarFile, newAvatarFile.name);
      hasChanges = true;
    }

    if (!hasChanges) {
      toast({ title: "Nothing to update", description: "Make a change first." });
      return;
    }

    try {
      const { toCamelCaseObject } = await import("@/lib/caseTransform");
      const accessToken = localStorage.getItem("accessToken") ?? "";
      // Do NOT set Content-Type — the browser must add the multipart boundary automatically.
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.update(artist.id)}`, {
        method: "PATCH",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = Object.entries(responseBody)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join(" | ");
        throw new Error(detail || `${response.status} ${response.statusText}`);
      }
      const updatedUser = toCamelCaseObject(responseBody);

      setArtist((prev) => (prev ? { ...prev, ...updatedUser } : null));
      setIsEditingCredentials(false);
      setNewUsername(""); setNewPassword(""); setNewEmail("");
      setNewDisplayName(""); setNewBio(""); setNewAvatarUrl("");
      setNewLocation(""); setNewWebsite("");
      setNewTwitter(""); setNewInstagram(""); setNewSpotify(""); setNewSoundcloud("");
      setNewAvatarFile(null); setAvatarPreview(null);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      toast({ variant: "destructive", title: "Update failed", description: msg });
    }
  };

  // Fetch artist data, tracks, albums
  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await apiRequestJson("GET", API_ENDPOINTS.users.byUsername(slug));
        const statsData = await apiRequestJson("GET", API_ENDPOINTS.users.stats(userData.id))
          .catch(() => ({ totalFollowers: 0, monthlyListeners: 0 }));

        const followerCount = statsData.totalFollowers || 0;
        setFollowCount(followerCount);

        setArtist({
          ...userData,
          followers: followerCount,
          monthlyListeners: statsData.monthlyListeners || 0,
          tagline: userData.tagline || "Fresh sounds, new era energy",
          accent: userData.accent || "from-emerald-400/28 via-transparent to-cyan-400/22",
        });

        setArtistUserId(userData.id);

        const [tracksData, albumsData] = await Promise.all([
          apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, {
            userId: userData.id,
            published: true,
          }),
          apiRequestJson<Album[]>("GET", API_ENDPOINTS.albums.byUser(userData.id)).catch(() => []),
        ]);

        setTracks(
          (Array.isArray(tracksData) ? tracksData : []).filter((t) => {
            // The API may return ALL tracks; filter to only this artist's tracks.
            const idMatch = t.userId === userData.id;
            // Fallback: also check if the track artist name matches (e.g. /api/tracks
            // might embed artist info as a string rather than a user id).
            const slugMatch = (t as any)["username"] === slug || (t as any)["artistSlug"] === slug;
            return idMatch || slugMatch;
          }),
        );

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

  // Fetch playlists separately — needs authUser to be loaded (race condition fix).
  useEffect(() => {
    if (!artistUserId) return;
    const isOwnProfile = authUser?.id === artistUserId;
    if (isOwnProfile) {
      // Owner: show ALL playlists (not just public).
      apiRequestJson<Playlist[]>("GET", API_ENDPOINTS.playlists.list)
        .then((all) => setPublicPlaylists(Array.isArray(all) ? all : []))
        .catch(() => {});
      // Also fetch playlists shared with this user.
      fetchSharedWithMe();
    } else {
      // Other user: try public endpoint.
      apiRequestJson<Playlist[]>("GET", API_ENDPOINTS.playlists.byUser(artistUserId))
        .then((all) => setPublicPlaylists(Array.isArray(all) ? all.filter((p) => p.public) : []))
        .catch(() => setPublicPlaylists([]));
    }
  }, [artistUserId, authUser?.id]);

  // Check if the current user already follows this artist
  useEffect(() => {
    if (!artistUserId || !authUser?.id) return;
    apiRequestJson<{ following?: boolean }>(
      "GET",
      API_ENDPOINTS.follows.check(artistUserId, authUser.id),
    )
      .then((data) => setFollowing(data.following ?? false))
      .catch(() => setFollowing(false));
  }, [artistUserId, authUser?.id]);

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
    if (albumTracks.length > 0) handlePlayTrack(albumTracks[0]);
  };

  const handleTrackDeleted = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleTrackUpdated = (updated: Track) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    );
  };

  // Toggle follow/unfollow via API
  const handleToggleFollow = async () => {
    if (!authUser) {
      toast({
        title: "Sign in required",
        description: "Please log in to follow artists.",
        variant: "destructive",
      });
      return;
    }
    if (!artistUserId) return;

    setFollowLoading(true);
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    try {
      const url = `${API_BASE_URL}${API_ENDPOINTS.follows.create(artistUserId)}`;

      if (following) {
        // Unfollow
        const res = await fetch(url, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ followerId: authUser.id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.detail || "Failed to unfollow");
        }
        setFollowing(false);
        setFollowCount((c) => Math.max(0, c - 1));
      } else {
        // Follow
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ followerId: authUser.id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.detail || "Failed to follow");
        }
        setFollowing(true);
        setFollowCount((c) => c + 1);
        toast({
          title: "Following!",
          description: "You are now following this artist.",
        });
      }
    } catch (err) {
      toast({
        title: following ? "Failed to unfollow" : "Failed to follow",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = artist?.displayName || artist?.username || slug;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%)]">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-8 h-8 w-24 animate-pulse rounded-xl bg-white/5" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Artist not found</p>
          <Link href="/"><Button type="button" variant="ghost" className="mt-3">Back to home</Button></Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "tracks", label: "Tracks", icon: Music2, count: tracks.length },
    { key: "albums", label: "Albums", icon: Disc, count: albums.length },
    { key: "playlists", label: "Playlists", icon: ListMusic, count: publicPlaylists.length + sharedWithMe.length },
    { key: "about", label: "About", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">

        {/* ── Top nav ── */}
        <header className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button type="button" variant="secondary" className="border-white/10 bg-white/5" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          {isOwner && (
            <Button type="button" variant="secondary" className="border-white/10 bg-white/5" data-testid="button-notifications">
              <Bell className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Alerts</span>
            </Button>
          )}
        </header>

        {/* ── Verification banner (owner only, unverified) ── */}
        {isOwner && !artist.verified && (
          <ResendVerificationBanner artist={artist} />
        )}

        {/* ── Hero ── */}
        <ArtistHero
          artist={artist}
          tracks={tracks}
          albums={albums}
          followCount={followCount}
          following={following}
          followLoading={followLoading}
          onToggleFollow={handleToggleFollow}
          isOwner={isOwner}
          supportOpen={supportOpen}
          setSupportOpen={setSupportOpen}
          isAlbumCreateOpen={isAlbumCreateOpen}
          setIsAlbumCreateOpen={setIsAlbumCreateOpen}
          showCredentials={showCredentials}
          setShowCredentials={setShowCredentials}
          isEditingCredentials={isEditingCredentials}
          setIsEditingCredentials={setIsEditingCredentials}
          displayName={displayName}
        />

        {/* ── Edit Profile panel (owner only) ── */}
        <AnimatePresence>
          {showCredentials && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="glass glow noise rounded-2xl border border-white/10 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Edit Profile</h2>
                  <div className="flex gap-2">
                    {isEditingCredentials && (
                      <Button type="button" size="sm" onClick={handleUpdateCredentials} className="glow">
                        Save Changes
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isEditingCredentials) {
                          setIsEditingCredentials(false);
                        } else {
                          setIsEditingCredentials(true);
                        }
                      }}
                    >
                      {isEditingCredentials ? "Cancel" : <><Settings className="mr-2 h-3.5 w-3.5" />Edit</>}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {isEditingCredentials && (
                    <>
                      {/* Avatar */}
                      <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                        <div className="text-xs text-muted-foreground mb-2">Profile Picture</div>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10",
                            !avatarPreview && !artist.avatarUrl && "bg-gradient-to-br",
                            avatarPreview || artist.avatarUrl ? "" : artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
                          )}>
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                            ) : artist.avatarUrl ? (
                              <img src={artist.avatarUrl} alt="Current avatar" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <span className="text-xl font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="avatar-upload" className="cursor-pointer">
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition">Choose image…</div>
                            </Label>
                            <Input id="avatar-upload" type="file" accept="image/*" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { setNewAvatarFile(file); setAvatarPreview(createLocalPreview(file)); }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                        <div className="text-xs text-muted-foreground mb-2">Bio</div>
                        <Textarea value={newBio} onChange={(e) => setNewBio(e.target.value)}
                          placeholder={artist.bio || "Tell us about yourself…"}
                          className="bg-transparent border border-white/10 text-sm focus:outline-none w-full min-h-[80px] rounded-xl p-3 resize-none"
                        />
                      </div>

                      {/* Location & Website */}
                      <div className="glass rounded-2xl p-3 sm:p-4">
                        <div className="text-xs text-muted-foreground mb-2">Location</div>
                        <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                          placeholder={artist.location || "City, Country"}
                          className="bg-transparent border-white/10 text-sm"
                        />
                      </div>
                      <div className="glass rounded-2xl p-3 sm:p-4">
                        <div className="text-xs text-muted-foreground mb-2">Website</div>
                        <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)}
                          placeholder={artist.website || "https://yoursite.com"}
                          className="bg-transparent border-white/10 text-sm"
                        />
                      </div>

                      {/* Social Links */}
                      <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                        <div className="text-xs text-muted-foreground mb-3">Social Links</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <SiX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input value={newTwitter} onChange={(e) => setNewTwitter(e.target.value)}
                              placeholder={artist.socialLinks?.twitter || "@handle"}
                              className="bg-transparent border-white/10 text-sm h-8"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiInstagram className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)}
                              placeholder={artist.socialLinks?.instagram || "@handle"}
                              className="bg-transparent border-white/10 text-sm h-8"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiSpotify className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input value={newSpotify} onChange={(e) => setNewSpotify(e.target.value)}
                              placeholder={artist.socialLinks?.spotify || "Spotify artist URL"}
                              className="bg-transparent border-white/10 text-sm h-8"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiSoundcloud className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input value={newSoundcloud} onChange={(e) => setNewSoundcloud(e.target.value)}
                              placeholder={artist.socialLinks?.soundcloud || "SoundCloud URL"}
                              className="bg-transparent border-white/10 text-sm h-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">New Password</div>
                        <div className="flex gap-2 mt-1">
                          <Input type={showPassword ? "text" : "password"} value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="bg-transparent border-white/10 text-sm"
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 border border-white/10 bg-white/5 shrink-0" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Username */}
                  <div className="glass rounded-2xl p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground mb-1">Username</div>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 -mt-1" onClick={() => copyToClipboard(artist.username, "Username")}>
                        {copied === "Username" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    {isEditingCredentials ? (
                      <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder={artist.username} className="bg-transparent border-white/10 text-sm mt-1" />
                    ) : (
                      <div className="text-sm font-medium">{artist.username}</div>
                    )}
                  </div>

                  {/* Display Name */}
                  <div className="glass rounded-2xl p-3 sm:p-4">
                    <div className="text-xs text-muted-foreground mb-1">Display Name</div>
                    {isEditingCredentials ? (
                      <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder={artist.displayName || artist.username} className="bg-transparent border-white/10 text-sm mt-1" />
                    ) : (
                      <div className="text-sm font-medium">{artist.displayName || artist.username}</div>
                    )}
                  </div>

                  {/* Email */}
                  {(artist.email || isEditingCredentials) && (
                    <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground mb-1">Email</div>
                        {artist.email && (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 -mt-1" onClick={() => copyToClipboard(artist.email!, "Email")}>
                            {copied === "Email" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                      {isEditingCredentials ? (
                        <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={artist.email || "your@email.com"} className="bg-transparent border-white/10 text-sm mt-1" />
                      ) : (
                        <div className="text-sm font-medium">{artist.email || "—"}</div>
                      )}
                    </div>
                  )}

                  {/* Read-only: Location & Website */}
                  {!isEditingCredentials && (artist.location || artist.website) && (
                    <>
                      {artist.location && (
                        <div className="glass rounded-2xl p-3 sm:p-4">
                          <div className="text-xs text-muted-foreground mb-1">Location</div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {artist.location}
                          </div>
                        </div>
                      )}
                      {artist.website && (
                        <div className="glass rounded-2xl p-3 sm:p-4">
                          <div className="text-xs text-muted-foreground mb-1">Website</div>
                          <a href={artist.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline truncate">
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            {artist.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {/* Read-only: Social Links */}
                  {!isEditingCredentials && artist.socialLinks && Object.values(artist.socialLinks).some(Boolean) && (
                    <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                      <div className="text-xs text-muted-foreground mb-2">Social Links</div>
                      <div className="flex flex-wrap gap-2">
                        {artist.socialLinks.twitter && (
                          <a href={`https://x.com/${artist.socialLinks.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10 transition">
                            <SiX className="h-3 w-3" />{artist.socialLinks.twitter}
                          </a>
                        )}
                        {artist.socialLinks.instagram && (
                          <a href={`https://instagram.com/${artist.socialLinks.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10 transition">
                            <SiInstagram className="h-3 w-3" />{artist.socialLinks.instagram}
                          </a>
                        )}
                        {artist.socialLinks.spotify && (
                          <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10 transition">
                            <SiSpotify className="h-3 w-3 text-green-500" />Spotify
                          </a>
                        )}
                        {artist.socialLinks.soundcloud && (
                          <a href={artist.socialLinks.soundcloud} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10 transition">
                            <SiSoundcloud className="h-3 w-3 text-orange-400" />SoundCloud
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ── */}
        <div ref={tabsRef} className="mb-4 flex gap-1 rounded-2xl border border-white/8 bg-white/3 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground")}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">

          {/* Tracks */}
          {activeTab === "tracks" && (
            <motion.div
              key="tracks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tracks.length === 0 ? (
                <div className="py-16 text-center">
                  <Music2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No tracks yet.</p>
                  {isOwner && (
                    <Link href="/upload">
                      <Button type="button" className="glow mt-4">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upload your first track
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3">
                  {tracks.map((t, idx) => (
                    <TrackCard
                      key={t.id}
                      track={t}
                      onPlay={handlePlayTrack}
                      isActive={active?.id === t.id}
                      index={idx}
                      isOwner={isOwner}
                      onTrackDeleted={handleTrackDeleted}
                      onTrackUpdated={handleTrackUpdated}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Playlists */}
          {activeTab === "playlists" && (
            <motion.div key="playlists" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="space-y-8">
                {/* Owned playlists */}
                {publicPlaylists.length > 0 && (
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      <ListMusic className="h-3.5 w-3.5" />
                      My Playlists
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {publicPlaylists.map((pl, idx) => (
                        <motion.a
                          key={pl.id}
                          href={`/playlists/${pl.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5 cursor-pointer"
                          data-testid={`card-public-playlist-${pl.id}`}
                        >
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center border border-white/10">
                            <ListMusic className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{pl.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(pl.trackIds?.length ?? 0)} {(pl.trackIds?.length ?? 0) === 1 ? "track" : "tracks"}
                              {pl.myPermission && pl.myPermission !== "owner" && (
                                <span className="ml-2 text-primary/60">({pl.myPermission})</span>
                              )}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition shrink-0" />
                        </motion.a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Shared with me */}
                {sharedWithMe.length > 0 && (
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      <Users className="h-3.5 w-3.5" />
                      Shared with me
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedWithMe.map((pl, idx) => (
                        <motion.a
                          key={pl.id}
                          href={`/playlists/${pl.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5 cursor-pointer"
                          data-testid={`card-shared-playlist-${pl.id}`}
                        >
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 flex items-center justify-center border border-white/10">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{pl.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(pl.trackIds?.length ?? 0)} {(pl.trackIds?.length ?? 0) === 1 ? "track" : "tracks"}
                              {pl.myPermission && (
                                <span className="ml-2 text-primary/60">({pl.myPermission})</span>
                              )}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition shrink-0" />
                        </motion.a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state — only when both are empty */}
                {publicPlaylists.length === 0 && sharedWithMe.length === 0 && (
                  <div className="py-16 text-center">
                    <ListMusic className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No playlists yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Albums */}
          {activeTab === "albums" && (
            <motion.div key="albums" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {albums.length === 0 ? (
                <div className="py-16 text-center">
                  <Disc className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No albums yet.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {albums.map((album, idx) => (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="group cursor-pointer rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                      onClick={() => { setActiveAlbum(album); setAlbumDetailOpen(true); }}
                    >
                      <div className={cn("mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10", !album.coverUrl && "bg-gradient-to-br", album.coverUrl ? "" : album.coverGradient)}>
                        {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Disc className="h-8 w-8 text-white/20" /></div>}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{album.title}</div>
                          <div className="text-xs text-muted-foreground">{(album.tracks?.length ?? album.trackCount ?? 0) === 1 ? "1 track" : `${album.tracks?.length ?? album.trackCount ?? 0} tracks`} · {album.genre}</div>
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition" onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album); }}>
                          <Play className="h-3.5 w-3.5 translate-x-px" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* About */}
          {activeTab === "about" && (
            <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

              {/* Bio */}
              {artist.bio && (
                <div className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">About</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-artist-bio">{artist.bio}</p>
                </div>
              )}

              {/* Location / Website */}
              {(artist.location || artist.website) && (
                <div className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Details</h2>
                  </div>
                  <div className="space-y-2">
                    {artist.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-artist-location">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {artist.location}
                      </div>
                    )}
                    {artist.website && (
                      <a href={artist.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                        data-testid="link-artist-website"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        {artist.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {artist.socialLinks && Object.values(artist.socialLinks).some(Boolean) && (
                <div className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Social</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {artist.socialLinks.twitter && (
                      <a href={`https://x.com/${artist.socialLinks.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                        data-testid="link-social-twitter"
                      >
                        <SiX className="h-3.5 w-3.5" />{artist.socialLinks.twitter}
                      </a>
                    )}
                    {artist.socialLinks.instagram && (
                      <a href={`https://instagram.com/${artist.socialLinks.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                        data-testid="link-social-instagram"
                      >
                        <SiInstagram className="h-3.5 w-3.5" />{artist.socialLinks.instagram}
                      </a>
                    )}
                    {artist.socialLinks.spotify && (
                      <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                        data-testid="link-social-spotify"
                      >
                        <SiSpotify className="h-3.5 w-3.5 text-green-500" />Spotify
                      </a>
                    )}
                    {artist.socialLinks.soundcloud && (
                      <a href={artist.socialLinks.soundcloud} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                        data-testid="link-social-soundcloud"
                      >
                        <SiSoundcloud className="h-3.5 w-3.5 text-orange-400" />SoundCloud
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Growth snapshot */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5">
                <div className={cn("absolute inset-0 bg-gradient-to-br", artist.accent)} />
                <div className="absolute inset-0 opacity-60 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-foreground/90" />
                    <h2 className="text-sm font-semibold" data-testid="text-growth-title">Growth snapshot</h2>
                    <Button type="button" size="sm" variant="secondary" className="ml-auto border-white/10 bg-white/5 h-7 text-xs" data-testid="button-growth-export">
                      <ExternalLink className="mr-1 h-3 w-3" />Export
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {[
                      { label: "Saves", value: formatCount(artist.monthlyListeners / 10) },
                      { label: "Shares", value: formatCount(artist.followers / 5) },
                      { label: "Monthly Growth", value: "+12%" },
                      { label: "Track Count", value: tracks.length },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-3 py-2" data-testid={`row-growth-${r.label.replace(/\s+/g, "-").toLowerCase()}`}>
                        <div className="text-sm text-foreground/90">{r.label}</div>
                        <div className="text-sm font-semibold">{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact */}
              {artist.email && (
                <div className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Contact</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{artist.email}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(artist.email!, "Email")}>
                      {copied === "Email" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

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