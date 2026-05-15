import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { Plus, Music, MoreVertical, Pencil, Trash2, ListMusic, ListEnd, ListOrdered, Users } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track } from "../../../../shared/schema";

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
  const { isAuthenticated } = useAuth();
  const { insertNext, addToQueue } = usePlayer();
  const { playlists, sharedWithMe, fetchSharedWithMe, addSongToPlaylist, loading } = usePlaylists();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(track.title);
  const [editGenre, setEditGenre] = useState(track.genre ?? "");
  const [editDescription, setEditDescription] = useState(track.description ?? "");

  // Playlists where the user can add tracks (owned + shared with edit permission)
  const editableShared = sharedWithMe.filter((p) => p.myPermission === "edit");
  const hasAnyPlaylist = playlists.length > 0 || editableShared.length > 0;

  // Fetch shared playlists lazily when the menu first opens (if not yet loaded)
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && sharedWithMe.length === 0) {
      fetchSharedWithMe();
    }
  };

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    try {
      await addSongToPlaylist(playlistId, track.id);
      toast({ title: "Added to playlist", description: playlistName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add to playlist";
      toast({ variant: "destructive", title: "Error", description: msg });
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
        { title: editTitle.trim(), genre: editGenre.trim(), description: editDescription.trim() }
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
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={loading}
            aria-label="Track actions"
            className="border-transparent"
            data-testid={`button-track-actions-${track.id}`}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* ── Playback actions ── */}
          <DropdownMenuItem
            onClick={() => {
              insertNext(track);
              toast({ title: "Playing next", description: track.title });
            }}
            data-testid={`menu-play-next-${track.id}`}
          >
            <ListEnd className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Play next
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              addToQueue(track);
              toast({ title: "Added to queue", description: track.title });
            }}
            data-testid={`menu-add-to-queue-${track.id}`}
          >
            <ListOrdered className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Add to queue
          </DropdownMenuItem>

          {(isOwner || isAuthenticated) && <DropdownMenuSeparator />}

          {/* ── Owner actions ── */}
          {isOwner && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Manage track</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditTitle(track.title);
                  setEditGenre(track.genre ?? "");
                  setEditDescription(track.description ?? "");
                  setShowEditDialog(true);
                }}
                data-testid={`menu-edit-track-${track.id}`}
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Edit details
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

          {/* ── Playlist actions (authenticated users) ── */}
          {isAuthenticated && (
            <>
              {hasAnyPlaylist ? (
                <>
                  {/* My playlists */}
                  {playlists.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <ListMusic className="h-3 w-3" /> Add to my playlist
                        </span>
                      </DropdownMenuLabel>
                      {playlists.map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                          disabled={loading}
                          data-testid={`menu-add-to-playlist-${playlist.id}`}
                        >
                          <Music className="h-3 w-3 mr-2 text-muted-foreground shrink-0" />
                          <span className="truncate">{playlist.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Shared editable playlists */}
                  {editableShared.length > 0 && (
                    <>
                      {playlists.length > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3" /> Add to shared playlist
                        </span>
                      </DropdownMenuLabel>
                      {editableShared.map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                          disabled={loading}
                          data-testid={`menu-add-to-shared-playlist-${playlist.id}`}
                        >
                          <Users className="h-3 w-3 mr-2 text-muted-foreground shrink-0" />
                          <span className="truncate">{playlist.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  <DropdownMenuSeparator />
                </>
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No playlists yet</div>
              )}
              <DropdownMenuItem
                onClick={() => setShowCreateModal(true)}
                data-testid={`menu-new-playlist-${track.id}`}
              >
                <Plus className="h-3 w-3 mr-2" />
                New playlist
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Edit Dialog ── */}
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
              <Label htmlFor="edit-genre">Genre</Label>
              <Input
                id="edit-genre"
                value={editGenre}
                onChange={(e) => setEditGenre(e.target.value)}
                placeholder="e.g. Indie, Lo-fi"
                data-testid="input-edit-track-genre"
              />
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} data-testid="button-save-track-edit">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
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

      {/* ── Create Playlist Modal ── */}
      <CreatePlaylistModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </>
  );
}
