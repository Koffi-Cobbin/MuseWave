import { useState, useEffect } from "react";
import { Playlist } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePlaylists } from "@/contexts/playlist-context";
import { Loader2 } from "lucide-react";

interface RenamePlaylistModalProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RenamePlaylistModal({
  playlist,
  open,
  onOpenChange,
  onSuccess,
}: RenamePlaylistModalProps) {
  const { toast } = useToast();
  const { renamePlaylist, loading } = usePlaylists();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || "");

  useEffect(() => {
    if (open) {
      setName(playlist.name);
      setDescription(playlist.description || "");
    }
  }, [open, playlist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a playlist name",
      });
      return;
    }

    try {
      await renamePlaylist(playlist.id, name, description);
      toast({
        title: "Success",
        description: "Playlist updated successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update playlist",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:w-[calc(100%-1.5rem)] sm:mx-0 rounded-lg">
        <DialogHeader>
          <DialogTitle>Rename Playlist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-playlist-name">Playlist Name</Label>
            <Input
              id="rename-playlist-name"
              placeholder="Enter playlist name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rename-playlist-description">Description</Label>
            <Textarea
              id="rename-playlist-description"
              placeholder="Enter playlist description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
