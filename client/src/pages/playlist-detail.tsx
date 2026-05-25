import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { usePlayer } from "@/contexts/player-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Play, Trash2, ArrowLeft, Music, Edit2,
  GripVertical, ListMusic, SkipForward, Share2, Globe, Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RenamePlaylistModal } from "@/components/playlists/RenamePlaylistModal";
import { SharePlaylistModal } from "@/components/playlists/SharePlaylistModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { secondsToTime, cn } from "@/lib/utils";
import type { Playlist, Track } from "../../../shared/schema";

type PlaylistTrack = { id: string; track: Track; position?: number };

export default function PlaylistDetailPage() {
  const [, params] = useRoute("/playlists/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const {
    currentPlaylist, loading, error,
    fetchPlaylistById, removeSongFromPlaylist, deletePlaylist, reorderPlaylistTracks,
    setCurrentPlaylist,
  } = usePlaylists();
  const { setQueue, active } = usePlayer();
  const { toast } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [touchDragging, setTouchDragging] = useState<number | null>(null);

  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const playlistId = params?.id;

  useEffect(() => {
    if (!playlistId) return;
    fetchPlaylistById(playlistId);
  }, [playlistId, fetchPlaylistById]);

  useEffect(() => {
    const tracks = (currentPlaylist?.tracks as unknown as PlaylistTrack[]) || [];
    setLocalTracks(tracks);
  }, [currentPlaylist?.tracks]);

  if (!playlistId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Playlist not found</p>
      </div>
    );
  }

  // Auth is still initialising (e.g. page reload) — show a loading spinner
  // instead of flashing a "Login required" screen.
  let hasTokens = false;
  try { hasTokens = !!localStorage.getItem("accessToken"); } catch {}

  if (!isAuthenticated) {
    if (hasTokens) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Login required</h1>
          <p className="text-muted-foreground mb-6">You must be signed in to view this playlist.</p>
          <Link href="/"><Button variant="outline">Return home</Button></Link>
        </div>
      </div>
    );
  }

  if (loading && !currentPlaylist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !currentPlaylist) {
    return (
      <div className="min-h-screen bg-background">
<div className="max-w-4xl mx-auto px-4 py-8 pb-36 lg:pb-8">
          <Link href="/playlists">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Playlists
            </Button>
          </Link>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const myPermission = currentPlaylist.myPermission;
  const isOwner = myPermission === "owner" || user?.id === currentPlaylist.userId;
  const canEdit = isOwner || myPermission === "edit";
  const totalDuration = localTracks.reduce((sum, t) => sum + (t.track.audioDuration || 0), 0);

  // ── Playback ────────────────────────────────────────────────────────────────

  const handlePlayAll = () => {
    if (localTracks.length === 0) return;
    const tracks = localTracks.map((t) => t.track);
    setQueue(tracks, 0);
    toast({ title: `Playing ${currentPlaylist.name}`, description: `${tracks.length} tracks` });
  };

  const handlePlayTrack = (index: number) => {
    const tracks = localTracks.map((t) => t.track);
    setQueue(tracks, index);
  };

  // ── Remove track ─────────────────────────────────────────────────────────────

  const handleRemoveTrack = async () => {
    if (!trackToRemove) return;
    try {
      await removeSongFromPlaylist(playlistId, trackToRemove);
      toast({ title: "Track removed" });
      setTrackToRemove(null);
    } catch {
      toast({ variant: "destructive", title: "Failed to remove track" });
    }
  };

  // ── Delete playlist ──────────────────────────────────────────────────────────

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist(playlistId);
      toast({ title: "Playlist deleted" });
      setLocation("/playlists");
    } catch {
      toast({ variant: "destructive", title: "Failed to delete playlist" });
    }
  };

  // ── Reorder ──────────────────────────────────────────────────────────────────

  const performReorder = async (from: number, to: number) => {
    if (from === to) return;
    const reordered = [...localTracks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalTracks(reordered);
    setCurrentPlaylist({ ...currentPlaylist, tracks: reordered as unknown as Track[] });
    setIsSavingOrder(true);
    try {
      await reorderPlaylistTracks(
        playlistId,
        reordered.map((t, i) => ({ id: t.id, order: i })),
      );
    } catch {
      toast({ variant: "destructive", title: "Failed to save order" });
      const original = (currentPlaylist.tracks as unknown as PlaylistTrack[]) || [];
      setLocalTracks(original);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragStart = (index: number) => { dragIndex.current = index; };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    dragIndex.current = null;
    dragOverIndex.current = null;
    if (from === null || to === null) return;
    await performReorder(from, to);
  };
  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
  };
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    dragIndex.current = index;
    setTouchDragging(index);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest("[data-drag-index]") as HTMLElement | null;
    if (row) {
      const idx = parseInt(row.dataset.dragIndex ?? "-1", 10);
      if (idx >= 0) dragOverIndex.current = idx;
    }
  };
  const handleTouchEnd = async () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    dragIndex.current = null;
    dragOverIndex.current = null;
    setTouchDragging(null);
    if (from === null || to === null) return;
    await performReorder(from, to);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-36 lg:pb-8">

        <Link href="/playlists">
          <Button variant="outline" size="sm" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Playlists
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex gap-6 items-end">
            <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center shrink-0 border border-white/10">
              <ListMusic className="w-14 h-14 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Playlist</p>
                {/* Visibility & permission badges */}
                {currentPlaylist.public ? (
                  <Badge variant="secondary" className="gap-1 text-xs py-0">
                    <Globe className="h-3 w-3" />Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs py-0">
                    <Lock className="h-3 w-3" />Private
                  </Badge>
                )}
                {myPermission && myPermission !== "owner" && (
                  <Badge variant="outline" className="text-xs py-0 capitalize">
                    {myPermission === "edit" ? "Editor" : "Viewer"}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-2 break-words">{currentPlaylist.name}</h1>
              {currentPlaylist.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{currentPlaylist.description}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{localTracks.length} {localTracks.length === 1 ? "track" : "tracks"}</span>
                {totalDuration > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{secondsToTime(totalDuration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <Button
              onClick={handlePlayAll}
              disabled={localTracks.length === 0}
              size="lg"
              className="gap-2 glow"
              data-testid="button-playlist-play-all"
            >
              <Play className="h-5 w-5 fill-current" />
              Play All
            </Button>

            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  data-testid="button-playlist-edit"
                >
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  data-testid="button-playlist-share"
                >
                  <Share2 className="h-4 w-4 mr-2" />Share
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Track list */}
        {localTracks.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 rounded-2xl border border-white/5 mb-6">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tracks in this playlist yet</p>
            {canEdit && (
              <>
                <p className="text-xs text-muted-foreground mt-2">Browse tracks and add them from the track menu</p>
                <Link href="/discover">
                  <Button size="sm" className="mt-4 glow" data-testid="button-add-track-from-discover">
                    Add Tracks
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 overflow-hidden mb-8">
            {localTracks.map((item, index) => {
              const isActive = active?.id === item.track.id;
              const isTouchDragged = touchDragging === index;
              return (
                <div
                  key={item.id}
                  data-drag-index={index}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "grid gap-3 items-center px-4 py-3 transition-colors group",
                    "border-b border-white/5 last:border-0",
                    canEdit
                      ? "grid-cols-[auto_auto_1fr_auto_auto]"
                      : "grid-cols-[auto_1fr_auto]",
                    isActive ? "bg-primary/10" : "hover:bg-muted/40",
                    isTouchDragged && "opacity-50 scale-[0.98]",
                  )}
                  data-testid={`row-playlist-track-${item.track.id}`}
                >
                  {/* Drag handle (edit permission only) */}
                  {canEdit && (
                    <div
                      className="w-4 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors touch-none select-none"
                      data-testid={`drag-handle-${item.track.id}`}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}

                  {/* Index / play indicator */}
                  <div className="w-6 text-right">
                    {isActive ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
                    )}
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handlePlayTrack(index)}
                        className="hidden group-hover:inline-flex items-center justify-center"
                        aria-label={`Play ${item.track.title}`}
                        data-testid={`button-play-track-${item.track.id}`}
                      >
                        <Play className="h-4 w-4 fill-current text-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="min-w-0 flex items-center gap-3">
                    {item.track.coverUrl ? (
                      <button
                        type="button"
                        onClick={() => handlePlayTrack(index)}
                        className="shrink-0"
                        aria-label={`Play ${item.track.title}`}
                      >
                        <img
                          src={item.track.coverUrl}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayTrack(index)}
                        className={cn(
                          "h-10 w-10 rounded-lg shrink-0 flex items-center justify-center border border-white/10",
                          "bg-gradient-to-br",
                          item.track.coverGradient || "from-purple-500/30 to-pink-500/20",
                        )}
                        aria-label={`Play ${item.track.title}`}
                      >
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <p className={cn("font-medium truncate text-sm", isActive && "text-primary")}>
                        {item.track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.track.artist}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-muted-foreground tabular-nums text-right">
                    {secondsToTime(item.track.audioDuration)}
                  </div>

                  {/* Remove (edit permission only) */}
                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrackToRemove(item.track.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity px-2"
                      data-testid={`button-remove-track-${item.track.id}`}
                      aria-label="Remove from playlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isSavingOrder && (
          <p className="text-xs text-muted-foreground text-center -mt-4 mb-4 flex items-center justify-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving order…
          </p>
        )}

        {/* Delete — owner only */}
        {isOwner && (
          <Button
            variant="destructive"
            onClick={handleDeletePlaylist}
            className="w-full"
            data-testid="button-delete-playlist"
          >
            Delete Playlist
          </Button>
        )}
      </div>

      {/* Edit modal */}
      {currentPlaylist && (
        <RenamePlaylistModal
          playlist={currentPlaylist}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />
      )}

      {/* Share modal */}
      {currentPlaylist && isOwner && (
        <SharePlaylistModal
          playlist={currentPlaylist}
          open={showShareModal}
          onOpenChange={setShowShareModal}
          onPlaylistUpdated={(updates) => {
            setCurrentPlaylist({ ...currentPlaylist, ...updates } as Playlist & { tracks?: Track[] });
          }}
        />
      )}

      {/* Remove track confirmation */}
      <AlertDialog open={!!trackToRemove} onOpenChange={(open) => { if (!open) setTrackToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove track</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this track from the playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveTrack}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
