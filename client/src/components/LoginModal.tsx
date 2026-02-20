import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";

type View = "login" | "signup" | "forgot" | "sent";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [view, setView] = useState<View>("login");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const { toast } = useToast();

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const reset = () => {
    setView("login");
    setIdentifier(""); setPassword(""); setDisplayName("");
    setEmail(""); setConfirmPassword(""); setForgotEmail("");
    setError(""); setShowPw(false); setShowConfirm(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLogin = async () => {
    if (!identifier || !password) return setError("Fill in all fields.");
    setLoading(true); setError("");
    try {
      await login(identifier, password);
      toast({ title: "Welcome back!" });
      handleClose();
      onSuccess?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!displayName || !email || !password || !confirmPassword) return setError("Fill in all fields.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setLoading(true); setError("");
    try {
      const res = await apiRequestJson<{ user: User; token?: string }>("POST", API_ENDPOINTS.SIGNUP, {
        username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""),
        displayName, email, password,
      });
      await login(email, password);
      toast({ title: "Account created!", description: "Welcome to MuseWave." });
      handleClose();
      onSuccess?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail) return setError("Enter your email.");
    setLoading(true); setError("");
    try {
      await apiRequestJson("POST", API_ENDPOINTS.FORGOT_PASSWORD, { email: forgotEmail });
      setView("sent");
    } catch {
      setError("Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<View, string> = {
    login: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
    sent: "Check your email",
  };

  const subtitles: Record<View, string> = {
    login: "Sign in to your MuseWave account.",
    signup: "Join the indie music community.",
    forgot: "Enter your email and we'll send a reset link.",
    sent: "",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal — uses flex on the overlay div to center perfectly */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="pointer-events-auto relative w-full max-w-sm rounded-2xl border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={titles[view]}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-muted-foreground transition hover:bg-white/14 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Logo mark */}
              <div className="mb-5 flex items-center gap-2.5">
                <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-emerald-400/90 via-emerald-400/20 to-fuchsia-500/80 shadow-[0_6px_18px_-6px_rgba(16,185,129,.8)]" />
                <span className="text-sm font-semibold tracking-tight">MuseWave</span>
              </div>

              {/* Header */}
              <div className="mb-4">
                <h2 className="text-lg font-semibold leading-tight">{titles[view]}</h2>
                {subtitles[view] && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{subtitles[view]}</p>
                )}
              </div>

              {/* ── Login ── */}
              <AnimatePresence mode="wait">
                {view === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="grid gap-3"
                  >
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-identifier" className="text-xs">Username or email</Label>
                      <Input
                        id="lm-identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        autoComplete="username"
                        data-testid="input-identifier"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-password" className="text-xs">Password</Label>
                      <div className="relative">
                        <Input
                          id="lm-password"
                          type={showPw ? "text" : "password"}
                          className="pr-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          autoComplete="current-password"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPw((p) => !p)}
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <Button onClick={handleLogin} disabled={loading} className="glow mt-1 w-full" data-testid="button-login-submit">
                      {loading ? "Logging in…" : "Log in"}
                    </Button>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <button type="button" onClick={() => { setView("signup"); setError(""); }} data-testid="button-switch-to-signup" className="hover:text-foreground transition-colors">
                        Create account
                      </button>
                      <button type="button" onClick={() => { setView("forgot"); setError(""); }} data-testid="button-forgot-password" className="hover:text-foreground transition-colors">
                        Forgot password?
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Signup ── */}
                {view === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="grid gap-3"
                  >
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-displayName" className="text-xs">Display name</Label>
                      <Input id="lm-displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-display-name" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-email" className="text-xs">Email</Label>
                      <Input id="lm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" autoComplete="email" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-new-password" className="text-xs">Password</Label>
                      <div className="relative">
                        <Input id="lm-new-password" type={showPw ? "text" : "password"} className="pr-9" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-signup-password" autoComplete="new-password" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw((p) => !p)} tabIndex={-1}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-confirm-password" className="text-xs">Confirm password</Label>
                      <div className="relative">
                        <Input id="lm-confirm-password" type={showConfirm ? "text" : "password"} className="pr-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="input-confirm-password" autoComplete="new-password" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm((p) => !p)} tabIndex={-1}>
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <Button onClick={handleSignup} disabled={loading} className="glow mt-1 w-full" data-testid="button-signup-submit">
                      {loading ? "Creating account…" : "Create account"}
                    </Button>
                    <button type="button" className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setView("login"); setError(""); }} data-testid="button-switch-to-login">
                      Already have an account? Log in
                    </button>
                  </motion.div>
                )}

                {/* ── Forgot ── */}
                {view === "forgot" && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="grid gap-3"
                  >
                    <div className="grid gap-1.5">
                      <Label htmlFor="lm-forgot-email" className="text-xs">Email</Label>
                      <Input id="lm-forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} data-testid="input-forgot-email" autoComplete="email" />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <Button onClick={handleForgot} disabled={loading} className="glow mt-1 w-full" data-testid="button-send-reset">
                      {loading ? "Sending…" : "Send reset link"}
                    </Button>
                    <button type="button" onClick={() => { setView("login"); setError(""); }} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-to-login">
                      <ArrowLeft className="h-3 w-3" /> Back to log in
                    </button>
                  </motion.div>
                )}

                {/* ── Sent ── */}
                {view === "sent" && (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="grid gap-4"
                  >
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">Reset link sent. Check your spam folder if it doesn't arrive within a few minutes.</p>
                    </div>
                    <button type="button" onClick={() => { setView("login"); setError(""); }} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-to-login-from-sent">
                      <ArrowLeft className="h-3 w-3" /> Back to log in
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}