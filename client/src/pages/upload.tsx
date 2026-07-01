import { useMemo, useState, useCallback, useRef, useEffect, useId } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  Globe,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  Music2,
  Search,
  Sparkles,
  User as UserIcon,
  X,
  Zap,
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
  originalArtist: string;
  email: string;
  genres: string[];
  moods: string[];
  description: string;
  lyrics: string;
  videoUrl: string;
  audioFile: File | null;
  coverFile: File | null;
  visibility: "public" | "private";
}

type RecognitionStatus = "idle" | "processing" | "matched" | "no_match" | "error";

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

// Write a 4-char ASCII string into a DataView
function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// Encode an AudioBuffer as a 16-bit PCM WAV ArrayBuffer
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const byteLen = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(byteLen);
  const view = new DataView(ab);

  writeStr(view, 0, "RIFF");
  view.setUint32(4, byteLen - 8, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, len * numCh * 2, true);

  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return ab;
}

// Decode `file`, trim to `seconds`, re-encode as WAV File
async function extractFirstSeconds(file: File, seconds: number): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }
  const sr = decoded.sampleRate;
  const numCh = decoded.numberOfChannels;
  const targetLen = Math.min(Math.floor(seconds * sr), decoded.length);
  const offCtx = new OfflineAudioContext(numCh, targetLen, sr);
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start(0);
  const rendered = await offCtx.startRendering();
  const wav = audioBufferToWav(rendered);
  return new File([wav], "snippet.wav", { type: "audio/wav" });
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setSizeError(true);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSizeError(false);
    onFile(file);
  }, [onFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    setSizeError(false);
    onFile(null as unknown as File);
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200",
        dragging
          ? "border-primary/60 bg-primary/5 scale-[1.01]"
          : fileName
            ? "border-white/15 bg-white/4 hover:border-white/25 hover:bg-white/6"
            : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5",
        disabled && "pointer-events-none opacity-50"
      )}
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
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {sizeError && (
        <p className="relative z-10 mt-1 text-xs font-medium text-red-400">
          File exceeds 10 MB limit — please choose a smaller file.
        </p>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </label>
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
  const isReady = draft.title.trim() && draft.artist.trim() && draft.audioFile && !!draft.coverFile;

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
        {draft.genres.map((g) => (
          <Badge key={g} variant="secondary" className="border-white/10 bg-white/5 text-[10px]">{g}</Badge>
        ))}
        {draft.moods.map((m) => (
          <Badge key={m} variant="secondary" className="border-fuchsia-500/20 bg-fuchsia-500/8 text-fuchsia-300 text-[10px]">{m}</Badge>
        ))}
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
          Fill in title, artist, audio & cover to publish
        </p>
      )}
    </div>
  );
}

// ─── Recognition Status Banner ───────────────────────────────────────────────

function RecognitionBanner({ status, matchedTitle, matchedArtist }: {
  status: RecognitionStatus;
  matchedTitle?: string;
  matchedArtist?: string;
}) {
  if (status === "idle") return null;

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5" data-testid="status-recognition-processing">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        <div>
          <div className="text-xs font-medium text-primary">Recognizing track…</div>
          <div className="text-[10px] text-muted-foreground">Checking first 15 seconds against music database</div>
        </div>
      </div>
    );
  }

  if (status === "matched") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5" data-testid="status-recognition-matched">
        <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
        <div className="min-w-0">
          <div className="text-xs font-medium text-emerald-400">Track recognized!</div>
          {matchedTitle && (
            <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
              <span className="text-foreground">{matchedTitle}</span>
              {matchedArtist && <> · {matchedArtist}</>}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">Form pre-filled with metadata</div>
        </div>
      </div>
    );
  }

  if (status === "no_match") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5" data-testid="status-recognition-no-match">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="text-xs text-muted-foreground">No match found — fill in details manually</div>
      </div>
    );
  }

  // error — silent, don't disrupt the user
  return null;
}

// ─── Upload Page ──────────────────────────────────────────────────────────────

