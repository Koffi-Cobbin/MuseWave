import { useState, useEffect } from "react";
import { TrackShare } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  listTrackShares,
  shareTrackWithUser,
  revokeTrackShare,
} from "@/lib/queryClient";
import {
  Loader2, UserPlus, Trash2, Lock, Users,
} from "lucide-react";

interface ShareTrackModalProps {
  trackId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTrackModal({
  trackId,
  open,
  onOpenChange,
}: ShareTrackModalProps) {
  const { toast } = useToast();

  const [shares, setShares] = useState<TrackShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  // Add-person form
  const [addInput, setAddInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadShares = async () => {
    setSharesLoading(true);
    try {
      const data = await listTrackShares(trackId);
      setShares(data);
    } catch {
      // silently fail — non‑owners won't have access
    } finally {
      setSharesLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setAddInput("");
      loadShares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trackId]);

  const handleAddPerson = async () => {
    if (!addInput.trim()) return;
    setAddLoading(true);
    try {
      const isEmail = addInput.includes("@");
      const payload = isEmail
        ? { email: addInput.trim() }
        : { username: addInput.trim() };

      const newShare = await shareTrackWithUser(trackId, payload);
      setShares((prev) => {
        const exists = prev.find((s) => s.id === newShare.id);
        if (exists) return prev.map((s) => (s.id === newShare.id ? newShare : s));
        return [...prev, newShare];
      });
      setAddInput("");
      toast({
        title: "Access granted",
        description: `Shared with ${newShare.sharedWithUsername || addInput}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeTrackShare(trackId, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast({ title: "Access removed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke access";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Manage track access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Add person ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Grant access</Label>
            <p className="text-xs text-muted-foreground">
              Share this private track with a user by their username or email address.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Username or email address"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                className="flex-1"
                data-testid="input-share-track-person"
              />
              <Button
                onClick={handleAddPerson}
                disabled={addLoading || !addInput.trim()}
                size="sm"
                data-testid="button-share-track-add"
              >
                {addLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ── People with access ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              People with access
            </Label>

            {sharesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No one has been granted access yet.
              </p>
            ) : (
              <div className="space-y-1">
                {shares.map((share) => (
                  <ShareRow
                    key={share.id}
                    share={share}
                    onRevoke={handleRevoke}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Note about visibility ───────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                This only affects <strong>private</strong> tracks. Public tracks
                are visible to everyone and don't need sharing. Change the
                track's visibility in the edit dialog.
              </p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share row sub-component ─────────────────────────────────────────────────

interface ShareRowProps {
  share: TrackShare;
  onRevoke: (shareId: string) => void;
}

function ShareRow({ share, onRevoke }: ShareRowProps) {
  const initials = (share.sharedWithUsername ?? share.sharedWithEmail ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-muted/30 transition-colors"
      data-testid={`row-track-share-${share.id}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {share.sharedWithAvatar && <AvatarImage src={share.sharedWithAvatar} />}
        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {share.sharedWithUsername ?? share.sharedWithEmail ?? "Unknown user"}
        </p>
        {share.sharedWithUsername && share.sharedWithEmail && (
          <p className="text-xs text-muted-foreground truncate">{share.sharedWithEmail}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={() => onRevoke(share.id)}
        data-testid={`button-revoke-track-share-${share.id}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
