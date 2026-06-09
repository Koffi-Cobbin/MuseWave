import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Disc3,
  Share2,
  Search,
  RefreshCw,
  ArrowUpFromLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useSharedByMe } from "@/hooks/use-shared-by-me";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { ShareAlbumModal } from "@/components/albums/ShareAlbumModal";
import type { Album, MySharedAlbum, SharedAlbum } from "../../../shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type AlbumSubTab = "mine" | "sharedWithMe" | "sharedByMe";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AlbumCover({ album }: { album: Album | SharedAlbum | MySharedAlbum }) {
  return (
    <div
      className={cn(
        "mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10",
        !(album as Album).coverUrl && "bg-gradient-to-br",
        (album as Album).coverUrl
          ? ""
          : ((album as Album).coverGradient ?? "from-emerald-500/20 to-fuchsia-500/20"),
      )}
    >
      {(album as Album).coverUrl ? (
        <img
          src={(album as Album).coverUrl}
          alt={album.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Disc3 className="h-8 w-8 text-white/20" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyAlbums() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const {
    sharedByMeAlbums,
    loadingSharedByMeAlbums,
    fetchSharedByMeAlbums,
    sharedWithMeAlbums,
    loadingSharedWithMeAlbums,
    fetchSharedWithMeAlbums,
  } = useSharedByMe();

  const [activeTab, setActiveTab] = useState<AlbumSubTab>("mine");

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [albumSearch, setAlbumSearch] = useState("");

  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Album | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  // ── Load my albums ─────────────────────────────────────────────────────
  const loadAlbums = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setAlbumsLoading(true);
      else setRefreshing(true);
      try {
        const albumsData = await apiRequestJson<Album[]>(
          "GET",
          API_ENDPOINTS.albums.byUser(user.id),
        );
        const enriched = await Promise.all(
          (Array.isArray(albumsData) ? albumsData : []).map(async (album) => {
            try {
              const detail = await apiRequestJson<Album>(
                "GET",
                API_ENDPOINTS.albums.byId(album.id),
              );
              return { ...album, ...detail };
            } catch {
              return album;
            }
          }),
        );
        setAlbums(enriched);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Couldn't load albums",
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setAlbumsLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, toast],
  );

  useEffect(() => {
    if (user?.id) loadAlbums();
  }, [user?.id, loadAlbums]);

  // ── Fetch shared albums when tab changes ───────────────────────────────
  useEffect(() => {
    if (activeTab === "sharedWithMe") fetchSharedWithMeAlbums();
    else if (activeTab === "sharedByMe") fetchSharedByMeAlbums();
  }, [activeTab, fetchSharedWithMeAlbums, fetchSharedByMeAlbums]);

  // ── Filter ─────────────────────────────────────────────────────────────
  const filteredAlbums = useMemo(() => {
    if (!albumSearch.trim()) return albums;
    const q = albumSearch.toLowerCase();
    return albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.genre ?? "").toLowerCase().includes(q),
    );
  }, [albums, albumSearch]);

  // ── Sub-tab config ─────────────────────────────────────────────────────
  const subTabs: { key: AlbumSubTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "mine", label: "My Albums", icon: Disc3, count: albums.length },
    { key: "sharedWithMe", label: "Shared with Me", icon: Share2, count: sharedWithMeAlbums.length },
    { key: "sharedByMe", label: "Shared by Me", icon: ArrowUpFromLine, count: sharedByMeAlbums.length },
  ];

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-hidden px-2 py-4 pb-44 sm:px-4 sm:py-6 sm:pb-36 lg:py-8 lg:pb-24">

        {/* ── Header ── */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="secondary"
                size="sm"
                className="border-white/10 bg-white/5"
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5 opacity-40" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/30 to-fuchsia-500/20 border border-white/10">
                <Disc3 className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <h1
                  className="text-base font-semibold tracking-tight sm:text-lg"
                  data-testid="text-my-albums-heading"
                >
                  My Albums
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {albums.length} album{albums.length !== 1 ? "s" : ""}
                  {sharedWithMeAlbums.length > 0
                    ? ` · ${sharedWithMeAlbums.length} shared with me`
                    : ""}
                  {sharedByMeAlbums.length > 0
                    ? ` · ${sharedByMeAlbums.length} shared by me`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {activeTab === "mine" && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => loadAlbums(true)}
              disabled={refreshing}
              className="border-white/10 bg-white/5 h-9 w-9 shrink-0"
              title="Refresh"
              data-testid="button-refresh-albums"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          )}
        </header>

        {/* ── Sub-tabs ── */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/3 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-albums-${tab.key}`}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-white/8 text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════════════ */}
          {/* MY ALBUMS TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "mine" && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              {/* Search */}
              {!albumsLoading && albums.length > 0 && (
                <div className="mb-5">
                  <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={albumSearch}
                      onChange={(e) => setAlbumSearch(e.target.value)}
                      placeholder="Search albums…"
                      data-testid="input-album-search"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
                    />
                    {albumSearch && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setAlbumSearch("")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {albumsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : filteredAlbums.length === 0 && albums.length > 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No albums matching "{albumSearch}"
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 border-white/10 bg-white/5"
                    onClick={() => setAlbumSearch("")}
                  >
                    Clear search
                  </Button>
                </div>
              ) : albums.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Disc3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No albums yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Create your first album from your artist profile.
                  </p>
                  {user?.username && (
                    <Link href={`/artist/${user.username}`}>
                      <Button variant="secondary" size="sm" className="mt-4 border-white/10 bg-white/5">
                        Go to artist profile
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAlbums.map((album, idx) => (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="group rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                      data-testid={`card-album-${album.id}`}
                    >
                      <AlbumCover album={album} />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{album.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {album.genre}
                            {(album as any).trackCount
                              ? ` · ${(album as any).trackCount} track${(album as any).trackCount !== 1 ? "s" : ""}`
                              : ""}
                          </div>
                          {!album.published && (
                            <span className="mt-1.5 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                              Draft
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareTarget(album);
                            setShareOpen(true);
                          }}
                          data-testid={`button-share-album-${album.id}`}
                          title="Share album"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* SHARED WITH ME TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "sharedWithMe" && (
            <motion.div
              key="sharedWithMe"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              {loadingSharedWithMeAlbums ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : sharedWithMeAlbums.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No albums shared with you yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    When an artist shares an album with you, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sharedWithMeAlbums.map((album, idx) => (
                    <motion.div
                      key={(album as SharedAlbum).shareId ?? album.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                      data-testid={`card-shared-with-me-album-${album.id}`}
                    >
                      <AlbumCover album={album} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{album.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {album.genre}
                          {(album as any).trackCount
                            ? ` · ${(album as any).trackCount} track${(album as any).trackCount !== 1 ? "s" : ""}`
                            : ""}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <Share2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            from{" "}
                            <span className="font-medium text-muted-foreground">
                              {(album as SharedAlbum).sharedByUsername}
                            </span>
                          </span>
                          {(album as SharedAlbum).permission && (
                            <span className="ml-auto shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] capitalize">
                              {(album as SharedAlbum).permission}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* SHARED BY ME TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "sharedByMe" && (
            <motion.div
              key="sharedByMe"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              {loadingSharedByMeAlbums ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : sharedByMeAlbums.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <ArrowUpFromLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">You haven't shared any albums yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Share one of your albums using the share button on each card in My Albums.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sharedByMeAlbums.map((album, idx) => (
                    <motion.div
                      key={(album as MySharedAlbum).shareId ?? album.id + idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="rounded-2xl border border-white/8 bg-white/2 p-3 transition hover:border-white/15 hover:bg-white/5"
                      data-testid={`card-shared-by-me-album-${album.id}`}
                    >
                      <AlbumCover album={album} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{album.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {album.genre}
                          {(album as any).trackCount
                            ? ` · ${(album as any).trackCount} track${(album as any).trackCount !== 1 ? "s" : ""}`
                            : ""}
                        </div>
                        {(album as MySharedAlbum).sharedWithUsername && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <ArrowUpFromLine className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              shared with{" "}
                              <span className="font-medium text-muted-foreground">
                                {(album as MySharedAlbum).sharedWithUsername}
                              </span>
                            </span>
                            {(album as MySharedAlbum).permission && (
                              <span className="ml-auto shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] capitalize">
                                {(album as MySharedAlbum).permission}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-8" aria-hidden="true" />
      </div>

      {/* ── Album Share Modal ─────────────────────────────────────────────── */}
      {shareTarget && (
        <ShareAlbumModal
          album={shareTarget}
          open={shareOpen}
          onOpenChange={(open) => {
            setShareOpen(open);
            if (!open) setShareTarget(null);
          }}
        />
      )}
    </div>
  );
}
