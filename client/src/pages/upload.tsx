import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AudioLines,
  CheckCircle2,
  CloudUpload,
  Image as ImageIcon,
  Link2,
  Music,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiRequestJson, apiRequestFormData } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/apiConfig";

type UploadDraft = {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  description: string;
  audioFile?: File | null;
  coverFile?: File | null;
};

function gradientFromTitle(title: string) {
  const s = title.trim().toLowerCase();
  if (!s) return "from-white/10 via-white/0 to-white/10";
  const hash = Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const options = [
    "from-emerald-400/30 via-transparent to-fuchsia-500/30",
    "from-cyan-400/30 via-transparent to-emerald-400/25",
    "from-fuchsia-500/28 via-transparent to-cyan-400/28",
    "from-lime-400/26 via-transparent to-emerald-400/22",
  ];
  return options[hash % options.length];
}

// Helper to get audio duration
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = reject;
    audio.src = URL.createObjectURL(file);
  });
}

export default function Upload() {
  const [draft, setDraft] = useState<UploadDraft>({
    title: "",
    artist: "",
    genre: "Indie",
    mood: "",
    description: "",
    audioFile: null,
    coverFile: null,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTrackId, setCreatedTrackId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const { toast } = useToast();
  const { user: authUser, login } = useAuth();

  const coverGradient = useMemo(() => gradientFromTitle(draft.title), [draft.title]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  function update<K extends keyof UploadDraft>(key: K, value: UploadDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key === "coverFile") {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (value instanceof File) {
        setPreviewUrl(URL.createObjectURL(value));
      } else {
        setPreviewUrl(null);
      }
    }
    if (key === "audioFile") {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (value instanceof File) {
        setAudioPreviewUrl(URL.createObjectURL(value));
      } else {
        setAudioPreviewUrl(null);
      }
    }
  }

  async function onSubmit() {
    // Validation
    if (!draft.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a track title.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.artist.trim()) {
      toast({
        title: "Missing artist",
        description: "Please enter an artist name.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.audioFile) {
      toast({
        title: "Missing audio file",
        description: "Please select an audio file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("Preparing upload...");

    try {
      // Generate artist slug
      const artistSlug = draft.artist
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      let userId: string;
      let userPassword: string = "";
      let isNewUser = false;

      // Try to get existing user by username
      setUploadProgress("Checking artist profile...");
      try {
        const user = await apiRequestJson<any>('GET', API_ENDPOINTS.users.byUsername(artistSlug))
          .catch(() => null);

        if (user) {
          userId = user.id;
        } else {
          // Create new user for this artist          
          setUploadProgress("Creating artist profile...");
          const userPasswordGenerated = `temp-${Date.now()}-${Math.random().toString(36)}`;

          const newUser = await apiRequestJson<any>('POST', API_ENDPOINTS.users.create, {
            username: artistSlug,
            email: `${artistSlug}@indiewave.local`,
            password: userPasswordGenerated,
            display_name: draft.artist.trim(),
            bio: `Indie artist sharing music on IndieWave`,
          });

          console.log("New user created:", newUser);
          userId = newUser.id;
          isNewUser = true;

          // Auto-login the newly created user
          setUploadProgress("Setting up your account...");
          try {
            await login(artistSlug, userPasswordGenerated);
          } catch (loginError) {
            console.error("Auto-login failed:", loginError);
          }
        }
      } catch (error) {
        console.error("User creation error:", error);
        throw new Error("Failed to create or find artist profile");
      }

      // Get audio duration
      setUploadProgress("Processing audio file...");
      let audioDuration = 0;
      try {
        audioDuration = await getAudioDuration(draft.audioFile);
      } catch (error) {
        console.error("Failed to get audio duration:", error);
      }

      // Create FormData for file upload
      setUploadProgress("Uploading files...");
      const formData = new FormData();

      // Add all text fields
      formData.append('user_id', userId);
      formData.append('title', draft.title.trim());
      formData.append('artist', draft.artist.trim());
      formData.append('artist_slug', artistSlug);

      if (draft.description.trim()) {
        formData.append('description', draft.description.trim());
      }

      formData.append('genre', draft.genre.trim() || 'Indie');

      if (draft.mood.trim()) {
        formData.append('mood', draft.mood.trim());
      }

      // Add tags as JSON string
      const tags = draft.mood 
        ? [draft.mood.toLowerCase(), draft.genre.toLowerCase()] 
        : [draft.genre.toLowerCase()];
      formData.append('tags', JSON.stringify(tags));

      // Add audio file
      formData.append('audio_file', draft.audioFile);
      formData.append('audio_file_size', draft.audioFile.size.toString());
      formData.append('audio_duration', Math.round(audioDuration).toString());
      formData.append('audio_format', draft.audioFile.type.split("/")[1] || "mp3");

      // Add cover file if provided
      if (draft.coverFile) {
        setUploadProgress("Uploading cover image...");
        formData.append('cover_file', draft.coverFile);
      }

      formData.append('cover_gradient', coverGradient);
      formData.append('published', 'true');

      // Create track with multipart/form-data
      setUploadProgress("Publishing track...");
      const createdTrack = await apiRequestFormData<any>('POST', API_ENDPOINTS.tracks.create, formData);

      setCreatedTrackId(createdTrack.id);
      setSubmitted(true);
      setUploadProgress("");

      toast({
        title: "Track published!",
        description: isNewUser 
          ? `"${draft.title}" is now live! Your credentials are displayed on your artist page.`
          : `"${draft.title}" is now live on your artist page.`,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress("");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const artistSlug = useMemo(
    () =>
      (draft.artist || "your-artist")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    [draft.artist]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(1100px_520px_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(900px_400px_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-upload">
                <CloudUpload className="mr-1 h-3.5 w-3.5" />
                Upload
              </Badge>
              <span className="text-xs text-muted-foreground" data-testid="text-upload-note">
                Share your music with the world
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight" data-testid="text-upload-title">
              Share your next release
            </h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="text-upload-subtitle">
              Add a title, pick an audio file, and generate a shareable artist page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="secondary" className="border-white/10 bg-white/5" data-testid="button-back-home">
                Back to Home
              </Button>
            </Link>
          </div>
        </header>

        {isSubmitting && uploadProgress && (
          <div
            className="glass glow noise mt-6 rounded-3xl border border-white/10 p-5"
            data-testid="status-upload-progress"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <div className="text-sm font-semibold">Uploading...</div>
                <div className="mt-1 text-sm text-muted-foreground">{uploadProgress}</div>
              </div>
            </div>
          </div>
        )}

        {submitted && (
          <div
            className="glass glow noise mt-6 rounded-3xl border border-white/10 p-5"
            data-testid="status-upload-success"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Published successfully!</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Your track has been saved and is now live on your artist page.
                    {authUser && " Check your credentials in the Account Credentials section!"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="border-white/10 bg-white/5"
                  data-testid="button-copy-link"
                  onClick={() => {
                    const url = `${window.location.origin}/artist/${artistSlug}`;
                    navigator.clipboard.writeText(url);
                    toast({
                      title: "Link copied!",
                      description: "Artist page link copied to clipboard.",
                    });
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy artist link
                </Button>
                <Link href={`/artist/${artistSlug}`}>
                  <Button data-testid="button-view-artist">View artist page</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="glass glow noise rounded-3xl border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" data-testid="text-form-title">
                    Track details
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground" data-testid="text-form-subtitle">
                    Keep it simple—listeners decide in seconds.
                  </div>
                </div>
                <Badge variant="outline" className="border-white/12" data-testid="badge-step-1">
                  Step 1/2
                </Badge>
              </div>

              <Separator className="my-4 opacity-60" />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Track title *</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Neon Postcard"
                    data-testid="input-track-title"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="artist">Artist name *</Label>
                  <Input
                    id="artist"
                    value={draft.artist}
                    onChange={(e) => update("artist", e.target.value)}
                    placeholder="e.g. Nova Sky"
                    data-testid="input-artist-name"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      value={draft.genre}
                      onChange={(e) => update("genre", e.target.value)}
                      placeholder="Indie / Lo-fi / Pop"
                      data-testid="input-genre"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mood">Mood</Label>
                    <Input
                      id="mood"
                      value={draft.mood}
                      onChange={(e) => update("mood", e.target.value)}
                      placeholder="Cozy / Driving / Bright"
                      data-testid="input-mood"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Optional: a quick note for listeners…"
                    data-testid="input-description"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="text-sm font-semibold" data-testid="text-files-title">
                    Files
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className={cn(
                        "group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3 transition hover:bg-white/6",
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                      data-testid="label-audio-upload"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                        <AudioLines className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Audio file *</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground" data-testid="text-audio-file">
                          {draft.audioFile?.name || "Choose .mp3 or .wav"}
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => update("audioFile", e.target.files?.[0] || null)}
                        data-testid="input-audio-file"
                        disabled={isSubmitting}
                      />
                    </label>

                    <label
                      className={cn(
                        "group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3 transition hover:bg-white/6",
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                      data-testid="label-cover-upload"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                        <ImageIcon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Cover image</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground" data-testid="text-cover-file">
                          {draft.coverFile?.name || "Optional"}
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => update("coverFile", e.target.files?.[0] || null)}
                        data-testid="input-cover-file"
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Files are uploaded using multipart/form-data. Make sure your backend accepts FormData with 'audio_file' and 'cover_file' fields.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="glass glow noise rounded-3xl border border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" data-testid="text-preview-title">
                    Preview
                  </div>
                  <Badge variant="outline" className="border-white/12" data-testid="badge-step-2">
                    Step 2/2
                  </Badge>
                </div>

                <Separator className="my-4 opacity-60" />

                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br",
                      !previewUrl && coverGradient
                    )}
                    aria-hidden="true"
                  >
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                        data-testid="img-cover-preview"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold" data-testid="text-preview-track-title">
                      {draft.title || "Track title"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground" data-testid="text-preview-artist">
                      {draft.artist || "Artist name"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-preview-genre">
                        {draft.genre || "Genre"}
                      </Badge>
                      <Badge variant="outline" className="border-white/12" data-testid="badge-preview-mood">
                        {draft.mood || "Mood"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold" data-testid="text-preview-player">
                        Quick preview
                      </div>
                    </div>
                  </div>
                  {audioPreviewUrl ? (
                    <audio
                      controls
                      src={audioPreviewUrl}
                      className="h-10 w-full"
                      data-testid="audio-preview-player"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground" data-testid="text-preview-player-note">
                      {draft.audioFile 
                        ? "Audio preview available after upload"
                        : "Upload an audio file to enable preview"}
                    </div>
                  )}
                  <Button 
                    onClick={onSubmit} 
                    disabled={isSubmitting} 
                    className="w-full mt-4" 
                    data-testid="button-submit-upload-preview"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Publish Track
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="glass glow noise rounded-3xl border border-white/10 p-5">
                <div className="text-sm font-semibold" data-testid="text-share-title">
                  Share
                </div>
                <div className="mt-1 text-sm text-muted-foreground" data-testid="text-share-sub">
                  Get a clean link to your artist page.
                </div>

                <div className="mt-4 grid gap-2">
                  <Label htmlFor="slug">Artist slug</Label>
                  <Input
                    id="slug"
                    value={artistSlug}
                    readOnly
                    data-testid="input-artist-slug"
                  />
                  <div className="text-xs text-muted-foreground">This becomes /artist/&lt;slug&gt;.</div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    className="border-white/10 bg-white/5"
                    onClick={() => {
                      const url = `${window.location.origin}/artist/${artistSlug}`;
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "Link copied!",
                        description: "Artist page link copied to clipboard.",
                      });
                    }}
                    data-testid="button-copy-artist-link"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>

                  <Link href={`/artist/${artistSlug}`}>
                    <Button data-testid="button-open-artist" className="w-full">Open artist page</Button>
                  </Link>
                </div>
              </div>

              <div className="glass glow noise rounded-3xl border border-white/10 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <div className="text-sm font-semibold" data-testid="text-quality-title">
                    Quick quality checklist
                  </div>
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {[
                    "Lead with your best 12 seconds",
                    "Add a clear genre + mood",
                    "A cover image helps a lot",
                    "Share to 2-3 places today",
                  ].map((t, i) => (
                    <li key={t} className="flex items-start gap-2" data-testid={`row-checklist-${i}`}>
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>

        <div className="h-16" aria-hidden="true" />
      </div>
    </div>
  );
}