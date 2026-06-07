import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { useSharedByMe } from "@/hooks/use-shared-by-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Home, Users, ListMusic, ArrowUpFromLine } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PlaylistCard } from "@/components/playlists/PlaylistCard";
import { CreatePlaylistModal } from "@/components/playlists/CreatePlaylistModal";
import { LoginModal } from "@/components/LoginModal";
import { cn } from "@/lib/utils";

type Tab = "my" | "shared" | "sharedByMe";

export default function PlaylistPage() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const { playlists, sharedWithMe, loading, error, fetchPlaylists, fetchSharedWithMe } = usePlaylists();
  const {
    sharedByMePlaylists,
    loadingPlaylists: loadingByMePlaylists,
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

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPlaylists();
    fetchSharedWithMe();
    fetchSharedByMePlaylists();
  }, [isAuthenticated, fetchPlaylists, fetchSharedWithMe, fetchSharedByMePlaylists]);

  useEffect(() => { setSearchQuery(""); }, [activeTab]);

  const filteredMyPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSharedWithMe = sharedWithMe.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSharedByMePlaylists = sharedByMePlaylists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Button
                onClick={() => setShowCreateModal(true)}
                className="glow"
                data-testid="button-create-playlist"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            )}
          </div>

          {/* ── Tabs ── */}
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
              {sharedWithMe.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs">
                  {sharedWithMe.length}
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
              {sharedByMePlaylists.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs">
                  {sharedByMePlaylists.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Search ── */}
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
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MY PLAYLISTS
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
            SHARED WITH ME
            ══════════════════════════════════════════════ */}
        {activeTab === "shared" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSharedWithMe.length === 0 ? (
              <div className="text-center py-16">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
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

        {/* ══════════════════════════════════════════════
            SHARED BY ME
            ══════════════════════════════════════════════ */}
        {activeTab === "sharedByMe" && (
          <>
            {loadingByMePlaylists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSharedByMePlaylists.length === 0 ? (
              <div className="text-center py-16">
                <ArrowUpFromLine className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                  {sharedByMePlaylists.length === 0
                    ? "You haven't shared any playlists yet"
                    : "No shared playlists match your search"}
                </p>
                {sharedByMePlaylists.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Open a playlist and use the share button to share it with others
                  </p>
                )}
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
      </div>

      <CreatePlaylistModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => fetchPlaylists()}
      />
    </div>
  );
}
