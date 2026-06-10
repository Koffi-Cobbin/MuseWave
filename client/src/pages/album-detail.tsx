import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Disc3,
  Play,
  Pause,
  Share2,
  Trash2,
  Music2,
  Loader2,
  RefreshCw,
  Globe,
  Lock,
  CalendarDays,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { ShareAlbumModal } from "@/components/albums/ShareAlbumModal";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Album, Track } from "../../../shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function totalDurationLabel(tracks: Track[]): string {
  const total = tracks.reduce((sum, t) => sum + (t.audioDuration || 0), 0);
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function AlbumCoverLarge({ album }: { album: Album }) {
  return (
    <div
      className={cn(
        "h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:h-52 sm:w-52",
        !album.coverUrl && "bg-gradient-to-br",
        !album.coverUrl && (album.coverGradient ?? "from-sky-500/30 to-fuchsia-500/20"),
      )}
    >
      {album.coverUrl ? (
        <img
          src={album.coverUrl}
          alt={album.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Disc3 className="h-12 w-12 text-white/20" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlbumDetailPage() {
  const [, params] = useRoute("/albums/:id");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { active, isPlaying, setIsPlaying, playQueue } = usePlayer();
  const { toast } = useToast();

  const albumId = params?.id;

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // ── Fetch album (tracks are embedded in the response per the API docs) ───────
  const fetchAlbum = useCallback(
    async (silent = false) => {
      if (!albumId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const data = await apiRequestJson<Album & { tracks?: Track[] }>(
          "GET",
          API_ENDPOINTS.albums.byId(albumId),
        );
        setAlbum(data);
        // The GET /api/albums/<id> endpoint includes the album's tracks directly.
        setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Couldn't load album",
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [albumId, toast],
  );

  useEffect(() => {
    if (albumId) fetchAlbum();
  }, [albumId, fetchAlbum]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isOwner = !!user && !!album && album.userId === user.id;

  // ── Play all ────────────────────────────────────────────────────────────────
  const handlePlayAll = () => {
    if (!tracks.length) return;
    const firstIsActive = active?.id === tracks[0].id;
    if (firstIsActive && tracks.length === 1) {
      setIsPlaying(!isPlaying);
      return;
    }
    playQueue(tracks, 0);
    toast({ title: `Playing ${album?.title ?? "album"}`, description: `${tracks.length} track${tracks.length !== 1 ? "s" : ""}` });
  };

  const handlePlayTrack = (index: number) => {
    if (active?.id === tracks[index].id) {
      setIsPlaying(!isPlaying);
      return;
    }
    playQueue(tracks, index);
  };

  // ── Delete album ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!albumId) return;
    setDeleting(true);
    try {
      await apiRequestJson("DELETE", API_ENDPOINTS.albums.delete(albumId));
      toast({ title: "Album deleted" });
      navigate("/albums");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't delete album",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  // ── Early states ────────────────────────────────────────────────────────────
  if (!albumId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Album not found.</p>
      </div>
    );
  }

  let hasTokens = false;
  try { hasTokens = !!localStorage.getItem("accessToken"); } catch {}
  if (!isAuthenticated) {
    if (hasTokens) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Link href="/albums">
            <Button variant="secondary" size="sm" className="mb-6 border-white/10 bg-white/5">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              My Albums
            </Button>
          </Link>
          <div className="py-20 text-center">
            <Disc3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold">Album not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This album may have been deleted or you don't have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const releaseYear = album.releaseDate
    ? new Date(album.releaseDate).getFullYear()
    : null;
  const totalLabel = totalDurationLabel(tracks);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-44 sm:py-8 sm:pb-36 lg:pb-24">

        {/* ── Back + refresh ──────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/albums">
            <Button
              variant="secondary"
              size="sm"
              className="border-white/10 bg-white/5"
              data-testid="button-back-albums"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              My Albums
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => fetchAlbum(true)}
            disabled={refreshing}
            className="h-8 w-8 border-white/10 bg-white/5"
            title="Refresh"
            data-testid="button-refresh-album"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* ── Hero: cover + meta ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <AlbumCoverLarge album={album} />

            <div className="flex-1 min-w-0">
              {/* Label row */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Album
                </span>
                {album.published ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Lock className="h-3 w-3" />
                    Draft
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1
                className="mb-1 break-words text-3xl font-bold leading-tight sm:text-4xl"
                data-testid="text-album-title"
              >
                {album.title}
              </h1>

              {/* Artist */}
              <p className="mb-3 text-base text-muted-foreground" data-testid="text-album-artist">
                {album.artist}
              </p>

              {/* Stats row */}
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {album.genre && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 shrink-0" />
                    {album.genre}
                  </span>
                )}
                {tracks.length > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span data-testid="text-album-track-count">
                      {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                    </span>
                  </>
                )}
                {totalLabel && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{totalLabel}</span>
                  </>
                )}
                {releaseYear && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      {releaseYear}
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {album.description && (
                <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                  {album.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handlePlayAll}
                  disabled={loading || tracks.length === 0}
                  size="default"
                  className="gap-2 glow"
                  data-testid="button-album-play-all"
                >
                  {active && tracks.some((t) => t.id === active.id) && isPlaying ? (
                    <><Pause className="h-4 w-4 fill-current" />Pause</>
                  ) : (
                    <><Play className="h-4 w-4 fill-current" />Play All</>
                  )}
                </Button>

                {isOwner && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShareOpen(true)}
                      className="gap-1.5 border-white/10 bg-white/5"
                      data-testid="button-album-share"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="gap-1.5 border-white/10 bg-white/5 text-destructive hover:text-destructive"
                      data-testid="button-album-delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <Separator className="mb-6 opacity-20" />

        {/* ── Track list ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/8 bg-white/3 py-16 text-center"
            data-testid="empty-album-tracks"
          >
            <Music2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No tracks in this album</p>
            {isOwner && (
              <p className="mt-1 text-xs text-muted-foreground/60">
                Upload tracks and assign them to this album
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-2xl border border-white/8"
          >
            <AnimatePresence initial={false}>
              {tracks.map((track, index) => {
                const isActive = active?.id === track.id;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "group grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors last:border-0",
                      isActive ? "bg-primary/10" : "hover:bg-white/5",
                    )}
                    data-testid={`row-album-track-${track.id}`}
                  >
                    {/* Index / play button */}
                    <div className="flex items-center justify-center w-7 shrink-0">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handlePlayTrack(index)}
                          className="flex items-center justify-center"
                          aria-label="Toggle play"
                        >
                          {isPlaying ? (
                            <span className="flex gap-[2px] items-end h-4">
                              {[1, 2, 3].map((b) => (
                                <span
                                  key={b}
                                  className="w-[3px] rounded-full bg-primary animate-bounce"
                                  style={{ height: `${8 + b * 3}px`, animationDelay: `${b * 0.12}s` }}
                                />
                              ))}
                            </span>
                          ) : (
                            <Play className="h-4 w-4 fill-current text-primary" />
                          )}
                        </button>
                      ) : (
                        <>
                          <span className="text-xs tabular-nums text-muted-foreground group-hover:hidden">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePlayTrack(index)}
                            className="hidden group-hover:inline-flex"
                            aria-label={`Play ${track.title}`}
                            data-testid={`button-play-track-${track.id}`}
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex min-w-0 items-center gap-3">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br",
                            track.coverGradient ?? "from-sky-500/20 to-fuchsia-500/20",
                          )}
                        >
                          <Music2 className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive && "text-primary",
                          )}
                          data-testid={`text-track-title-${track.id}`}
                        >
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Duration */}
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDuration(track.audioDuration)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Share modal ─────────────────────────────────────────────────────── */}
      {album && isOwner && (
        <ShareAlbumModal
          album={album}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete album?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{album?.title}</strong> will be permanently deleted. Tracks inside will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete-album"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
