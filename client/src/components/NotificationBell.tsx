import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  BellDot,
  Music2,
  Disc3,
  ListMusic,
  Share2,
  CheckCheck,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { apiRequestJson } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/apiConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "new_track"
  | "new_album"
  | "new_playlist"
  | "track_shared"
  | "album_shared"
  | "playlist_shared";

interface Notification {
  id: string;
  notification_type: NotificationType;
  target_type: string;
  target_id: string;
  target_title: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url?: string;
  extra: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function notifIcon(type: NotificationType) {
  switch (type) {
    case "new_track":
    case "track_shared":
      return <Music2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    case "new_album":
    case "album_shared":
      return <Disc3 className="h-4 w-4 text-amber-400 shrink-0" />;
    case "new_playlist":
    case "playlist_shared":
      return <ListMusic className="h-4 w-4 text-violet-400 shrink-0" />;
    default:
      return <Share2 className="h-4 w-4 text-sky-400 shrink-0" />;
  }
}

function notifMessage(n: Notification): string {
  const actor = n.actor_display_name || n.actor_username || "Someone";
  switch (n.notification_type) {
    case "new_track":
      return `${actor} released a new track`;
    case "new_album":
      return `${actor} released a new album`;
    case "new_playlist":
      return `${actor} shared a new playlist`;
    case "track_shared":
      return `${actor} shared a track with you`;
    case "album_shared":
      return `${actor} shared an album with you`;
    case "playlist_shared":
      return `${actor} shared a playlist with you`;
    default:
      return `New notification from ${actor}`;
  }
}

function notifPath(n: Notification): string {
  switch (n.notification_type) {
    case "new_album":
    case "album_shared":
      return n.target_id ? `/albums/${n.target_id}` : "/albums";
    case "new_playlist":
    case "playlist_shared":
      return "/playlists";
    default:
      return "/tracks";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiRequestJson<{ unread_count: number }>(
        "GET",
        API_ENDPOINTS.notifications.unreadCount,
      );
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silently ignore — background poll
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiRequestJson<Notification[]>(
        "GET",
        API_ENDPOINTS.notifications.list,
      );
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(0);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setDismissingId(id);
    try {
      await apiRequestJson("POST", API_ENDPOINTS.notifications.markRead(id));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setDismissingId(null);
    }
  }, []);

  const clearAll = useCallback(async () => {
    setClearingAll(true);
    try {
      await apiRequestJson("POST", API_ENDPOINTS.notifications.markAllRead);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setClearingAll(false);
    }
  }, []);

  const handleClick = useCallback(async (n: Notification) => {
    await dismiss(n.id);
    setOpen(false);
    navigate(notifPath(n));
  }, [dismiss, navigate]);

  // Poll unread count every 60 s
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchUnreadCount]);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative border border-white/10 bg-white/5 hover:bg-white/10"
          aria-label="Notifications"
          data-testid="button-notifications"
        >
          {unreadCount > 0 ? (
            <BellDot className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
              disabled={clearingAll}
              data-testid="button-clear-all-notifications"
            >
              {clearingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Clear all
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground/60">
                New tracks, albums, and shares will appear here
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0 transition-colors hover:bg-white/5",
                  !n.is_read && "bg-primary/5",
                )}
              >
                {/* Icon */}
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8">
                  {notifIcon(n.notification_type)}
                </div>

                {/* Content — clickable */}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleClick(n)}
                  data-testid={`button-notif-${n.id}`}
                >
                  <p className="text-xs leading-snug text-foreground">
                    {notifMessage(n)}
                  </p>
                  {n.target_title && (
                    <p className="mt-0.5 truncate text-xs font-medium text-primary">
                      {n.target_title}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {relativeTime(n.created_at)}
                  </p>
                </button>

                {/* Dismiss */}
                <button
                  type="button"
                  className="mt-0.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                  onClick={() => dismiss(n.id)}
                  disabled={dismissingId === n.id}
                  aria-label="Dismiss"
                  data-testid={`button-dismiss-notif-${n.id}`}
                >
                  {dismissingId === n.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
