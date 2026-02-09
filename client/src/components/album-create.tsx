import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Track, CreateAlbum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequestJson, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { Loader2, Music } from "lucide-react";

interface AlbumCreateProps {
  onSuccess?: () => void;
}

export function AlbumCreate({ onSuccess }: AlbumCreateProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const { data: tracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: [API_ENDPOINTS.tracks.list, { userId: user?.id, published: true }],
    queryFn: async () => {
      return await apiRequestJson<Track[]>(
        'GET',
        API_ENDPOINTS.tracks.list,
        undefined,
        { userId: user?.id, published: true }
      );
    },
    enabled: !!user?.id,
  });

  const createAlbumMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequestJson('POST', API_ENDPOINTS.albums.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [API_ENDPOINTS.albums.byUser(user?.id || '')]
      });
      toast({ title: "Success", description: "Album created successfully" });
      onSuccess?.();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create album" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedTracks.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one track" });
      return;
    }

    createAlbumMutation.mutate({
      title,
      description,
      genre,
      artist: user.displayName || user.username,
      userId: user.id,
      trackIds: selectedTracks,
      releaseDate: new Date().toISOString(),
      published: true,
    });
  };

  const toggleTrack = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  if (tracksLoading) return <Loader2 className="h-8 w-8 animate-spin" />;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Create New Album</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Album Title</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Enter album title"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Tell us about this album"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <Input 
              value={genre} 
              onChange={e => setGenre(e.target.value)} 
              placeholder="e.g. Electronic, Lo-fi"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Tracks</label>
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border border-white/10 p-2">
              {tracks?.map(track => (
                <div key={track.id} className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded-md transition">
                  <Checkbox 
                    id={track.id} 
                    checked={selectedTracks.includes(track.id)}
                    onCheckedChange={() => toggleTrack(track.id)}
                  />
                  <label htmlFor={track.id} className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                    <Music className="h-4 w-4 text-primary" />
                    <span>{track.title}</span>
                  </label>
                </div>
              ))}
              {tracks?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No tracks found. Upload some tracks first!
                </div>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createAlbumMutation.isPending}
          >
            {createAlbumMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Album
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