export default function Upload() {
  const { toast } = useToast();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { genres } = useGenres();

  const isLoggedInArtist = !!(authUser && ((authUser as any).isArtist || (authUser as any).is_artist));

  const authDisplayName = authUser
    ? (authUser as any).display_name || authUser.displayName || authUser.username || ""
    : "";

  const [draft, setDraft] = useState<UploadDraft>({
    title: "",
    artist: isLoggedInArtist ? authDisplayName : "",
    originalArtist: "",
    email: isLoggedInArtist ? (authUser?.email ?? "") : "",
    genres: ["Indie"],
    moods: [],
    description: "",
    lyrics: "",
    videoUrl: "",
    audioFile: null,
    coverFile: null,
    visibility: "public",
  });

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [createdTrackId, setCreatedTrackId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [customGenreInput, setCustomGenreInput] = useState("");

  // Recognition state
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [recognitionMatch, setRecognitionMatch] = useState<{ title: string; artist: string } | null>(null);
  const recognitionAbortRef = useRef<AbortController | null>(null);

  const audioAccept = useMemo(() => {
    const isAndroid = /android/i.test(navigator.userAgent);
    return isAndroid
      ? ".mp3,.m4a,.aac,.wav,.flac,.ogg,.aiff,.aif"
      : "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.aiff,.aif";
  }, []);

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Cleanup recognition abort on unmount
  useEffect(() => {
    return () => { recognitionAbortRef.current?.abort(); };
  }, []);

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

  // Toggle a genre in/out of the selected genres array
  function toggleGenre(g: string) {
    setDraft((d) => ({
      ...d,
      genres: d.genres.includes(g)
        ? d.genres.filter((x) => x !== g)
        : [...d.genres, g],
    }));
  }

  // Add a custom genre from the text input
  function addCustomGenre() {
    const val = customGenreInput.trim();
    if (!val) return;
    setDraft((d) => ({
      ...d,
      genres: d.genres.includes(val) ? d.genres : [...d.genres, val],
    }));
    setCustomGenreInput("");
  }

  // Toggle a mood in/out of the selected moods array
  function toggleMood(m: string) {
    setDraft((d) => ({
      ...d,
      moods: d.moods.includes(m)
        ? d.moods.filter((x) => x !== m)
        : [...d.moods, m],
    }));
  }

  // ── Music recognition pipeline ──────────────────────────────────────────────
  async function runRecognition(file: File) {
    // Cancel any in-flight recognition
    recognitionAbortRef.current?.abort();
    const abort = new AbortController();
    recognitionAbortRef.current = abort;

    setRecognitionStatus("processing");
    setRecognitionMatch(null);

    try {
      // 1. Extract first 15 seconds as WAV
      let snippet: File;
      try {
        snippet = await extractFirstSeconds(file, 15);
      } catch {
        // If audio decoding fails (unsupported codec, etc.) skip recognition silently
        setRecognitionStatus("error");
        return;
      }

      if (abort.signal.aborted) return;

      // 2. Submit for recognition
      const fd = new FormData();
      fd.append("audio", snippet, "snippet.wav");

      let jobId: string;
      try {
        const res = await apiRequestFormData<{ job_id: string }>(
          "POST",
          API_ENDPOINTS.shazam.recognize,
          fd
        );
        jobId = res.job_id;
      } catch {
        setRecognitionStatus("error");
        return;
      }

      if (abort.signal.aborted) return;

      // 3. Poll for result (max 20 × 2s = 40s)
      for (let i = 0; i < 20; i++) {
        await sleep(2000);
        if (abort.signal.aborted) return;

        let result: any;
        try {
          result = await apiRequestJson(
            "GET",
            API_ENDPOINTS.shazam.recognizeResult(jobId)
          );
        } catch {
          continue; // transient error — keep polling
        }

        if (abort.signal.aborted) return;

        if (result.status === "done") {
          if (result.matched && result.track) {
            const t = result.track;
            setRecognitionMatch({ title: t.title ?? "", artist: t.artist ?? "" });
            setRecognitionStatus("matched");

            // Backfill form fields
            setDraft((d) => {
              // Merge genres (case-insensitive dedup)
              const existingLower = d.genres.map((x) => x.toLowerCase());
              const incoming: string[] = Array.isArray(t.genres) ? t.genres : [];
              // Also pull genres from rights if present
              const fromRights: string[] = Array.isArray(result.rights?.genres) ? result.rights.genres : [];
              const merged = [...d.genres];
              for (const g of [...incoming, ...fromRights]) {
                if (g && !existingLower.includes(g.toLowerCase())) {
                  merged.push(g);
                  existingLower.push(g.toLowerCase());
                }
              }
              return {
                ...d,
                // Only backfill title if user hasn't typed one
                title: d.title.trim() ? d.title : (t.title ?? d.title),
                originalArtist: t.artist ?? d.originalArtist,
                genres: merged,
              };
            });
          } else {
            setRecognitionStatus("no_match");
          }
          return;
        }

        if (result.status === "failed") {
          setRecognitionStatus("no_match");
          return;
        }
        // status === "pending" → keep polling
      }

      // Timed out
      setRecognitionStatus("no_match");
    } catch {
      if (!abort.signal.aborted) setRecognitionStatus("error");
    }
  }

  // Called when audio file is selected
  function handleAudioFile(f: File | null) {
    // Cancel any prior recognition
    recognitionAbortRef.current?.abort();
    if (!f) {
      setRecognitionStatus("idle");
      setRecognitionMatch(null);
      update("audioFile", null);
      return;
    }
    update("audioFile", f);
    runRecognition(f);
  }

  async function onSubmit() {
    if (!draft.title.trim()) return toast({ title: "Missing title", variant: "destructive" });
    if (!draft.artist.trim()) return toast({ title: "Missing artist name", variant: "destructive" });
    if (!authUser && !draft.email.trim()) return toast({ title: "Missing email", variant: "destructive" });
    if (!draft.audioFile) return toast({ title: "Missing audio file", variant: "destructive" });
    if (!draft.coverFile) return toast({ title: "Missing cover art", description: "A cover image is required.", variant: "destructive" });

    setIsSubmitting(true);
    setUploadProgress("Preparing upload…");

    try {
      let userId: string;
      let isNewUser = false;

      if (authUser) {
        userId = authUser.id;
        setUploadProgress("Processing audio…");
      } else {
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

      const resolvedGenres = draft.genres.length > 0 ? draft.genres : ["Indie"];
      const originalArtist = draft.originalArtist.trim() || draft.artist.trim();

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("title", draft.title.trim());
      formData.append("artist", draft.artist.trim());
      formData.append("original_artist", originalArtist);
      formData.append("artist_slug", artistSlug);
      if (draft.description.trim()) formData.append("description", draft.description.trim());
      formData.append("genre", JSON.stringify(resolvedGenres));
      if (draft.moods.length > 0) formData.append("mood", draft.moods.join(", "));

      const tagParts = [
        ...draft.moods.map((m) => m.toLowerCase()),
        ...resolvedGenres.map((g) => g.toLowerCase()),
      ];
      formData.append("tags", JSON.stringify(Array.from(new Set(tagParts))));

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
      formData.append("visibility", draft.visibility);
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
            <div className="glass glow noise rounded-3xl border border-white/10 p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30"
              >
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </motion.div>

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
                      originalArtist: "",
                      email: isLoggedInArtist ? (authUser?.email ?? "") : "",
                      genres: ["Indie"],
                      moods: [],
                      description: "",
                      lyrics: "",
                      videoUrl: "",
                      audioFile: null,
                      coverFile: null,
                      visibility: "public",
                    });
                    setPreviewUrl(null);
                    setAudioPreviewUrl(null);
                    setRecognitionStatus("idle");
                    setRecognitionMatch(null);
                    setSubmitted(false);
                    setStep(0);
                  }}
                  data-testid="button-upload-another"
                >
                  Upload another track
                </Button>
              </div>
            </div>

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
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/">
              <Button variant="secondary" size="icon" className="shrink-0 border-white/10 bg-white/5 sm:w-auto sm:px-3" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline text-sm">Home</span>
              </Button>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/30 to-fuchsia-500/20">
                <CloudUpload className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight sm:text-xl" data-testid="text-upload-title">
                  Share your release
                </h1>
                <p className="text-[10px] text-muted-foreground sm:text-xs" data-testid="text-upload-subtitle">
                  Upload a track and get a live artist page
                </p>
              </div>
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

                      {/* Artist + Email */}
                      {authLoading ? (
                        <div className="h-10 w-full animate-pulse rounded-xl border border-white/10 bg-white/4" />
                      ) : isLoggedInArtist ? (
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

                      {/* Genre pills — multi-select */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Genre
                          {draft.genres.length > 0 && (
                            <span className="ml-1.5 text-muted-foreground font-normal">({draft.genres.length} selected)</span>
                          )}
                        </Label>
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
                              onClick={() => toggleGenre(g)}
                              className={cn(
                                "shrink-0 rounded-full border px-3 py-1 text-xs transition-all",
                                draft.genres.includes(g)
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:text-foreground"
                              )}
                              data-testid={`genre-pill-${g.toLowerCase().replace(/[\s/&]/g, "-")}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        {/* Custom genre chips (genres not in the standard list) */}
                        {draft.genres.filter((g) => !genres.includes(g)).map((g) => (
                          <div key={g} className="flex items-center gap-1.5">
                            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">{g}</span>
                            <button
                              type="button"
                              onClick={() => toggleGenre(g)}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-muted-foreground hover:bg-white/14 hover:text-foreground transition"
                              data-testid={`remove-genre-${g.toLowerCase().replace(/[\s/&]/g, "-")}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {/* Add custom genre */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Input
                            value={customGenreInput}
                            onChange={(e) => setCustomGenreInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomGenre(); } }}
                            placeholder="Add custom genre… (Enter)"
                            className="h-8 flex-1 text-xs"
                            data-testid="input-custom-genre"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs border-white/10 bg-white/5"
                            onClick={addCustomGenre}
                            disabled={!customGenreInput.trim() || isSubmitting}
                            data-testid="button-add-custom-genre"
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      {/* Mood pills — multi-select */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Mood
                          <span className="text-muted-foreground font-normal ml-1">
                            (optional{draft.moods.length > 0 ? `, ${draft.moods.length} selected` : ""})
                          </span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {MOODS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => toggleMood(m)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition-all",
                                draft.moods.includes(m)
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

                      {/* Visibility toggle */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Visibility</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => update("visibility", "public")}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all",
                              draft.visibility === "public"
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"
                            )}
                            data-testid="button-visibility-public"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <div className="text-left">
                              <div className="text-xs font-medium">Public</div>
                              <div className="hidden sm:block text-[10px] opacity-70">Anyone can discover &amp; stream</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => update("visibility", "private")}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all",
                              draft.visibility === "private"
                                ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
                                : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"
                            )}
                            data-testid="button-visibility-private"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <div className="text-left">
                              <div className="text-xs font-medium">Private</div>
                              <div className="hidden sm:block text-[10px] opacity-70">Only shared users can access</div>
                            </div>
                          </button>
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
                        accept={audioAccept}
                        label="Audio file *"
                        hint="Tap to choose — MP3, WAV, M4A, FLAC"
                        icon={AudioLines}
                        fileName={draft.audioFile?.name}
                        disabled={isSubmitting}
                        onFile={handleAudioFile}
                        data-testid="label-audio-upload"
                      />

                      {/* Recognition status */}
                      <RecognitionBanner
                        status={recognitionStatus}
                        matchedTitle={recognitionMatch?.title}
                        matchedArtist={recognitionMatch?.artist}
                      />

                      <DropZone
                        accept="image/*"
                        label="Cover art *"
                        hint="Required — JPG, PNG, WebP"
                        icon={ImageIcon}
                        fileName={draft.coverFile?.name}
                        disabled={isSubmitting}
                        onFile={(f) => update("coverFile", f)}
                        previewUrl={previewUrl}
                        data-testid="label-cover-upload"
                      />
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
                        disabled={isSubmitting || !draft.audioFile || !draft.coverFile}
                        className={cn("glow gap-1.5", (!draft.audioFile || !draft.coverFile) && "opacity-50")}
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
