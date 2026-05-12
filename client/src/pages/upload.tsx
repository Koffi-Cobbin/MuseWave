import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  ImageIcon,
  Link2,
  Loader2,
  Music2,
  Sparkles,
  User as UserIcon,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LyricsEditor } from "@/components/LyricsEditor";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useGenres } from "@/hooks/use-genres";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson, apiRequestFormData } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadDraft {
  title: string;
  artist: string;
  email: string;
  genre: string;
  mood: string;
  description: string;
  lyrics: string;
  videoUrl: string;
  audioFile: File | null;
  coverFile: File | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const MOODS = [
  "Chill", "Energetic", "Melancholic", "Uplifting", "Dark", "Romantic",
];

function gradientFromTitle(title: string): string {
  const gradients = [
    "from-emerald-500/40 to-cyan-500/30",
    "from-fuchsia-500/40 to-purple-500/30",
    "from-amber-500/40 to-orange-500/30",
    "from-sky-500/40 to-indigo-500/30",
    "from-rose-500/40 to-pink-500/30",
    "from-teal-500/40 to-emerald-500/30",
  ];
  const idx = title.length % gradients.length;
  return gradients[idx];
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
  });
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < step ? "bg-primary w-4" : i === step ? "bg-primary/70 w-3" : "bg-white/15 w-1.5"
          )}
        />
      ))}
    </div>
  );
}

// ─── Drag-drop file zone ──────────────────────────────────────────────────────

