// ─── LoginDialog (home.tsx replacement) ──────────────────────────────────────
// Drop-in replacement: wraps LoginModal with a "Log in" trigger button.
// Usage in home.tsx is unchanged:  <LoginDialog onSuccess={...} />

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";

export function LoginDialog({ onSuccess }: { onSuccess?: () => void }) {
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