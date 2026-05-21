import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home as HomeIcon, Compass, UploadCloud, Download, WifiOff, User as UserIcon, LogOut, Music, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useOffline } from "@/contexts/offline-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { Separator } from "@/components/ui/separator";

// ─── Account Sheet (Mobile) ───────────────────────────────────────────────────

function AccountSheet({
  open,
  onClose,
  onOpenLogin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}) {
  const { user, logout, isAuthenticated } = useAuth();
  const { downloads } = useOffline();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out" });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="glass noise rounded-t-3xl border-t border-white/10 p-6">
              <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />

              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <Link href={`/artist/${user.username}`} onClick={onClose} className="block">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold">{user.displayName || user.username}</div>
                        <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </Link>
                  <Separator className="opacity-20" />
                  <Link href="/dashboard" onClick={onClose} className="block" data-testid="link-account-dashboard">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/8">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-base font-medium">Dashboard</span>
                    </div>
                  </Link>
                  <Link href="/downloads" onClick={onClose} className="block">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/8">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Download className="h-5 w-5 text-muted-foreground" />
                        {downloads.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none">
                            {downloads.length > 9 ? "9+" : downloads.length}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-medium">Downloads</span>
                    </div>
                  </Link>
                  <Separator className="opacity-20" />
                  <Button variant="ghost" className="w-full justify-start h-12 text-base" onClick={handleLogout}>
                    <LogOut className="mr-2 h-5 w-5" /> Log out
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Link href="/downloads" onClick={onClose} className="block">
                    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/8">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Download className="h-5 w-5 text-muted-foreground" />
                        {downloads.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none">
                            {downloads.length > 9 ? "9+" : downloads.length}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-medium">Downloads</span>
                    </div>
                  </Link>
                  <Separator className="opacity-20" />
                  <div className="space-y-3 text-center">
                    <p className="text-base text-muted-foreground">Sign in to access your account</p>
                    <Button
                      className="w-full glow h-12 text-base"
                      onClick={() => {
                        onClose();
                        onOpenLogin();
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

export default function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { active } = usePlayer();
  const { downloads, isOnline } = useOffline();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const items = [
    { href: "/", label: "Home", icon: HomeIcon, testId: "link-nav-home" },
    { href: "/discover", label: "Discover", icon: Compass, testId: "link-nav-discover" },
    { href: "/upload", label: "Upload", icon: UploadCloud, testId: "link-nav-upload" },
    ...(isAuthenticated ? [{ href: "/playlists", label: "Playlists", icon: Music, testId: "link-nav-playlists" }] : []),
  ];

  return (
    <>
      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onOpenLogin={() => setLoginOpen(true)}
      />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-white/10" />
        {/* Offline banner — hidden when a track is playing (shown in PlayerBar instead) */}
        {!isOnline && !active && (
          <div className="relative flex items-center justify-center gap-1.5 bg-amber-500/15 py-1 text-[10px] text-amber-400">
            <WifiOff className="h-3 w-3" />
            Offline — only saved tracks are available
          </div>
        )}
        {/* Nav items — min height 64px for comfortable tapping */}
        <div className="relative flex items-center justify-around px-1 py-1" style={{ minHeight: 64 }}>
          {items.map((it) => {
            const active = it.href === "/" ? location === "/" : location.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                data-testid={it.testId}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
                style={{ minWidth: 56, minHeight: 56 }}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active && "bg-primary/15"
                )}>
                  <div className="relative">
                    <Icon className={cn("h-5 w-5 transition-all", active && "text-primary")} />
                    {it.href === "/downloads" && downloads.length > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none">
                        {downloads.length > 9 ? "9+" : downloads.length}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium">{it.label}</span>
              </Link>
            );
          })}
          {/* Account button */}
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            data-testid="button-toggle-account"
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-muted-foreground transition-all"
            style={{ minWidth: 56, minHeight: 56 }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl">
              <UserIcon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{isAuthenticated ? "Account" : "Log in"}</span>
          </button>
        </div>
      </nav>
    </>
  );
}