import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { usePlayer } from "@/contexts/player-context";
import { useSharedTracks } from "@/hooks/use-shared-tracks";
import { useSharedByMe } from "@/hooks/use-shared-by-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Plus, Home, Users, ListMusic, Music2,
  Share2, ArrowUpFromLine,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { TrackCard } from "@/components/TrackCard";
import { PlaylistCard } from "@/components/playlists/PlaylistCard";
import { CreatePlaylistModal } from "@/components/playlists/CreatePlaylistModal";
import { LoginModal } from "@/components/LoginModal";
import { cn } from "@/lib/utils";
import type { Track } from "../../../shared/schema";

type Tab = "my" | "shared" | "sharedByMe";
type SubTab = "playlists" | "tracks";

function SubTabBar({
  active,
  onChange,
  playlistCount,
  trackCount,
}: {
  active: SubTab;
  onChange: (t: SubTab) => void;
  playlistCount: number;
  trackCount: number;
}) {
  return (
    <div className="flex gap-1 mb-5 w-fit bg-muted/20 rounded-lg p-1">
      <button
        onClick={() => onChange("playlists")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
          active === "playlists"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        data-testid="subtab-playlists"
      >
        <ListMusic className="h-3.5 w-3.5" />
        Playlists
        {playlistCount > 0 && (
          <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
            {playlistCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onChange("tracks")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
          active === "tracks"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        data-testid="subtab-tracks"
      >
        <Music2 className="h-3.5 w-3.5" />
        Tracks
        {trackCount > 0 && (
          <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
            {trackCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default function PlaylistPage() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const { active, isPlaying, setIsPlaying, playTrack } = usePlayer();
  const { playlists, sharedWithMe, loading, error, fetchPlaylists, fetchSharedWithMe } = usePlaylists();
  const { sharedTracks, loading: sharedTracksLoading, fetchSharedTracks } = useSharedTracks();
  const {
    sharedByMeTracks,
    sharedByMePlaylists,
    loadingTracks: loadingByMeTracks,
    loadingPlaylists: loadingByMePlaylists,
    fetchSharedByMeTracks,
    fetchSharedByMePlaylists,
  } = useSharedByMe();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const t = params.get("tab");
    if (t === "shared") return "shared";
    if (t === "sharedByMe") return "sharedByMe";
    return "my";
  });
  const [sharedSubTab, setSharedSubTab] = useState<SubTab>("playlists");
  const [sharedByMeSubTab, setSharedByMeSubTab] = useState<SubTab>("playlists");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPlaylists();
    fetchSharedWithMe();
    fetchSharedTracks();
    fetchSharedByMeTracks();
    fetchSharedByMePlaylists();
  }, [isAuthenticated, fetchPlaylists, fetchSharedWithMe, fetchSharedTracks, fetchSharedByMeTracks, fetchSharedByMePlaylists]);

  useEffect(() => { setSearchQuery(""); }, [activeTab, sharedSubTab, sharedByMeSubTab]);

  const handlePlayTrack = (track: Track) => {
    if (active?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(track);
    }
  };

  const filteredMyPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSharedWithMe = sharedWithMe.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSharedByMePlaylists = sharedByMePlaylists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPlaylistSubTab =
    activeTab === "my" ||
    (activeTab === "shared" && sharedSubTab === "playlists") ||
    (activeTab === "sharedByMe" && sharedByMeSubTab === "playlists");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-4 pt-12 pb-36 lg:pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">My Playlists</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to create and manage your playlists
            </p>
            <Button size="lg" onClick={() => setShowLoginModal(true)} className="glow">
              Log In
            </Button>
          </div>
        </div>
        <LoginModal
          open={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            fetchPlaylists();
            fetchSharedWithMe();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-36 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold">Playlists</h1>
              <p className="text-muted-foreground mt-2">
                {user?.displayName || user?.username}
              </p>
            </div>
            {activeTab === "my" && (
              <Button onClick={() => setShowCreateModal(true)} className="glow" data-testid="button-create-playlist">
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            )}
          </div>

          {/* ── Main Tabs ── */}
          <div className="flex gap-1 mb-5 bg-muted/30 rounded-lg p-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab("my")}
              className={cn(
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shrink-0",
                activeTab === "my"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid="tab-my-playlists"
            >
              <ListMusic className="h-4 w-4 shrink-0 hidden sm:block" />
              <span className="whitespace-nowrap">My Playlists</span>
              {playlists.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs">
                  {playlists.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("shared")}
              className={cn(
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shrink-0",
                activeTab === "shared"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid="tab-shared-with-me"
            >
              <Users className="h-4 w-4 shrink-0 hidden sm:block" />
              <span className="whitespace-nowrap">Shared with me</span>
              {(sharedWithMe.length + sharedTracks.length) > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs">
                  {sharedWithMe.length + sharedTracks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("sharedByMe")}
              className={cn(
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shrink-0",
                activeTab === "sharedByMe"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid="tab-shared-by-me"
            >
              <ArrowUpFromLine className="h-4 w-4 shrink-0 hidden sm:block" />
              <span className="whitespace-nowrap">Shared by me</span>
              {(sharedByMePlaylists.length + sharedByMeTracks.length) > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs">
                  {sharedByMePlaylists.length + sharedByMeTracks.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Search (playlist sub-tabs only) ── */}
          {isPlaylistSubTab && (
            <Input
              placeholder={
                activeTab === "my"
                  ? "Search your playlists..."
                  : activeTab === "shared"
                  ? "Search playlists shared with you..."
                  : "Search playlists you've shared..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
              data-testid="input-search-playlists"
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MY PLAYLISTS tab
            ══════════════════════════════════════════════ */}
        {activeTab === "my" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMyPlaylists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">
                  {playlists.length === 0
                    ? "Create your first playlist to get started"
                    : "No playlists match your search"}
                </p>
                {playlists.length === 0 && (
                  <Button onClick={() => setShowCreateModal(true)} className="glow">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Playlist
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredMyPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlaylistDeleted={() => {
                      fetchPlaylists();
                      fetchSharedWithMe();
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            SHARED WITH ME tab
            ══════════════════════════════════════════════ */}
        {activeTab === "shared" && (
          <>
            <SubTabBar
              active={sharedSubTab}
              onChange={setSharedSubTab}
              playlistCount={sharedWithMe.length}
              trackCount={sharedTracks.length}
            />

            {/* Playlists shared with me */}
            {sharedSubTab === "playlists" && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSharedWithMe.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                    <p className="text-muted-foreground">
                      {sharedWithMe.length === 0
                        ? "No playlists have been shared with you yet"
                        : "No shared playlists match your search"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredSharedWithMe.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onPlaylistDeleted={() => {
                          fetchPlaylists();
                          fetchSharedWithMe();
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tracks shared with me */}
            {sharedSubTab === "tracks" && (
              <>
                {sharedTracksLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                    ))}
                  </div>
                ) : sharedTracks.length === 0 ? (
                  <div className="text-center py-16">
                    <Music2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground">
                      No tracks have been shared with you yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      When someone shares a private track with you, it will appear here
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
                    {sharedTracks.map((track, idx) => (
                      <div key={track.id} className="relative">
                        <TrackCard
                          track={track}
                          onPlay={handlePlayTrack}
                          isActive={active?.id === track.id}
                          index={idx}
                        />
                        <div className="absolute top-2 right-11 sm:top-3 sm:right-13 z-10 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/70 border border-white/10 pointer-events-none">
                          <Share2 className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[100px] sm:max-w-[140px]">
                            {track.sharedByDisplayName || track.sharedByUsername}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            SHARED BY ME tab
            ══════════════════════════════════════════════ */}
        {activeTab === "sharedByMe" && (
          <>
            <SubTabBar
              active={sharedByMeSubTab}
              onChange={setSharedByMeSubTab}
              playlistCount={sharedByMePlaylists.length}
              trackCount={sharedByMeTracks.length}
            />

            {/* Playlists I've shared */}
            {sharedByMeSubTab === "playlists" && (
              <>
                {loadingByMePlaylists ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSharedByMePlaylists.length === 0 ? (
                  <div className="text-center py-16">
                    <ListMusic className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground">
                      You haven't shared any playlists yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Open a playlist and use the share button to share it with others
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredSharedByMePlaylists.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onPlaylistDeleted={() => {
                          fetchPlaylists();
                          fetchSharedByMePlaylists();
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tracks I've shared */}
            {sharedByMeSubTab === "tracks" && (
              <>
                {loadingByMeTracks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                    ))}
                  </div>
                ) : sharedByMeTracks.length === 0 ? (
                  <div className="text-center py-16">
                    <ArrowUpFromLine className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground">
                      You haven't shared any tracks yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Use the ··· menu on any track to share it with someone
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
                    {sharedByMeTracks.map((track, idx) => (
                      <div key={`${track.id}-${idx}`} className="relative">
                        <TrackCard
                          track={track}
                          onPlay={handlePlayTrack}
                          isActive={active?.id === track.id}
                          index={idx}
                        />
                        {(track.sharedWithUsername || track.sharedWithEmail) && (
                          <div className="absolute top-2 right-11 sm:top-3 sm:right-13 z-10 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white/70 border border-white/10 pointer-events-none">
                            <Share2 className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[100px] sm:max-w-[140px]">
                              {track.sharedWithUsername || track.sharedWithEmail}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => fetchPlaylists()}
      />
    </div>
  );
}
