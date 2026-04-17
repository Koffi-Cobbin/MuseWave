import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
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
import { useToast } from "@/hooks/use-toast";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { Plus, Music } from "lucide-react";

interface AddToPlaylistButtonProps {
  trackId: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
}

export function AddToPlaylistButton({
  trackId,
  size = "sm",
  variant = "outline",
}: AddToPlaylistButtonProps) {
  const { isAuthenticated } = useAuth();
  const { playlists, addSongToPlaylist, loading } = usePlaylists();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button variant={variant} size={size} disabled>
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addSongToPlaylist(playlistId, trackId);
      toast({
        title: "Success",
        description: "Song added to playlist",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add song to playlist",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={loading}>
            <Plus className="h-4 w-4" />
            {size !== "icon" && <span className="ml-2 hidden sm:inline">Add</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {playlists.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
              No playlists yet
            </div>
          ) : (
            <>
              <DropdownMenuLabel className="text-xs">Add to playlist</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {playlists.map((playlist) => (
                <DropdownMenuItem
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  disabled={loading}
                >
                  <Music className="h-3 w-3 mr-2" />
                  <span className="truncate">{playlist.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setShowCreateModal(true)}>
            <Plus className="h-3 w-3 mr-2" />
            Create new playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          // The context will already be updated after creating a playlist
        }}
      />
    </>
  );
}
