import { useState } from "react";
import { useLocation } from "wouter";
import { Playlist } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { usePlaylists } from "@/contexts/playlist-context";
import { MoreVertical, Music, Trash2, Edit2, Share2, Globe, Users } from "lucide-react";
import { RenamePlaylistModal } from "./RenamePlaylistModal";
import { SharePlaylistModal } from "./SharePlaylistModal";

interface PlaylistCardProps {
  playlist: Playlist;
  onPlaylistDeleted?: () => void;
}

export function PlaylistCard({ playlist, onPlaylistDeleted }: PlaylistCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { deletePlaylist } = usePlaylists();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isOwner = !playlist.myPermission || playlist.myPermission === "owner";
  const isSharedWithMe = playlist.myPermission === "view" || playlist.myPermission === "edit";

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlist.id);
      toast({ title: "Success", description: "Playlist deleted successfully" });
      setShowDeleteAlert(false);
      onPlaylistDeleted?.();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete playlist" });
    }
  };

  const trackCount = playlist.trackIds?.length ?? 0;

  return (
    <>
      <Card
        className="group relative hover:shadow-lg transition-all cursor-pointer"
        onClick={() => setLocation(`/playlists/${playlist.id}`)}
        data-testid={`card-playlist-${playlist.id}`}
      >
        <CardHeader className="relative pb-0">
          {/* Cover */}
          <div className="mb-4 aspect-square w-full rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center relative">
            <Music className="w-12 h-12 text-muted-foreground" />
            {/* Public badge overlay */}
            {playlist.public && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="gap-1 text-xs py-0 px-1.5">
                  <Globe className="h-2.5 w-2.5" />
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base break-words">{playlist.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {trackCount === 0 ? "No songs" : `${trackCount} ${trackCount === 1 ? "song" : "songs"}`}
              </p>
              {/* Shared-with-me badge */}
              {isSharedWithMe && (
                <Badge variant="outline" className="mt-1.5 gap-1 text-xs py-0 capitalize">
                  <Users className="h-2.5 w-2.5" />
                  {playlist.myPermission === "edit" ? "Editor" : "Viewer"}
                </Badge>
              )}
            </div>

            {/* Dropdown — only for owner */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-playlist-menu-${playlist.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRenameModal(true); }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setShowDeleteAlert(true); }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        {playlist.description && (
          <CardContent className="text-xs text-muted-foreground line-clamp-2">
            {playlist.description}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <RenamePlaylistModal
        playlist={playlist}
        open={showRenameModal}
        onOpenChange={setShowRenameModal}
      />

      {isOwner && (
        <SharePlaylistModal
          playlist={playlist}
          open={showShareModal}
          onOpenChange={setShowShareModal}
        />
      )}
    </>
  );
}
