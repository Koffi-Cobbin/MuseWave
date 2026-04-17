import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePlaylists } from "@/contexts/playlist-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Home } from "lucide-react";
import { Link } from "wouter";
import { PlaylistCard } from "@/components/playlists/PlaylistCard";
import { CreatePlaylistModal } from "@/components/playlists/CreatePlaylistModal";
import { LoginModal } from "@/components/LoginModal";

export default function PlaylistPage() {
  const { isAuthenticated, user } = useAuth();
  const { playlists, loading, error, fetchPlaylists } = usePlaylists();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPlaylists();
  }, [isAuthenticated, fetchPlaylists]);

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">My Playlists</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to create and manage your playlists
            </p>
            <Button
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="glow"
            >
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
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
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
              <h1 className="text-4xl font-bold">My Playlists</h1>
              <p className="text-muted-foreground mt-2">
                {user?.displayName || user?.username}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="glow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </div>

          {/* Search */}
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Playlists Grid */}
        {!loading && (
          <>
            {filteredPlaylists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">
                  {playlists.length === 0
                    ? "Create your first playlist to get started"
                    : "No playlists match your search"}
                </p>
                {playlists.length === 0 && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="glow"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Playlist
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlaylistDeleted={() => fetchPlaylists()}
                  />
                ))}
              </div>
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
