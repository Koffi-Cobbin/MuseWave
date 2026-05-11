import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { usePlayer } from "@/contexts/player-context";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Trash2, ArrowLeft, Music, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AddToPlaylistButton } from "@/components/playlists/TrackActionsMenu";
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
import { secondsToTime } from "@/lib/utils";

export default function PlaylistDetailPage() {
  const [, params] = useRoute("/playlists/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { currentPlaylist, loading, error, fetchPlaylistById, removeSongFromPlaylist, deletePlaylist } = usePlaylists();
  const { setActive, setIsPlaying } = usePlayer();
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<string | null>(null);
  const playlistId = params?.id;

  useEffect(() => {
    if (!isAuthenticated || !playlistId) return;
    fetchPlaylistById(playlistId);
  }, [isAuthenticated, playlistId, fetchPlaylistById]);

  if (!playlistId) return <div>Playlist not found</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Login required</h1>
          <p className="text-muted-foreground mb-6">
            You must be signed in to view this playlist.
          </p>
          <Link href="/">
            <Button variant="outline">Return home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Playlists
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

  const playlistTracks = currentPlaylist.tracks || [];
  const isOwner = user?.id === currentPlaylist.userId;

  const handlePlayTrack = (trackId: string) => {
    const track = playlistTracks.find((t) => t.id === trackId);
    if (track) {
      setActive(track.track);
      setIsPlaying(true);
    }
  };

  const handleRemoveTrack = async () => {
    if (!trackToRemove) return;

    try {
      await removeSongFromPlaylist(playlistId, trackToRemove);
      toast({
        title: "Success",
        description: "Song removed from playlist",
      });
      setTrackToRemove(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove song",
      });
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist(playlistId);
      toast({
        title: "Success",
        description: "Playlist deleted successfully",
      });
      setLocation("/playlists");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete playlist",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/playlists">
          <Button variant="outline" size="sm" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Playlists
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex gap-4 items-start">
            {/* Playlist Cover Placeholder */}
            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
              <Music className="w-16 h-16 text-muted-foreground" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{currentPlaylist.name}</h1>
                  {currentPlaylist.description && (
                    <p className="text-muted-foreground mb-4">{currentPlaylist.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {playlistTracks.length === 0 ? "No songs" : `${playlistTracks.length} ${playlistTracks.length === 1 ? "song" : "songs"}`}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tracks */}
        {playlistTracks.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No songs in this playlist yet</p>
            {isOwner && (
              <p className="text-xs text-muted-foreground mt-2">
                Add songs to get started
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {playlistTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <span className="text-sm text-muted-foreground w-8 text-right">{index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayTrack(track.id)}
                  className="p-0 w-8 h-8 shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                </Button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.track.artist}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  {secondsToTime(track.track.audioDuration)}
                </div>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTrackToRemove(track.track.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Playlist Button */}
        {isOwner && (
          <Button
            variant="destructive"
            onClick={handleDeletePlaylist}
            className="w-full"
          >
            Delete Playlist
          </Button>
        )}
      </div>

      {/* Edit Modal */}
      {currentPlaylist && (
        <RenamePlaylistModal
          playlist={currentPlaylist}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />
      )}

      {/* Remove Track Alert */}
      <AlertDialog open={!!trackToRemove} onOpenChange={(open) => {
        if (!open) setTrackToRemove(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Song</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this song from the playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveTrack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
