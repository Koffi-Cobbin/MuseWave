import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Extract uid and token from URL params using useRoute
  const [match, params] = useRoute("/reset-password/:uid/:token");

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract uid and token from URL on component mount
  useEffect(() => {
    if (match && params) {
      const { uid: urlUid, token: urlToken } = params;

      if (urlUid && urlToken) {
        setUid(urlUid);
        setToken(urlToken);
      } else {
        toast({
          title: "Invalid reset link",
          description: "This password reset link is invalid or malformed.",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/"), 3000);
      }
    } else {
      toast({
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/"), 3000);
    }
  }, [match, params, toast, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.resetPasswordConfirm}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid,
          token: token,
          new_password: newPassword,
          new_password_confirm: confirmPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error cases
        const errorMessage = 
          errorData.error?.uid?.[0] || 
          errorData.error?.token?.[0] || 
          errorData.error?.new_password?.[0] ||
          errorData.error?.new_password_confirm?.[0] ||
          errorData.error ||
          errorData.detail ||
          "Failed to reset password. The link may have expired.";

        throw new Error(errorMessage);
      }

      setIsSuccess(true);
      toast({
        title: "Password reset successful!",
        description: "Your password has been changed. Redirecting to login...",
      });

      // Redirect to home page after 3 seconds
      setTimeout(() => setLocation("/"), 3000);

    } catch (error) {
      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while extracting params
  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
            <CardDescription className="text-center">
              Validating your reset link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Password Reset Complete!</CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully changed. You'll be redirected to the home page shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(100vw_60vh_at_20%_0%,rgba(16,185,129,0.18),transparent_60%)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}