import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Compass,
  Flame,
  Home as HomeIcon,
  Mail,
  Music2,
  Pause,
  Play,
  Search,
  Sparkles,
  UploadCloud,
  LogIn,
  LogOut,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePlayer } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { Track, User } from "../../../shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtistRowData = {
  slug: string;
  name: string;
  tagline: string;
  followers: number;
  monthlyListeners: number;
  accent: string;
  avatarUrl?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function secondsToTime(duration: number) {
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${`${sec}`.padStart(2, "0")}`;
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2" data-testid="brand-indiewave">
      <div
        className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400/90 via-emerald-400/20 to-fuchsia-500/80 shadow-[0_12px_40px_-24px_rgba(16,185,129,.9)]"
        aria-hidden="true"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[15px] font-semibold tracking-tight">IndieWave</div>
        <div className="truncate text-xs text-muted-foreground">music for the next fave</div>
      </div>
    </div>
  );
}

// ─── Login Dialog ─────────────────────────────────────────────────────────────

type DialogView = "login" | "signup" | "forgot" | "sent";

function LoginDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [view, setView] = useState<DialogView>("login");
  const [open, setOpen] = useState(false);

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  // Reset all state when the dialog closes
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTimeout(() => {
        setView("login");
        setUsername(""); setPassword(""); setShowPassword(false);
        setSignupUsername(""); setSignupEmail(""); setSignupDisplayName("");
        setSignupPassword(""); setSignupConfirm(""); setShowSignupPassword(false);
        setResetEmail("");
      }, 200);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(username, password);
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (signupPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setIsSigningUp(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.create}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername.trim().toLowerCase(),
          email: signupEmail.trim(),
          password: signupPassword,
          display_name: signupDisplayName.trim() || signupUsername.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.detail || data.username?.[0] || data.email?.[0] || "Signup failed. Please try again.");
      }
      // Auto-login after successful signup
      await login(signupUsername.trim().toLowerCase(), signupPassword);
      toast({ title: "Account created!", description: "Welcome to IndieWave." });
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.resetPassword}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!response.ok && response.status !== 400) {
        throw new Error("Failed to send reset email. Please try again.");
      }
      setView("sent");
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" data-testid="button-open-login">
          <LogIn className="mr-2 h-4 w-4" />
          Log in
        </Button>
      </DialogTrigger>

      <DialogContent className="left-1/2 w-[calc(100%-1.5rem)] -translate-x-1/2 sm:w-full sm:max-w-[400px]">
        {/* ── Login view ── */}
        {view === "login" && (
          <>
            <DialogHeader>
              <DialogTitle>Log in to IndieWave</DialogTitle>
              <DialogDescription>Enter your credentials to access your account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin} className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username or email</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  autoComplete="username"
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    required
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setShowPassword((v) => !v)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={isLoggingIn} data-testid="button-submit-login">
                  {isLoggingIn ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Log in
                    </>
                  )}
                </Button>
                {/* Forgot password + Sign up on the same line */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("signup")}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-go-to-signup"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* ── Signup view ── */}
        {view === "signup" && (
          <>
            <DialogHeader>
              <DialogTitle>Create an account</DialogTitle>
              <DialogDescription>Join IndieWave and start sharing your music.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSignup} className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="signup-displayname">Display name</Label>
                <Input
                  id="signup-displayname"
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  placeholder="Your Name"
                  autoComplete="name"
                  data-testid="input-signup-displayname"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-username">Username <span className="text-rose-500">*</span></Label>
                <Input
                  id="signup-username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="your-username"
                  autoComplete="username"
                  required
                  data-testid="input-signup-username"
                />
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens and underscores only.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-email">Email <span className="text-rose-500">*</span></Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  data-testid="input-signup-email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Password <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="pr-10"
                    required
                    data-testid="input-signup-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setShowSignupPassword((v) => !v)}
                    data-testid="button-toggle-signup-password"
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-confirm">Confirm password <span className="text-rose-500">*</span></Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  data-testid="input-signup-confirm"
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button type="submit" disabled={isSigningUp} data-testid="button-submit-signup">
                  {isSigningUp ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-to-login-from-signup"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Already have an account? Log in
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Forgot password view ── */}
        {view === "forgot" && (
          <>
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                Enter the email address linked to your account and we'll send you a reset link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  data-testid="input-reset-email"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={isSendingReset} data-testid="button-send-reset">
                  {isSendingReset ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send reset link
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to log in
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Sent confirmation view ── */}
        {view === "sent" && (
          <>
            <DialogHeader>
              <DialogTitle>Check your inbox</DialogTitle>
              <DialogDescription>
                If an account exists for <span className="font-medium text-foreground">{resetEmail}</span>, you'll receive a password reset link shortly.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Reset link sent. Check your spam folder if it doesn't arrive within a few minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-login-from-sent"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to log in
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────

function SidebarNav({ onMobileClose }: { onMobileClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const items = [
    { href: "/", label: "Home", icon: HomeIcon, testId: "link-nav-home" },
    { href: "/discover", label: "Discover", icon: Compass, testId: "link-nav-discover" },
    { href: "/upload", label: "Upload", icon: UploadCloud, testId: "link-nav-upload" },
  ];

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out", description: "You've been successfully logged out." });
    onMobileClose?.();
  };

  return (
    <div className="glass glow noise h-full rounded-2xl p-4 lg:h-auto">
      <div className="flex items-center justify-between lg:block">
        <Logo />
        {onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileClose}
            data-testid="button-close-nav"
          >
            <Sparkles className="h-5 w-5 rotate-45" />
          </Button>
        )}
      </div>

      <Separator className="my-4 opacity-60" />

      <nav className="grid gap-1">
        {items.map((it) => {
          const active =
            it.href === "/"
              ? location === "/"
              : !it.href.includes("#") && location.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.label} href={it.href}>
              <a
                data-testid={it.testId}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  "hover:bg-white/5 hover:border-white/10 border border-transparent",
                  active && "bg-white/6 border-white/10",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-foreground/80 group-hover:text-foreground" />
                <span className="font-medium">{it.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4 opacity-60" />

      {isAuthenticated && user && (
        <Link href={`/artist/${user.username}`}>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/4 p-3 cursor-pointer hover:bg-white/6 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-fuchsia-500/20">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" data-testid="text-user-name">
                  {user.displayName || user.username}
                </div>
                <div className="truncate text-xs text-muted-foreground" data-testid="text-user-email">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {isAuthenticated ? (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      ) : (
        <LoginDialog onSuccess={onMobileClose} />
      )}
    </div>
  );
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h1
          className="text-balance text-base font-semibold tracking-tight sm:text-xl lg:text-2xl xl:text-3xl"
          data-testid="text-title"
        >
          Discover indie music, fast.
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm" data-testid="text-subtitle">
          A platform for indie artists to upload music and grow an audience.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-[260px] lg:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tracks, artists…"
            className="pl-9 text-sm"
            data-testid="input-search"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Track Card ──────────────────────────────────────────────────────────────

function TrackCard({ track, onPlay, isActive }: { track: Track; onPlay: (t: Track) => void; isActive: boolean }) {
  const { isPlaying } = usePlayer();
  const isActiveAndPlaying = isActive && isPlaying;

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      className={cn("group glass glow noise rounded-2xl p-3 transition", isActive && "ring-1 ring-primary/60")}
      data-testid={`card-track-${track.id}`}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-white/10",
            !track.coverUrl && "bg-gradient-to-br",
            track.coverUrl ? "" : track.coverGradient,
          )}
          aria-hidden="true"
        >
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={`${track.title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-50 blur-[10px]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" data-testid={`text-track-title-${track.id}`}>
                {track.title}
              </div>
              <Link href={`/artist/${track.artistSlug}`}>
                <a
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`link-track-artist-${track.id}`}
                >
                  <Music2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{track.artist}</span>
                </a>
              </Link>
            </div>
            <div className="shrink-0">
              {isActive ? (
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
                  onClick={() => onPlay(track)}
                  data-testid={`button-play-${track.id}`}
                >
                  {isActiveAndPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
                  onClick={() => onPlay(track)}
                  data-testid={`button-play-${track.id}`}
                >
                  <Play className="h-4 w-4 fill-current" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="border-white/10 bg-white/5 text-xs">{track.genre}</Badge>
              {track.mood && (
                <Badge variant="outline" className="border-white/12 bg-transparent text-xs">{track.mood}</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-track-meta-${track.id}`}>
              {secondsToTime(track.audioDuration)} · {formatCount(track.plays)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Artist Row ───────────────────────────────────────────────────────────────

function ArtistRow({ artist }: { artist: ArtistRowData }) {
  return (
    <Link href={`/artist/${artist.slug}`}>
      <a
        className="group glass glow noise flex items-center justify-between rounded-2xl p-3 transition hover:translate-y-[-2px]"
        data-testid={`row-artist-${artist.slug}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 shrink-0 rounded-2xl border border-white/10 overflow-hidden sm:h-12 sm:w-12",
              !artist.avatarUrl && "bg-gradient-to-br",
              !artist.avatarUrl && artist.accent,
            )}
            aria-hidden="true"
          >
            {artist.avatarUrl ? (
              <img src={artist.avatarUrl} alt={`${artist.name} profile`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" data-testid={`text-artist-name-${artist.slug}`}>
              {artist.name}
            </div>
            <div className="truncate text-xs text-muted-foreground" data-testid={`text-artist-tagline-${artist.slug}`}>
              {artist.tagline}
            </div>
          </div>
        </div>
        <div className="ml-2 shrink-0 text-right">
          <div className="text-xs text-muted-foreground" data-testid={`text-artist-followers-${artist.slug}`}>
            {formatCount(artist.followers)} followers
          </div>
          <div className="text-xs text-muted-foreground/80" data-testid={`text-artist-listeners-${artist.slug}`}>
            {formatCount(artist.monthlyListeners)} monthly
          </div>
        </div>
      </a>
    </Link>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

const HOME_TRACK_LIMIT = 4;

export default function Home() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<ArtistRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { active, setActive, setAutoPlay, isPlaying, setIsPlaying } = usePlayer();

  useEffect(() => {
    async function fetchTracks() {
      try {
        const data = await apiRequestJson<Track[]>("GET", API_ENDPOINTS.tracks.list, undefined, { published: true });
        setTracks(data);
      } catch (e) {
        console.error("Failed to fetch tracks:", e);
      }
    }
    async function fetchArtists() {
      try {
        const data = await apiRequestJson<ArtistRowData[]>("GET", API_ENDPOINTS.artists.list);
        setArtists(data);
      } catch (e) {
        console.error("Failed to fetch artists:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
    fetchArtists();
  }, []);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) =>
      `${t.title} ${t.artist} ${t.genre} ${t.mood ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, tracks]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => `${a.name} ${a.tagline}`.toLowerCase().includes(q));
  }, [query, artists]);

  // Home shows only a preview; full list lives on /discover
  const previewTracks = filteredTracks.slice(0, HOME_TRACK_LIMIT);
  const hasMore = filteredTracks.length > HOME_TRACK_LIMIT;

  return (
    <div className="min-h-screen bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(90vw_70vh_at_80%_10%,rgba(168,85,247,0.14),transparent_62%),radial-gradient(80vw_50vh_at_50%_100%,rgba(34,211,238,0.10),transparent_55%)]">
      <div className="mx-auto max-w-6xl overflow-x-hidden px-2 py-3 sm:px-3 sm:py-4 lg:px-4 lg:py-6 xl:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">

          {/* Mobile nav FAB */}
          <div className="fixed bottom-24 right-4 z-50 lg:hidden">
            <Button
              size="icon"
              className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20"
              onClick={() => setIsSidebarOpen(true)}
              data-testid="button-toggle-nav"
            >
              <HomeIcon className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile sidebar overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                className="h-full w-4/5 max-w-[calc(100vw-3rem)] p-3 sm:max-w-xs sm:p-4"
              >
                <SidebarNav onMobileClose={() => setIsSidebarOpen(false)} />
              </motion.div>
              <div className="absolute inset-0 -z-10" onClick={() => setIsSidebarOpen(false)} />
            </div>
          )}

          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6">
              <SidebarNav />
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-9">
            <TopBar query={query} onQueryChange={setQuery} />

            <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:gap-6">

              {/* Hero */}
              {!query && (
                <section
                  className="glass glow noise overflow-hidden rounded-2xl border border-white/10 sm:rounded-3xl"
                  aria-label="Hero"
                >
                  <div className="grid gap-3 p-3 sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-4 lg:p-5 xl:p-6">
                    <div className="sm:col-span-7">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge className="border-white/10 bg-white/5 text-xs" variant="secondary" data-testid="badge-new">
                          <Sparkles className="mr-1 h-3 w-3" />
                          New
                        </Badge>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Featured release
                        </span>
                      </div>
                      <h2 className="mt-2 text-balance text-xl font-bold tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
                        Midnight in Lagos
                      </h2>
                      <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm lg:text-base">
                        The latest project from emergent afro-fusion artists. 12 tracks of pure wave.
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
                        <Button className="h-9 w-full px-4 sm:h-11 sm:w-auto sm:px-6 sm:text-base" data-testid="button-play-featured">
                          <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                          Listen Now
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-9 w-full border-white/10 bg-white/5 px-4 sm:h-11 sm:w-auto sm:px-6 sm:text-base"
                          data-testid="button-view-featured"
                        >
                          View Album
                        </Button>
                      </div>
                    </div>
                    <div className="hidden sm:col-span-5 sm:block">
                      <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-400/30 via-fuchsia-500/20 to-cyan-400/40 p-1 shadow-2xl shadow-emerald-500/10">
                        <div className="h-full w-full rounded-xl bg-background/20 backdrop-blur-md border border-white/5" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Discover preview + community */}
              <div className="grid gap-6 lg:grid-cols-12">

                {/* Discover preview – 4 tracks */}
                <div className="lg:col-span-8">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Compass className="h-4 w-4 shrink-0 text-emerald-400" />
                      <h2 className="truncate text-base font-semibold sm:text-lg" data-testid="text-discover-title">
                        {query ? `Results for "${query}"` : "Discover now"}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="border-white/10 bg-white/5" data-testid="badge-track-count">
                        {filteredTracks.length} tracks
                      </Badge>
                      <Link href="/discover">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                          data-testid="link-see-all-tracks"
                        >
                          See all
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div id="discover" className="mt-4 grid gap-3 scroll-mt-20">
                    {loading ? (
                      Array.from({ length: HOME_TRACK_LIMIT }).map((_, i) => (
                        <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white/5" />
                      ))
                    ) : previewTracks.length > 0 ? (
                      <>
                        {previewTracks.map((track) => (
                          <TrackCard
                            key={track.id}
                            track={track}
                            onPlay={(t) => {
                              if (active?.id === t.id) {
                                // Same track — toggle play/pause via shared state
                                setIsPlaying(!isPlaying);
                              } else {
                                // New track — switch and autoplay
                                setAutoPlay(true);
                                setActive(t);
                              }
                            }}
                            isActive={active?.id === track.id}
                          />
                        ))}
                        {/* CTA card to Discover page */}
                        {hasMore && (
                          <Link href={query ? `/discover?q=${encodeURIComponent(query)}` : "/discover"}>
                            <div
                              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-sm text-muted-foreground transition hover:border-white/25 hover:bg-white/5 hover:text-foreground"
                              data-testid="link-browse-all-tracks"
                            >
                              <Compass className="h-4 w-4" />
                              Browse all {filteredTracks.length} tracks on Discover
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                        No tracks found matching your search.
                      </div>
                    )}
                  </div>
                </div>

                {/* Trending community */}
                <div className="lg:col-span-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 shrink-0 text-fuchsia-500" />
                    <h2 className="truncate text-base font-semibold sm:text-lg" data-testid="text-trending-title">
                      {query ? "Matching Artists" : "Trending"}
                    </h2>
                  </div>
                  <div id="community" className="mt-4 grid gap-3 scroll-mt-20">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/5" />
                      ))
                    ) : filteredArtists.length > 0 ? (
                      filteredArtists.slice(0, 6).map((artist) => (
                        <ArtistRow key={artist.slug} artist={artist} />
                      ))
                    ) : (
                      <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
                        No artists match your search.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        <div className="h-24" aria-hidden="true" />
      </div>
    </div>
  );
}