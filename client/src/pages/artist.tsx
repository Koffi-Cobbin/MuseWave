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
  Copy,
  Check,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Track, User } from "../../../shared/schema";
import { Label } from "@/components/ui/label";

type Artist = User & {
  followers: number;
  monthlyListeners: number;
  tagline?: string;
  accent?: string;
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

// Helper to convert File to base64 data URL
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ArtistPage() {
  const params = useParams();
  const slug = (params as any)?.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [justPlayedId, setJustPlayedId] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const { active, setActive, setAutoPlay } = usePlayer();
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

  const isOwner = authUser?.id === artist?.id;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard`,
    });
  };

  const handleUpdateCredentials = async () => {
    if (!artist) return;
    try {
      const updates: any = {};
      if (newUsername) updates.username = newUsername;
      if (newPassword) updates.password = newPassword;
      if (newEmail) updates.email = newEmail;
      if (newDisplayName) updates.displayName = newDisplayName;
      if (newBio) updates.bio = newBio;
      
      // Handle avatar file upload
      if (newAvatarFile) {
        const avatarDataUrl = await fileToDataUrl(newAvatarFile);
        updates.avatarUrl = avatarDataUrl;
      } else if (newAvatarUrl !== undefined) {
        updates.avatarUrl = newAvatarUrl;
      }

      if (Object.keys(updates).length === 0) return;

      const res = await apiRequest("PATCH", `/api/users/${artist.id}`, updates);
      if (!res.ok) throw new Error("Failed to update credentials");
      
      const updatedUser = await res.json();
      setArtist(prev => prev ? { ...prev, ...updatedUser } : null);
      setIsEditingCredentials(false);
      setNewUsername("");
      setNewPassword("");
      setNewEmail("");
      setNewDisplayName("");
      setNewBio("");
      setNewAvatarUrl("");
      setNewAvatarFile(null);
      setAvatarPreview(null);
      setNewAvatarFile(null);
      setAvatarPreview(null);
      
      toast({
        title: "Success",
        description: "Credentials updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update credentials",
      });
    }
  };

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
          password: userData.password, // Added for visibility on own profile
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

            {/* Profile Picture */}
            <div
              className={cn(
                "h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10",
                !artist.avatarUrl && "bg-gradient-to-br",
                artist.avatarUrl ? "" : artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
              )}
              aria-hidden="true"
            >
              {artist.avatarUrl ? (
                <img
                  src={artist.avatarUrl}
                  alt={`${artist.displayName || artist.username} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {(artist.displayName || artist.username).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-muted-foreground" data-testid="text-artist-route">
                Artist
              </div>
              <div className="text-lg font-semibold" data-testid="text-artist-title">
                {artist.username}
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
                {artist.displayName}
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
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => {
                    const credentialsSection = document.getElementById('credentials-section');
                    credentialsSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  View Credentials & Settings
                </Button>
              )}
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

        {isOwner && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Account Credentials</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditingCredentials(!isEditingCredentials)}
              >
                {isEditingCredentials ? "Cancel" : "Edit"}
              </Button>
            </div>
            
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Username</div>
                <div className="flex items-center justify-between gap-2">
                  {isEditingCredentials ? (
                    <input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none w-full py-1"
                      placeholder={artist.username}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm font-mono truncate">{artist.username}</span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(artist.username, "Username")}
                  >
                    {copied === "Username" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Password</div>
                <div className="flex items-center justify-between gap-2">
                  {isEditingCredentials ? (
                    <input
                      type="password"
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none w-full py-1"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm font-mono truncate">••••••••</span>
                  )}
                  <div className="flex gap-1">
                    {!isEditingCredentials && (
                       <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(artist.password || "", "Password")}
                      >
                        {copied === "Password" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditingCredentials && (
              <Button 
                className="mt-4 w-full" 
                size="sm"
                onClick={handleUpdateCredentials}
                disabled={!newUsername && !newPassword}
              >
                Save Changes
              </Button>
            )}
          </section>
        )}

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
                        "h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10",
                        !t.coverUrl && "bg-gradient-to-br",
                        t.coverUrl ? "" : t.coverGradient,
                      )}
                      aria-hidden="true"
                    >
                      {t.coverUrl ? (
                        <img
                          src={t.coverUrl}
                          alt={`${t.title} cover`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 opacity-50 blur-[10px]" />
                      )}
                    </div>
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
                    {active?.id === t.id ? (
                      <Badge variant="secondary" className="border-white/10 bg-primary/20 text-primary px-3 py-1">
                        Playing
                      </Badge>
                    ) : (
                      <motion.div
                        animate={justPlayedId === t.id ? { scale: 1.2, rotate: 360 } : { scale: 1, rotate: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Button
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => {
                            setActiveId(t.id);
                            setActive(t);
                            setAutoPlay(true);
                            setJustPlayedId(t.id);
                            setTimeout(() => setJustPlayedId(null), 1000);
                          }}
                          data-testid={`button-artist-play-${t.id}`}
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {isOwner && (
          <section id="credentials-section" className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Account Credentials</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsEditingCredentials(!isEditingCredentials);
                  if (!isEditingCredentials) {
                    // Initialize edit fields with current values
                    setNewUsername(artist.username);
                    setNewEmail(artist.email);
                    setNewDisplayName(artist.displayName || "");
                    setNewBio(artist.bio || "");
                    setNewAvatarUrl(artist.avatarUrl || "");
                    setNewAvatarFile(null);
                    setAvatarPreview(null);
                  }
                }}
              >
                {isEditingCredentials ? "Cancel" : "Edit"}
              </Button>
            </div>
            
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {isEditingCredentials && (
              <div className="glass rounded-2xl p-3 sm:p-4 sm:col-span-2">
                <div className="text-xs text-muted-foreground mb-2">Profile Picture</div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10",
                      !avatarPreview && !artist.avatarUrl && "bg-gradient-to-br",
                      avatarPreview || artist.avatarUrl ? "" : artist.accent || "from-emerald-400/30 to-fuchsia-500/20",
                    )}
                    aria-hidden="true"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : artist.avatarUrl ? (
                      <img
                        src={artist.avatarUrl}
                        alt={`${artist.displayName || artist.username} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-xl font-semibold text-white">
                          {(artist.displayName || artist.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="avatar-file" className="text-xs text-muted-foreground">
                        Upload Image
                      </Label>
                      <Input
                        id="avatar-file"
                        type="file"
                        accept="image/*"
                        className="bg-transparent border-b border-white/10 text-sm focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewAvatarFile(file);
                            // Create preview
                            const previewUrl = await fileToDataUrl(file);
                            setAvatarPreview(previewUrl);
                          } else {
                            setNewAvatarFile(null);
                            setAvatarPreview(null);
                          }
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Or enter a URL:
                    </div>
                    <Input
                      type="url"
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none"
                      placeholder="https://example.com/avatar.jpg"
                      value={newAvatarUrl}
                      onChange={(e) => setNewAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              )}
              {/* EOF */}

              <div className="glass rounded-2xl p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Username</div>
                <div className="flex items-center justify-between gap-1">
                  {isEditingCredentials ? (
                    <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.username}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  ) : (
                    <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.username}
                      value={artist.username}
                      readOnly={true}
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(artist.username, "Username")}
                  >
                    {copied === "Username" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-2xl p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Email</div>
                <div className="flex items-center justify-between gap-1">
                  {isEditingCredentials ? (
                    <Input
                      type="email"
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.email}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  ) : (
                     <Input
                      type="email"
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.email}
                      value={artist.email}
                      readOnly={true}
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(artist.email, "Email")}
                  >
                    {copied === "Email" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-2xl p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Display Name</div>
                <div className="flex items-center justify-between gap-1">
                  {isEditingCredentials ? (
                    <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.displayName}
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                    />
                  ) : (
                    <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.displayName}
                      value={artist.displayName}
                      readOnly={true}
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(artist.displayName || artist.username, "Display Name")}
                  >
                    {copied === "Display Name" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-2xl p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Bio</div>
                <div className="flex items-center justify-between gap-1">
                  {isEditingCredentials ? (
                    <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.bio || "Your bio..."}
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                    />
                  ) : (
                     <Input
                      className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                      placeholder={artist.bio || "No bio set."}
                      value={artist.bio || ""}
                      readOnly={true}
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(artist.bio || "", "Bio")}
                  >
                    {copied === "Bio" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-2xl p-3 sm:col-span-2 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Password</div>
                <div className="flex items-center justify-between gap-1">
                  {isEditingCredentials ? (
                    <>
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </>
                  ) : (
                    <Input
                        type={showPassword ? "text" : "password"}
                        className="bg-transparent border-b border-white/10 text-sm focus:outline-none flex-1 py-1"
                        placeholder="New password"
                        value={artist.password || ""}
                        readOnly={true}
                      />
                  )}
                  <div className="flex gap-1">
                    {!isEditingCredentials && (
                       <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => copyToClipboard(artist.password || "", "Password")}
                      >
                        {copied === "Password" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditingCredentials && (
              <Button 
                className="mt-4 w-full" 
                size="sm"
                onClick={handleUpdateCredentials}
                disabled={!newUsername && !newPassword && !newEmail && !newDisplayName && !newBio}
              >
                Save Changes
              </Button>
            )}
          </section>
        )}

        <div className="h-16" aria-hidden="true" />
      </div>
    </div>
  );
}