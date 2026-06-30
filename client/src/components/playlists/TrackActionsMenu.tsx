import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { useGenres } from "@/hooks/use-genres";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { ShareTrackModal } from "@/components/tracks/ShareTrackModal";
import {
  Plus, Music, MoreVertical, Pencil, Trash2, ListMusic,
  ListEnd, ListOrdered, Users, Globe, Lock, CloudDownload,
  Download, WifiOff, Search, Check, Loader2, Disc3,
} from "lucide-react";
import { API_ENDPOINTS, downloadTrack } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { useOffline } from "@/contexts/offline-context";
import type { Track, Album } from "../../../../shared/schema";

interface TrackActionsMenuProps {
  track: Track;
  isOwner?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  onTrackDeleted?: (trackId: string) => void;
  onTrackUpdated?: (track: Track) => void;
}

export function TrackActionsMenu({
  track,
  isOwner = false,
  size = "sm",
  variant = "ghost",
  onTrackDeleted,
  onTrackUpdated,
}: TrackActionsMenuProps) {
  const { isAuthenticated, user } = useAuth();
  const { insertNext, addToQueue } = usePlayer();
  const { playlists, sharedWithMe, fetchSharedWithMe, addSongToPlaylist, loading } = usePlaylists();
  const { toast } = useToast();
  const { genres } = useGenres();
  const { isTrackDownloaded, downloadForOffline, downloadProgress, isOnline, removeDownload } = useOffline();

  // ── Dropdown state ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);

  // ── Edit track state ────────────────────────────────────────────────────────
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(track.title);
  const [editGenre, setEditGenre] = useState(
    Array.isArray(track.genre) ? (track.genre[0] ?? "") : (track.genre ?? "")
  );
  const [editDescription, setEditDescription] = useState(track.description ?? "");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(
    (track as any).visibility ?? "public"
  );

  // ── Add-to-playlist dialog ──────────────────────────────────────────────────
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());

  // ── Add-to-album dialog ─────────────────────────────────────────────────────
  const [showAddToAlbumDialog, setShowAddToAlbumDialog] = useState(false);
  const [albumSearch, setAlbumSearch] = useState("");
  const [userAlbums, setUserAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [addingToAlbumId, setAddingToAlbumId] = useState<string | null>(null);
  const [addedToAlbumId, setAddedToAlbumId] = useState<string | null>(track.albumId ?? null);

  // ── Derived: playlists the user can add to ──────────────────────────────────
  const editableShared = sharedWithMe.filter((p) => p.myPermission === "edit");
  const hasAnyPlaylist = playlists.length > 0 || editableShared.length > 0;

  const pq = playlistSearch.toLowerCase();
  const filteredOwnedPlaylists = playlists.filter((p) => p.name.toLowerCase().includes(pq));
  const filteredSharedPlaylists = editableShared.filter((p) => p.name.toLowerCase().includes(pq));

  const aq = albumSearch.toLowerCase();
  const filteredAlbums = userAlbums.filter(
    (a) => a.title.toLowerCase().includes(aq) || a.artist.toLowerCase().includes(aq)
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && sharedWithMe.length === 0) fetchSharedWithMe();
  };

  const fetchUserAlbums = useCallback(async () => {
    if (!user?.id) return;
    setAlbumsLoading(true);
    try {
      const data = await apiRequestJson<Album[]>(
        "GET",
        API_ENDPOINTS.albums.byUser(user.id),
      );
      setUserAlbums(Array.isArray(data) ? data : []);
    } catch {
      setUserAlbums([]);
    } finally {
      setAlbumsLoading(false);
    }
  }, [user?.id]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    setAddingToPlaylistId(playlistId);
    try {
      await addSongToPlaylist(playlistId, track.id);
      setAddedPlaylistIds((prev) => new Set(prev).add(playlistId));
      toast({ title: "Added to playlist", description: playlistName });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add to playlist",
      });
    } finally {
      setAddingToPlaylistId(null);
    }
  };

  const handleAddToAlbum = async (album: Album) => {
    if (addedToAlbumId === album.id) return;
    setAddingToAlbumId(album.id);
    try {
      const updated = await apiRequestJson<Track>(
        "PATCH",
        API_ENDPOINTS.tracks.update(track.id),
        { albumId: album.id },
      );
      setAddedToAlbumId(album.id);
      toast({ title: "Added to album", description: album.title });
      onTrackUpdated?.(updated);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add to album",
      });
    } finally {
      setAddingToAlbumId(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequestJson("DELETE", API_ENDPOINTS.tracks.delete(track.id));
      toast({ title: "Track deleted", description: `"${track.title}" has been removed.` });
      onTrackDeleted?.(track.id);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiRequestJson<Track>(
        "PATCH",
        API_ENDPOINTS.tracks.update(track.id),
        { title: editTitle.trim(), genre: editGenre.trim(), description: editDescription.trim(), visibility: editVisibility }
      );
      toast({ title: "Track updated" });
      onTrackUpdated?.(updated);
      setShowEditDialog(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          DROPDOWN MENU
      ══════════════════════════════════════════════════════════════ */}
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={loading}
            aria-label="Track actions"
            className="border-transparent focus-visible:ring-0"
            data-testid={`button-track-actions-${track.id}`}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Playback */}
          <DropdownMenuItem
            onClick={() => { insertNext(track); toast({ title: "Playing next", description: track.title }); }}
            data-testid={`menu-play-next-${track.id}`}
          >
            <ListEnd className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Play next
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => { addToQueue(track); toast({ title: "Added to queue", description: track.title }); }}
            data-testid={`menu-add-to-queue-${track.id}`}
          >
            <ListOrdered className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Add to queue
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Downloads */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Downloads</DropdownMenuLabel>

          {isTrackDownloaded(track.id) ? (
            <>
              <DropdownMenuItem className="text-muted-foreground/50 cursor-not-allowed" disabled data-testid={`menu-save-offline-${track.id}`}>
                <CloudDownload className="h-3.5 w-3.5 mr-2" />
                Saved Offline
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try { await removeDownload(track.id); toast({ title: "Removed from offline", description: `"${track.title}" removed from offline storage.` }); }
                  catch { toast({ title: "Failed to remove", description: "Could not remove this track from offline storage.", variant: "destructive" }); }
                }}
                data-testid={`menu-remove-offline-${track.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Remove from offline
              </DropdownMenuItem>
            </>
          ) : !isOnline ? (
            <DropdownMenuItem className="text-muted-foreground/50 cursor-not-allowed" disabled data-testid={`menu-save-offline-${track.id}`}>
              <WifiOff className="h-3.5 w-3.5 mr-2" />
              Offline — connect to save
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={async () => {
                try { await downloadForOffline(track); toast({ title: "Saved offline", description: track.title }); }
                catch { toast({ title: "Download failed", description: "Could not save this track offline.", variant: "destructive" }); }
              }}
              data-testid={`menu-save-offline-${track.id}`}
            >
              <CloudDownload className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Save Offline
              {track.id in downloadProgress && (
                <span className="ml-auto text-xs">{downloadProgress[track.id]}%</span>
              )}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={async () => {
              try { await downloadTrack(track.id, `${track.artist} - ${track.title}.${track.audioFormat || "mp3"}`); toast({ title: "Download started", description: track.title }); }
              catch { toast({ title: "Download failed", variant: "destructive" }); }
            }}
            data-testid={`menu-download-file-${track.id}`}
          >
            <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Download File
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Owner actions */}
          {isOwner && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Manage track</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditTitle(track.title);
                  setEditGenre(Array.isArray(track.genre) ? (track.genre[0] ?? "") : (track.genre ?? ""));
                  setEditDescription(track.description ?? "");
                  setEditVisibility((track as any).visibility ?? "public");
                  setShowEditDialog(true);
                }}
                data-testid={`menu-edit-track-${track.id}`}
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShareModal(true)} data-testid={`menu-share-track-${track.id}`}>
                <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Manage sharing
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteAlert(true)}
                data-testid={`menu-delete-track-${track.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete track
              </DropdownMenuItem>
              {isAuthenticated && <DropdownMenuSeparator />}
            </>
          )}

          {/* Playlist + Album actions (authenticated) */}
          {isAuthenticated && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setPlaylistSearch("");
                  setAddedPlaylistIds(new Set());
                  setShowAddToPlaylistDialog(true);
                  if (sharedWithMe.length === 0) fetchSharedWithMe();
                }}
                data-testid={`menu-add-to-playlist-${track.id}`}
              >
                <ListMusic className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Add to playlist
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setAlbumSearch("");
                  setShowAddToAlbumDialog(true);
                  fetchUserAlbums();
                }}
                data-testid={`menu-add-to-album-${track.id}`}
              >
                <Disc3 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Add to album
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ══════════════════════════════════════════════════════════════
          ADD TO PLAYLIST DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showAddToPlaylistDialog}
        onOpenChange={(o) => { setShowAddToPlaylistDialog(o); if (!o) setPlaylistSearch(""); }}
      >
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
            <DialogTitle className="text-base">Add to playlist</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground truncate">
              {track.title} — {track.artist}
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search playlists…"
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-search-add-playlist"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-72 px-2 pb-2 [scrollbar-width:thin]">
            {!hasAnyPlaylist ? (
              <p className="text-xs text-muted-foreground text-center py-8">No playlists yet — create one below.</p>
            ) : filteredOwnedPlaylists.length === 0 && filteredSharedPlaylists.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No playlists match your search.</p>
            ) : (
              <>
                {filteredOwnedPlaylists.length > 0 && (
                  <>
                    <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <ListMusic className="h-3 w-3" /> My playlists
                    </p>
                    {filteredOwnedPlaylists.map((playlist) => {
                      const isAdded = addedPlaylistIds.has(playlist.id);
                      const isAdding = addingToPlaylistId === playlist.id;
                      return (
                        <button
                          key={playlist.id}
                          type="button"
                          onClick={() => !isAdded && handleAddToPlaylist(playlist.id, playlist.name)}
                          disabled={isAdding || loading}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            isAdded ? "opacity-60 cursor-default" : "hover:bg-muted/50 active:bg-muted/70 cursor-pointer",
                          )}
                          data-testid={`dialog-add-to-playlist-${playlist.id}`}
                        >
                          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                            <Music className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{playlist.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {playlist.trackIds?.length ?? 0} {(playlist.trackIds?.length ?? 0) === 1 ? "track" : "tracks"}
                            </p>
                          </div>
                          <div className="shrink-0 w-5 flex items-center justify-center">
                            {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              : isAdded ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
                {filteredSharedPlaylists.length > 0 && (
                  <>
                    <p className="px-2 pt-3 pb-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Shared with me
                    </p>
                    {filteredSharedPlaylists.map((playlist) => {
                      const isAdded = addedPlaylistIds.has(playlist.id);
                      const isAdding = addingToPlaylistId === playlist.id;
                      return (
                        <button
                          key={playlist.id}
                          type="button"
                          onClick={() => !isAdded && handleAddToPlaylist(playlist.id, playlist.name)}
                          disabled={isAdding || loading}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            isAdded ? "opacity-60 cursor-default" : "hover:bg-muted/50 active:bg-muted/70 cursor-pointer",
                          )}
                          data-testid={`dialog-add-to-shared-playlist-${playlist.id}`}
                        >
                          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{playlist.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {playlist.trackIds?.length ?? 0} {(playlist.trackIds?.length ?? 0) === 1 ? "track" : "tracks"}
                            </p>
                          </div>
                          <div className="shrink-0 w-5 flex items-center justify-center">
                            {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              : isAdded ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>

          <div className="border-t border-white/8 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => { setShowAddToPlaylistDialog(false); setShowCreateModal(true); }}
              data-testid={`dialog-new-playlist-${track.id}`}
            >
              <Plus className="h-3.5 w-3.5" />
              New playlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          ADD TO ALBUM DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showAddToAlbumDialog}
        onOpenChange={(o) => { setShowAddToAlbumDialog(o); if (!o) setAlbumSearch(""); }}
      >
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
            <DialogTitle className="text-base">Add to album</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground truncate">
              {track.title} — {track.artist}
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search albums…"
                value={albumSearch}
                onChange={(e) => setAlbumSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-search-add-album"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-72 px-2 pb-2 [scrollbar-width:thin]">
            {albumsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : userAlbums.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                You don't have any albums yet.
              </p>
            ) : filteredAlbums.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No albums match your search.
              </p>
            ) : (
              <>
                <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Disc3 className="h-3 w-3" /> My albums
                </p>
                {filteredAlbums.map((album) => {
                  const isCurrent = addedToAlbumId === album.id;
                  const isAdding = addingToAlbumId === album.id;
                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => handleAddToAlbum(album)}
                      disabled={isAdding || isCurrent}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isCurrent ? "opacity-60 cursor-default" : "hover:bg-muted/50 active:bg-muted/70 cursor-pointer",
                      )}
                      data-testid={`dialog-add-to-album-${album.id}`}
                    >
                      {/* Cover */}
                      <div
                        className={cn(
                          "h-9 w-9 rounded-md overflow-hidden shrink-0 border border-white/10",
                          !album.coverUrl && "bg-gradient-to-br",
                          !album.coverUrl && (album.coverGradient ?? "from-emerald-500/20 to-fuchsia-500/20"),
                        )}
                      >
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Disc3 className="h-4 w-4 text-white/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{album.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                      </div>

                      <div className="shrink-0 w-5 flex items-center justify-center">
                        {isAdding ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : isCurrent ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          <div className="border-t border-white/8 px-4 py-3">
            <p className="text-[11px] text-muted-foreground text-center">
              Adding a track to an album links it to that album's page.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          EDIT TRACK DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit track</DialogTitle>
            <DialogDescription>Update the details for "{track.title}".</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Track title"
                data-testid="input-edit-track-title"
              />
            </div>
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
                    onClick={() => setEditGenre(g)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs transition-all",
                      editGenre === g
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20 hover:text-foreground"
                    )}
                    data-testid={`pill-edit-genre-${g.toLowerCase().replace(/[\s/&]/g, "-")}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {editGenre && !genres.includes(editGenre) && (
                <Input
                  value={editGenre}
                  onChange={(e) => setEditGenre(e.target.value)}
                  placeholder="Custom genre…"
                  className="h-9 text-xs"
                  data-testid="input-edit-track-genre"
                />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Tell listeners about this track…"
                rows={3}
                data-testid="input-edit-track-description"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Visibility</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditVisibility("public")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                    editVisibility === "public"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/4 text-muted-foreground"
                  )}
                  data-testid="button-edit-visibility-public"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setEditVisibility("private")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                    editVisibility === "private"
                      ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
                      : "border-white/10 bg-white/4 text-muted-foreground"
                  )}
                  data-testid="button-edit-visibility-private"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Private
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} data-testid="button-save-track-edit">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{track.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the track and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}
      <CreatePlaylistModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <ShareTrackModal trackId={track.id} open={showShareModal} onOpenChange={setShowShareModal} />
    </>
  );
}
