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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

  const coverGradient = useMemo(() => gradientFromTitle(draft.title), [draft.title]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
  }

  function onSubmit() {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
                Prototype flow (files stay on your device)
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
            <Button onClick={onSubmit} data-testid="button-submit-upload">
              <Sparkles className="mr-2 h-4 w-4" />
              Publish
            </Button>
          </div>
        </header>

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
                  <div className="text-sm font-semibold">Published (mock)</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    This is a prototype: your upload isn’t stored yet. You can still share the
                    layout and flow.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="border-white/10 bg-white/5"
                  data-testid="button-copy-link"
                  onClick={() => {
                    const url = `${window.location.origin}/artist/${encodeURIComponent(
                      (draft.artist || "your-artist")
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    )}`;
                    navigator.clipboard.writeText(url);
                  }}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy artist link
                </Button>
                <Link
                  href={`/artist/${(draft.artist || "your-artist")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")}`}
                >
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
                  <Label htmlFor="title">Track title</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Neon Postcard"
                    data-testid="input-track-title"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="artist">Artist name</Label>
                  <Input
                    id="artist"
                    value={draft.artist}
                    onChange={(e) => update("artist", e.target.value)}
                    placeholder="e.g. Nova Sky"
                    data-testid="input-artist-name"
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
                      )}
                      data-testid="label-audio-upload"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                        <AudioLines className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Audio file</div>
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
                      />
                    </label>

                    <label
                      className={cn(
                        "group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3 transition hover:bg-white/6",
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
                      />
                    </label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    In this mockup, uploads aren’t stored. We’re focusing on the experience.
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
                      !previewUrl && coverGradient,
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
                    <Button size="sm" variant="secondary" className="border-white/10 bg-white/5" data-testid="button-preview-play">
                      Play
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid="text-preview-player-note">
                    Audio playback will be wired once this prototype is upgraded.
                  </div>
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
                    value={(draft.artist || "your-artist")
                      .trim()
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")}
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
                      const url = `${window.location.origin}/artist/${(draft.artist || "your-artist")
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")}`;
                      navigator.clipboard.writeText(url);
                    }}
                    data-testid="button-copy-artist-link"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>

                  <Link
                    href={`/artist/${(draft.artist || "your-artist")
                      .trim()
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")}`}
                  >
                    <Button data-testid="button-open-artist">Open artist page</Button>
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
