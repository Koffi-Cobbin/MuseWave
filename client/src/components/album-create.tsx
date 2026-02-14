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
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { Loader2, Music, ImageIcon } from "lucide-react";

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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
    mutationFn: async (formData: FormData) => {
      return await apiRequestFormData('POST', API_ENDPOINTS.albums.create, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [API_ENDPOINTS.albums.byUser(user?.id || '')]
      });
      toast({ title: "Success", description: "Album created successfully" });

      // Reset form
      setTitle("");
      setDescription("");
      setGenre("");
      setSelectedTracks([]);
      setCoverFile(null);
      setCoverPreview(null);

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Failed to create album" 
      });
    },
  });

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedTracks.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one track" });
      return;
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('title', title);
    formData.append('artist', user.displayName || user.username);
    formData.append('genre', genre);
    formData.append('release_date', new Date().toISOString());
    formData.append('published', 'true');

    if (description) {
      formData.append('description', description);
    }

    // Add cover file if provided
    if (coverFile) {
      formData.append('cover_file', coverFile);
    }

    // Add track IDs as JSON string
    formData.append('track_ids', JSON.stringify(selectedTracks));

    createAlbumMutation.mutate(formData);
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
            <label className="text-sm font-medium">Album Cover</label>
            <div className="flex items-center gap-3">
              {coverPreview && (
                <div className="h-20 w-20 rounded-xl border border-white/10 overflow-hidden">
                  <img 
                    src={coverPreview} 
                    alt="Album cover preview" 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3 transition hover:bg-white/6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/4">
                    <ImageIcon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {coverFile ? "Cover selected" : "Choose cover image"}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {coverFile?.name || "Optional - JPG, PNG, or WebP"}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFileChange}
                  />
                </div>
              </label>
            </div>
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