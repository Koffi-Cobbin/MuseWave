import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { usePlayer } from "@/contexts/player-context";
import { Button } from "@/components/ui/button";
import {
  Loader2, Play, Trash2, ArrowLeft, Music, Edit2,
  GripVertical, ListMusic, SkipForward,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RenamePlaylistModal } from "@/components/playlists/RenamePlaylistModal";
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
import type { Track } from "../../../shared/schema";

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
  const { setQueue, active, setActive, setIsPlaying, setAutoPlay } = usePlayer();
  const { toast } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const playlistId = params?.id;

  useEffect(() => {
    if (!isAuthenticated || !playlistId) return;
    fetchPlaylistById(playlistId);
  }, [isAuthenticated, playlistId, fetchPlaylistById]);

  // Sync localTracks from context whenever playlist data changes
  useEffect(() => {
    const tracks = (currentPlaylist?.tracks as unknown as PlaylistTrack[]) || [];
    setLocalTracks(tracks);
  }, [currentPlaylist?.tracks]);

  if (!playlistId) return <div>Playlist not found</div>;

  if (!isAuthenticated) {
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
        <div className="max-w-4xl mx-auto px-4 py-8">
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

  const isOwner = user?.id === currentPlaylist.userId;
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

  // ── Drag-and-drop reorder ────────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    // Optimistically reorder
    const reordered = [...localTracks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalTracks(reordered);

    // Also update context optimistically so play-all uses new order
    setCurrentPlaylist({
      ...currentPlaylist,
      tracks: reordered as unknown as Track[],
    });

    dragIndex.current = null;
    dragOverIndex.current = null;

    // Persist to API
    setIsSavingOrder(true);
    try {
      await reorderPlaylistTracks(playlistId, reordered.map((t) => t.track.id));
    } catch {
      toast({ variant: "destructive", title: "Failed to save order" });
      // Rollback
      const original = (currentPlaylist.tracks as unknown as PlaylistTrack[]) || [];
      setLocalTracks(original);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Back */}
        <Link href="/playlists">
          <Button variant="outline" size="sm" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Playlists
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex gap-6 items-end">
            {/* Cover */}
            <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center shrink-0 border border-white/10">
              <ListMusic className="w-14 h-14 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Playlist</p>
              <h1 className="text-4xl font-bold mb-2 truncate">{currentPlaylist.name}</h1>
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
          <div className="flex items-center gap-3 mt-6">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                data-testid="button-playlist-edit"
              >
                <Edit2 className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
          </div>
        </div>

        {/* Track list */}
        {localTracks.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 rounded-2xl border border-white/5">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tracks in this playlist yet</p>
            {isOwner && (
              <p className="text-xs text-muted-foreground mt-2">Browse tracks and add them from the track menu</p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 overflow-hidden mb-8">
            {/* Header row */}
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-white/8 bg-muted/20">
              {isOwner && <div className="w-4" />}
              <div className="w-6 text-right">#</div>
              <div>Title</div>
              <div className="text-right">Duration</div>
              {isOwner && <div className="w-8" />}
            </div>

            {localTracks.map((item, index) => {
              const isActive = active?.id === item.track.id;
              return (
                <div
                  key={item.id}
                  draggable={isOwner}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center px-4 py-3 transition-colors group",
                    "border-b border-white/5 last:border-0",
                    isActive ? "bg-primary/10" : "hover:bg-muted/40",
                    isOwner && "cursor-default",
                  )}
                  data-testid={`row-playlist-track-${item.track.id}`}
                >
                  {/* Drag handle (owner only) */}
                  {isOwner && (
                    <div
                      className="w-4 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors touch-none"
                      data-testid={`drag-handle-${item.track.id}`}
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
                      <img
                        src={item.track.coverUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className={cn(
                        "h-10 w-10 rounded-lg shrink-0 flex items-center justify-center border border-white/10",
                        "bg-gradient-to-br",
                        item.track.coverGradient || "from-purple-500/30 to-pink-500/20",
                      )}>
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
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

                  {/* Remove (owner only) */}
                  {isOwner ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrackToRemove(item.track.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity px-2"
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

        {/* Delete */}
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
