import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { apiRequestJson } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await apiRequestJson("POST", `/api/users/verify-email/${uidb64}/${token}/`);
        setStatus("success");
        setMessage("Your email has been successfully verified.");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed. The link may be invalid or expired.");
      }
    };

    if (uidb64 && token) {
      verify();
    }
  }, [uidb64, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass glow">
        <CardHeader>
          <CardTitle className="text-center">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your email address...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="font-medium">{message}</p>
              <Button onClick={() => setLocation("/")} className="w-full">
                Go to Home
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-destructive">{message}</p>
              <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
                Back to Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