function DropZone({
  accept,
  label,
  hint,
  icon: Icon,
  fileName,
  disabled,
  onFile,
  previewUrl,
  "data-testid": testId,
}: {
  accept: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  fileName?: string;
  disabled?: boolean;
  onFile: (f: File) => void;
  previewUrl?: string | null;
  "data-testid"?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [disabled, onFile]
  );

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200",
        dragging
          ? "border-primary/60 bg-primary/5 scale-[1.01]"
          : fileName
            ? "border-white/15 bg-white/4 hover:border-white/25 hover:bg-white/6"
            : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      data-testid={testId}
    >
      {previewUrl && accept.includes("image") ? (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      ) : null}

      <div className={cn("relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6", fileName && "bg-primary/15 border-primary/30")}>
        {fileName ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="relative z-10">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
          {fileName || hint}
        </div>
      </div>
      {fileName && (
        <button
          type="button"
          className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground transition"
          onClick={(e) => { e.stopPropagation(); inputRef.current && (inputRef.current.value = ""); onFile(null as unknown as File); }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ─── Live Preview Card ────────────────────────────────────────────────────────

function LivePreview({
  draft,
  previewUrl,
  audioPreviewUrl,
  coverGradient,
  onSubmit,
  isSubmitting,
  uploadProgress,
}: {
  draft: UploadDraft;
  previewUrl: string | null;
  audioPreviewUrl: string | null;
  coverGradient: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  uploadProgress: string;
}) {
  const isReady = draft.title.trim() && draft.artist.trim() && draft.audioFile;

  return (
    <div className="glass glow noise rounded-2xl border border-white/10 p-4 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
          <Music2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">Live preview</span>
      </div>

      {/* Cover art preview */}
      <div
        className={cn(
          "relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br",
          coverGradient
        )}
        data-testid="preview-cover"
      >
        {previewUrl && (
          <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
        )}
        {/* Floating track info overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-6">
          <div className="truncate text-sm font-bold" data-testid="preview-title">
            {draft.title || "Track Title"}
          </div>
          <div className="truncate text-xs text-white/60" data-testid="preview-artist">
            {draft.artist || "Artist Name"}
          </div>
        </div>
      </div>

      {/* Metadata chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {draft.genre && (
          <Badge variant="secondary" className="border-white/10 bg-white/5 text-[10px]">{draft.genre}</Badge>
        )}
        {draft.mood && (
          <Badge variant="secondary" className="border-white/10 bg-white/5 text-[10px]">{draft.mood}</Badge>
        )}
      </div>

      {/* Audio preview */}
      {audioPreviewUrl ? (
        <audio
          controls
          src={audioPreviewUrl}
          className="mb-3 h-9 w-full"
          data-testid="audio-preview-player"
        />
      ) : (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
          <AudioLines className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground" data-testid="text-preview-player-note">
            {draft.audioFile ? "Processing audio…" : "No audio selected yet"}
          </span>
        </div>
      )}

      {/* Publish button */}
      <Button
        onClick={onSubmit}
        disabled={isSubmitting || !isReady}
        className={cn("w-full", isReady ? "glow" : "")}
        data-testid="button-submit-upload-preview"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadProgress || "Publishing…"}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Publish Track
          </>
        )}
      </Button>

      {!isReady && !isSubmitting && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Fill in title, artist & audio to publish
        </p>
      )}
    </div>
  );
}

// ─── Upload Page ──────────────────────────────────────────────────────────────

export default function Upload() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { genres } = useGenres();

  // Derive whether the logged-in user is already an artist.
  // authUser.isArtist is the camelCase form stored after toCamelCaseObject;
  // fall back to the raw snake_case field in case the login path stored it directly.
  const isLoggedInArtist = !!(authUser && ((authUser as any).isArtist || (authUser as any).is_artist));

  // Helper to read the display name from the Django response (may be snake_case or camelCase)
  const authDisplayName = authUser
    ? (authUser as any).display_name || authUser.displayName || authUser.username || ""
    : "";

  const [draft, setDraft] = useState<UploadDraft>({
    title: "",
    artist: isLoggedInArtist ? authDisplayName : "",
    email: isLoggedInArtist ? (authUser?.email ?? "") : "",
    genre: "Indie",
    mood: "",
    description: "",
    lyrics: "",
    videoUrl: "",
    audioFile: null,
    coverFile: null,
  });

  const [step, setStep] = useState(0); // 0 = track info, 1 = files, 2 = done
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [createdTrackId, setCreatedTrackId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // When auth state resolves (e.g. on page load), sync artist + email into draft
  useEffect(() => {
    if (isLoggedInArtist) {
      setDraft((d) => ({
        ...d,
        artist: authDisplayName || d.artist,
        email: authUser?.email ?? d.email,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Scroll to top whenever the step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const coverGradient = useMemo(() => gradientFromTitle(draft.title), [draft.title]);

  const artistSlug = useMemo(
    () =>
      (draft.artist || "your-artist")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    [draft.artist]
  );

  function update<K extends keyof UploadDraft>(key: K, value: UploadDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key === "coverFile") {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(value instanceof File ? URL.createObjectURL(value) : null);
    }
    if (key === "audioFile") {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(value instanceof File ? URL.createObjectURL(value) : null);
    }
  }

  async function onSubmit() {
    if (!draft.title.trim()) return toast({ title: "Missing title", variant: "destructive" });
    if (!draft.artist.trim()) return toast({ title: "Missing artist name", variant: "destructive" });
    if (!authUser && !draft.email.trim()) return toast({ title: "Missing email", variant: "destructive" });
    if (!draft.audioFile) return toast({ title: "Missing audio file", variant: "destructive" });

    setIsSubmitting(true);
    setUploadProgress("Preparing upload…");

    try {
      let userId: string;
      let isNewUser = false;

      if (authUser) {
        // ── Already logged in — use this account directly, skip all user lookup/create ──
        userId = authUser.id;
        setUploadProgress("Processing audio…");
      } else {
        // ── Guest flow — look up or create a user account ──
        setUploadProgress("Checking artist profile…");

        let existingUser: any = null;
        try {
          existingUser = await apiRequestJson<any>(
            "GET",
            API_ENDPOINTS.users.byUsername(artistSlug)
          );
        } catch (err: any) {
          if (err?.status === 404 || err?.response?.status === 404) {
            existingUser = null;
          } else {
            throw err;
          }
        }

        if (existingUser) {
          userId = existingUser.id;
        } else {
          setUploadProgress("Creating artist profile…");
          const generatedPassword = `mw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          sessionStorage.setItem("temp_password", generatedPassword);

          const newUser = await apiRequestJson<any>("POST", API_ENDPOINTS.users.create, {
            username: artistSlug,
            email: draft.email.trim(),
            password: generatedPassword,
            display_name: draft.artist.trim(),
            bio: "Indie artist sharing music on MuseWave",
          });
          userId = newUser.id;
          isNewUser = true;
          setUploadProgress("Setting up your account…");
          await sleep(800);
        }

        setUploadProgress("Processing audio…");
      }

      let audioDuration = 0;
      try { audioDuration = await getAudioDuration(draft.audioFile); } catch { }

      setUploadProgress("Uploading files…");
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("title", draft.title.trim());
      formData.append("artist", draft.artist.trim());
      formData.append("artist_slug", artistSlug);
      if (draft.description.trim()) formData.append("description", draft.description.trim());
      formData.append("genre", draft.genre.trim() || "Indie");
      if (draft.mood.trim()) formData.append("mood", draft.mood.trim());
      const tags = draft.mood ? [draft.mood.toLowerCase(), draft.genre.toLowerCase()] : [draft.genre.toLowerCase()];
      formData.append("tags", JSON.stringify(tags));
      formData.append("audio_file", draft.audioFile);
      formData.append("audio_file_size", draft.audioFile.size.toString());
      formData.append("audio_duration", Math.round(audioDuration).toString());
      formData.append("audio_format", draft.audioFile.type.split("/")[1] || "mp3");
      if (draft.coverFile) {
        setUploadProgress("Uploading cover image…");
        formData.append("cover_file", draft.coverFile);
      }
      formData.append("cover_gradient", coverGradient);
      formData.append("published", "true");
      if (draft.videoUrl.trim()) formData.append("video_url", draft.videoUrl.trim());
      if (draft.lyrics.trim()) formData.append("lyrics", draft.lyrics.trim());

      setUploadProgress("Publishing track…");
      const createdTrack = await apiRequestFormData<any>("POST", API_ENDPOINTS.tracks.create, formData);

      setCreatedTrackId(createdTrack.id);
      setSubmitted(true);
      setStep(2);
      setUploadProgress("");

      toast({
        title: "Track published! 🎉",
        description: isNewUser
          ? `"${draft.title}" is live! Verify your email to access login credentials`
          : `"${draft.title}" is now live.`,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setUploadProgress("");
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
        <div className="mx-auto max-w-lg px-3 py-12 sm:px-4">
          {/* Back */}
          <Link
            href="/"
            className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Success card */}
            <div className="glass glow noise rounded-3xl border border-white/10 p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30"
              >
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </motion.div>

              {/* Cover preview */}
              <div
                className={cn(
                  "mx-auto mb-5 h-28 w-28 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br",
                  coverGradient
                )}
              >
                {previewUrl && <img src={previewUrl} alt="Cover" className="h-full w-full object-cover" />}
              </div>

              <h1 className="text-2xl font-bold tracking-tight" data-testid="status-upload-success">
                You're live! 🎵
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{draft.title}</span> has been published to your artist page.
              </p>

              <div className="mt-6 grid gap-3">
                <Link href={`/artist/${artistSlug}`}>
                  <Button className="glow w-full" data-testid="button-view-artist-page">
                    <UserIcon className="mr-2 h-4 w-4" />
                    View artist page
                    <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  className="w-full border-white/10 bg-white/5"
                  data-testid="button-copy-link"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/artist/${artistSlug}`);
                    toast({ title: "Link copied!" });
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy artist link
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setDraft({
                      title: "",
                      artist: isLoggedInArtist ? authDisplayName : "",
                      email: isLoggedInArtist ? (authUser?.email ?? "") : "",
                      genre: "Indie",
                      mood: "",
                      description: "",
                      lyrics: "",
                      videoUrl: "",
                      audioFile: null,
                      coverFile: null,
                    });
                    setPreviewUrl(null);
                    setAudioPreviewUrl(null);
                    setSubmitted(false);
                    setStep(0);
                  }}
                  data-testid="button-upload-another"
                >
                  Upload another track
                </Button>
              </div>
            </div>

            {/* Artist page link display */}
            <div className="mt-4 glass rounded-2xl border border-white/10 p-4">
              <div className="text-xs text-muted-foreground mb-1.5">Your artist page</div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                  {window.location.origin}/artist/<span className="text-foreground">{artistSlug}</span>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-4 lg:py-8">

        {/* ── Header ── */}
        <header className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm" className="border-white/10 bg-white/5 shrink-0" data-testid="button-back-home">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg" data-testid="text-upload-title">
                Share your release
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block" data-testid="text-upload-subtitle">
                Upload a track and get a live artist page
              </p>
            </div>
          </div>
          <StepDots step={step} total={2} />
        </header>

        {/* ── Two-column layout ── */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-5 lg:gap-6">

          {/* ── Form panel ── */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">

              {/* Step 0: Track details */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="glass glow noise rounded-2xl border border-white/10 p-4 sm:rounded-3xl sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold" data-testid="text-details-title">Track details</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Step 1 of 2 — what's your track called?</div>
                      </div>
                      <Badge variant="outline" className="border-white/12 shrink-0 text-[10px]">1 / 2</Badge>
                    </div>

                    <div className="grid gap-4">
                      {/* Title */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="title" className="text-xs">Track title <span className="text-red-400">*</span></Label>
                        <Input
                          id="title"
                          value={draft.title}
                          onChange={(e) => update("title", e.target.value)}
                          placeholder="e.g. Neon Postcard"
                          className="h-10"
                          data-testid="input-track-title"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Artist + Email — hidden when the user is a logged-in artist */}
                      {isLoggedInArtist ? (
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5">
                          <UserIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            Uploading as <span className="font-medium text-foreground">{draft.artist || authDisplayName}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="artist" className="text-xs">Artist name <span className="text-red-400">*</span></Label>
                            <Input
                              id="artist"
                              value={draft.artist}
                              onChange={(e) => update("artist", e.target.value)}
                              placeholder="e.g. Luna Waves"
                              className="h-10"
                              data-testid="input-artist-name"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="email" className="text-xs">Email <span className="text-red-400">*</span></Label>
                            <Input
                              id="email"
                              type="email"
                              value={draft.email}
                              onChange={(e) => update("email", e.target.value)}
                              placeholder="artist@example.com"
                              className="h-10"
                              data-testid="input-email"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      )}

                      {/* Genre pills — horizontally scrollable */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Genre</Label>
                        <div
                          className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                          ref={(el) => {
                            if (!el) return;
                            const onWheel = (e: WheelEvent) => {
                              if (e.deltaY === 0) return;
                              e.preventDefault();
                              el.scrollLeft += e.deltaY;
                            };
                            if (!(el as any).__wheelBound) {
                              el.addEventListener("wheel", onWheel, { passive: false });
                              (el as any).__wheelBound = true;
                            }
                          }}
                        >
                          {genres.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => update("genre", g)}
                              className={cn(
                                "shrink-0 rounded-full border px-3 py-1 text-xs transition-all",
                                draft.genre === g
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:text-foreground"
                              )}
                              data-testid={`genre-pill-${g.toLowerCase().replace(/[\s/&]/g, "-")}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        {/* Custom genre input — shown when the typed value isn't in the list */}
                        {draft.genre && !genres.includes(draft.genre) && (
                          <Input
                            value={draft.genre}
                            onChange={(e) => update("genre", e.target.value)}
                            placeholder="Custom genre…"
                            className="mt-1 h-9 text-xs"
                            data-testid="input-genre"
                            disabled={isSubmitting}
                          />
                        )}
                      </div>

                      {/* Mood pills */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Mood <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="flex flex-wrap gap-1.5">
                          {MOODS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => update("mood", draft.mood === m ? "" : m)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition-all",
                                draft.mood === m
                                  ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
                                  : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:text-foreground"
                              )}
                              data-testid={`mood-pill-${m.toLowerCase()}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="description" className="text-xs">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                          id="description"
                          value={draft.description}
                          onChange={(e) => update("description", e.target.value)}
                          placeholder="Tell listeners about this track…"
                          className="min-h-[72px] resize-none text-sm"
                          data-testid="input-description"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* YouTube / video URL */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="videoUrl" className="text-xs">
                          YouTube / video URL <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                          id="videoUrl"
                          type="url"
                          value={draft.videoUrl}
                          onChange={(e) => update("videoUrl", e.target.value)}
                          placeholder="https://youtube.com/watch?v=…"
                          className="h-10"
                          data-testid="input-video-url"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Lyrics */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Lyrics <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <LyricsEditor
                          value={draft.lyrics}
                          onChange={(html) => update("lyrics", html)}
                          disabled={isSubmitting}
                          placeholder="Verse 1&#10;...&#10;&#10;Chorus&#10;..."
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        onClick={() => setStep(1)}
                        disabled={
                          !draft.title.trim() ||
                          !draft.artist.trim() ||
                          (!authUser && !draft.email.trim())
                        }
                        className="glow gap-1.5"
                        data-testid="button-next-step"
                      >
                        Continue to files
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Files */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="glass glow noise rounded-2xl border border-white/10 p-4 sm:rounded-3xl sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold" data-testid="text-files-title">Upload files</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Step 2 of 2 — add your audio and cover art</div>
                      </div>
                      <Badge variant="outline" className="border-white/12 shrink-0 text-[10px]">2 / 2</Badge>
                    </div>

                    <div className="grid gap-3">
                      <DropZone
                        accept="audio/*"
                        label="Audio file *"
                        hint="Drag & drop or click — MP3, WAV, FLAC"
                        icon={AudioLines}
                        fileName={draft.audioFile?.name}
                        disabled={isSubmitting}
                        onFile={(f) => update("audioFile", f)}
                        data-testid="label-audio-upload"
                      />

                      <DropZone
                        accept="image/*"
                        label="Cover art"
                        hint="Optional — JPG, PNG, WebP"
                        icon={ImageIcon}
                        fileName={draft.coverFile?.name}
                        disabled={isSubmitting}
                        onFile={(f) => update("coverFile", f)}
                        previewUrl={previewUrl}
                        data-testid="label-cover-upload"
                      />
                    </div>

                    <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Files sent via multipart/form-data with <code className="font-mono">audio_file</code> and <code className="font-mono">cover_file</code> fields.</span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(0)}
                        disabled={isSubmitting}
                        data-testid="button-prev-step"
                      >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Back
                      </Button>
                      <Button
                        onClick={onSubmit}
                        disabled={isSubmitting || !draft.audioFile}
                        className={cn("glow gap-1.5", !draft.audioFile && "opacity-50")}
                        data-testid="button-submit-upload"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{uploadProgress || "Publishing…"}</>
                        ) : (
                          <><Sparkles className="mr-1.5 h-4 w-4" />Publish now</>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Preview panel ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 grid gap-4">
              <LivePreview
                draft={draft}
                previewUrl={previewUrl}
                audioPreviewUrl={audioPreviewUrl}
                coverGradient={coverGradient}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                uploadProgress={uploadProgress}
              />

              {/* Artist URL preview */}
              {draft.artist && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl border border-white/10 p-3 sm:rounded-3xl sm:p-4"
                >
                  <div className="mb-1.5 text-xs text-muted-foreground">Your artist page URL</div>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                      /artist/<span className="text-foreground">{artistSlug}</span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/artist/${artistSlug}`);
                        toast({ title: "Link copied!" });
                      }}
                      data-testid="button-copy-slug-link"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for player bar */}
        <div className="h-24" aria-hidden="true" />
      </div>
    </div>
  );
}