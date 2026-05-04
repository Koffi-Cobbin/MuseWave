import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Home as HomeIcon, Compass, UploadCloud, User as UserIcon, LogOut, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";

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
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                      <UserIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold">{user.displayName || user.username}</div>
                      <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <Link href={`/artist/${user.username}`}>
                    <Button variant="secondary" className="w-full border-white/10 bg-white/5 h-12 text-base" onClick={onClose}>
                      <UserIcon className="mr-2 h-5 w-5" /> View artist page
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start h-12 text-base" onClick={handleLogout}>
                    <LogOut className="mr-2 h-5 w-5" /> Log out
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
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
        {/* Nav items — min height 64px for comfortable tapping */}
        <div className="relative flex items-center justify-around px-1 py-1" style={{ minHeight: 64 }}>
          {items.map((it) => {
            const active = it.href === "/" ? location === "/" : location.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href}>
                <a
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
                    <Icon className={cn("h-5 w-5 transition-all", active && "text-primary")} />
                  </div>
                  <span className="text-xs font-medium">{it.label}</span>
                </a>
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