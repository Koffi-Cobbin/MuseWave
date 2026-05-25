import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { usePlaylists } from "@/contexts/playlist-context";
import { usePlayer } from "@/contexts/player-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Play, Music, ArrowLeft, ListMusic, Globe, Edit2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { secondsToTime, cn } from "@/lib/utils";
import type { Playlist, Track } from "../../../shared/schema";

type PlaylistTrack = { id: string; track: Track; position?: number };

export default function SharedPlaylistPage() {
  const [, params] = useRoute("/playlists/link/:token");
  const { fetchPlaylistByLink } = usePlaylists();
  const { playQueue, active } = usePlayer();
  const { toast } = useToast();

  const [playlist, setPlaylist] = useState<(Playlist & { tracks?: Track[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<PlaylistTrack[]>([]);

  const token = params?.token;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchPlaylistByLink(token)
      .then((data) => {
        setPlaylist(data);
        setLocalTracks((data.tracks as unknown as PlaylistTrack[]) || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Playlist not found or link has expired");
      })
      .finally(() => setLoading(false));
  }, [token, fetchPlaylistByLink]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Home
            </Button>
          </Link>
          <div className="text-center py-16">
            <ListMusic className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3">Link not found</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              This playlist link is invalid or has been revoked by the owner.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const myPermission = playlist.myPermission;
  const canEdit = myPermission === "owner" || myPermission === "edit";
  const totalDuration = localTracks.reduce((sum, t) => sum + (t.track.audioDuration || 0), 0);

  const handlePlayAll = () => {
    if (localTracks.length === 0) return;
    const tracks = localTracks.map((t) => t.track);
    playQueue(tracks, 0);
    toast({ title: `Playing ${playlist.name}`, description: `${tracks.length} tracks` });
  };

  const handlePlayTrack = (index: number) => {
    const tracks = localTracks.map((t) => t.track);
    playQueue(tracks, index);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <Link href="/">
          <Button variant="outline" size="sm" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Home
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
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shared Playlist</p>
                <Badge variant="secondary" className="gap-1 text-xs py-0">
                  <Globe className="h-3 w-3" />
                  {canEdit ? "Editor access" : "View only"}
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-2 truncate">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{playlist.description}</p>
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

          <div className="flex items-center gap-3 mt-6">
            <Button
              onClick={handlePlayAll}
              disabled={localTracks.length === 0}
              size="lg"
              className="gap-2 glow"
              data-testid="button-shared-playlist-play-all"
            >
              <Play className="h-5 w-5 fill-current" />
              Play All
            </Button>
            {canEdit && (
              <Badge variant="outline" className="gap-1">
                <Edit2 className="h-3 w-3" />
                You can edit this playlist
              </Badge>
            )}
          </div>
        </div>

        {/* Track list */}
        {localTracks.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 rounded-2xl border border-white/5">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tracks in this playlist yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            {localTracks.map((item, index) => {
              const isActive = active?.id === item.track.id;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] gap-3 items-center px-4 py-3 transition-colors group",
                    "border-b border-white/5 last:border-0",
                    isActive ? "bg-primary/10" : "hover:bg-muted/40",
                  )}
                  data-testid={`row-shared-track-${item.track.id}`}
                >
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
                        data-testid={`button-play-shared-track-${item.track.id}`}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
