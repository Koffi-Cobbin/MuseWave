import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/contexts/auth-context";
import { useOffline } from "@/contexts/offline-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Home as HomeIcon,
  Compass,
  Music2,
  UploadCloud,
  Download,
  WifiOff,
  LogOut,
  User as UserIcon,
  X,
  LayoutDashboard,
  Headphones,
} from "lucide-react";

// ─── Logo ────────────────────────────────────────────────────────────────────

export function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-musewave">
      <div
        className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400/90 via-emerald-400/20 to-fuchsia-500/80 shadow-[0_8px_24px_-8px_rgba(16,185,129,.8)]"
        aria-hidden="true"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-semibold tracking-tight">MuseWave</div>
        <div className="truncate text-xs text-muted-foreground">music for the next fave</div>
      </div>
    </div>
  );
}

// ─── Login Dialog ─────────────────────────────────────────────────────────────

function LoginDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        className="glow shrink-0"
        data-testid="button-open-login"
        onClick={() => setOpen(true)}
      >
        Log in
      </Button>
      <LoginModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

interface SidebarNavProps {
  onMobileClose?: () => void;
}

export function SidebarNav({ onMobileClose }: SidebarNavProps) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { downloads, isOnline } = useOffline();
  const { toast } = useToast();

  const items = [
    { href: "/", label: "Home", icon: HomeIcon, testId: "link-nav-home" },
    { href: "/discover", label: "Discover", icon: Compass, testId: "link-nav-discover" },
    { href: "/upload", label: "Upload", icon: UploadCloud, testId: "link-nav-upload" },
    { href: "/downloads", label: "Downloads", icon: Download, testId: "link-nav-downloads" },
  ];

  const authenticatedItems = [
    { href: "/playlists", label: "My Playlists", icon: Music2, testId: "link-nav-playlists" },
    { href: "/my-tracks", label: "My Tracks", icon: Headphones, testId: "link-nav-my-tracks" },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "link-nav-dashboard" },
  ];

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out", description: "You've been successfully logged out." });
    onMobileClose?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <Logo />
        {onMobileClose && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileClose} data-testid="button-close-nav">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Separator className="my-4 opacity-60" />

      {/* Offline indicator */}
      {!isOnline && (
        <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 px-2 py-1.5 text-xs text-amber-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          Offline
        </div>
      )}

      <nav className="flex-1 grid gap-1 content-start">
        {items.map((it) => {
          const active = it.href === "/" ? location === "/" : !it.href.includes("#") && location.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              href={it.href}
              data-testid={it.testId}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                "hover:bg-white/5 hover:border-white/10 border border-transparent",
                active && "bg-white/6 border-white/10",
              )}
            >
              <div className="relative shrink-0">
                <Icon className="h-5 w-5 text-foreground/80 group-hover:text-foreground" />
                {it.href === "/downloads" && downloads.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none">
                    {downloads.length > 9 ? "9+" : downloads.length}
                  </span>
                )}
              </div>
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
        {isAuthenticated && authenticatedItems.map((it) => {
          const active = it.href === "/" ? location === "/" : !it.href.includes("#") && location.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              href={it.href}
              data-testid={it.testId}
              onClick={onMobileClose}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                "hover:bg-white/5 hover:border-white/10 border border-transparent",
                active && "bg-white/6 border-white/10",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-foreground/80 group-hover:text-foreground" />
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4 opacity-60" />

      {isAuthenticated && user && (
        <Link href={`/artist/${user.username}`} onClick={onMobileClose}>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/4 p-3 cursor-pointer hover:bg-white/6 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" data-testid="text-user-name">{user.displayName || user.username}</div>
                <div className="truncate text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {isAuthenticated ? (
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      ) : (
        <LoginDialog onSuccess={onMobileClose} />
      )}
    </div>
  );
}
