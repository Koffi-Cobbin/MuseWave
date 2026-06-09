import { useState, useEffect, useCallback } from "react";
import type { Album, AlbumShare } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  listAlbumShares,
  shareAlbumWithUser,
  updateAlbumShare,
  revokeAlbumShare,
} from "@/lib/queryClient";
import { Loader2, Trash2, ChevronDown, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Permission = "view" | "edit";

interface ShareAlbumModalProps {
  album: Album;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareAlbumModal({ album, open, onOpenChange }: ShareAlbumModalProps) {
  const { toast } = useToast();

  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [addInput, setAddInput] = useState("");
  const [addPermission, setAddPermission] = useState<Permission>("view");
  const [addLoading, setAddLoading] = useState(false);

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const data = await listAlbumShares(album.id);
      setShares(data);
    } catch {
      // silently fail — non-owners won't have access
    } finally {
      setSharesLoading(false);
    }
  }, [album.id]);

  useEffect(() => {
    if (open) {
      setAddInput("");
      loadShares();
    }
  }, [open, loadShares]);

  const isEmail = addInput.includes("@");

  const handleAddPerson = async () => {
    if (!addInput.trim()) return;
    setAddLoading(true);
    try {
      const payload = isEmail
        ? { email: addInput.trim(), permission: addPermission }
        : { username: addInput.trim(), permission: addPermission };
      const newShare = await shareAlbumWithUser(album.id, payload);
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

  const handleChangePermission = async (shareId: string, permission: Permission) => {
    try {
      const updated = await updateAlbumShare(album.id, shareId, permission);
      setShares((prev) => prev.map((s) => (s.id === shareId ? updated : s)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update permission";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeAlbumShare(album.id, shareId);
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
            <Users className="h-5 w-5" />
            Share "{album.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Add person ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Add people</Label>
            <p className="text-xs text-muted-foreground">
              Share this album with a user by their username or email address.
            </p>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Username or email address"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                className="w-full"
                data-testid="input-share-album-person"
              />
              <div className="flex gap-2 w-full">
                <Select
                  value={addPermission}
                  onValueChange={(v) => setAddPermission(v as Permission)}
                >
                  <SelectTrigger className="flex-1 h-10" data-testid="select-album-share-permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Viewer</SelectItem>
                    <SelectItem value="edit">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddPerson}
                  disabled={addLoading || !addInput.trim()}
                  className="h-10 w-10 p-0 shrink-0"
                  data-testid="button-share-album-add"
                >
                  {addLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* ── People with access ──────────────────────────────────────────── */}
          {(sharesLoading || shares.length > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  People with access
                </Label>
                {sharesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {shares.map((share) => (
                      <ShareRow
                        key={share.id}
                        share={share}
                        onChangePermission={handleChangePermission}
                        onRevoke={handleRevoke}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share row sub-component ─────────────────────────────────────────────────

interface ShareRowProps {
  share: AlbumShare;
  onChangePermission: (shareId: string, permission: "view" | "edit") => void;
  onRevoke: (shareId: string) => void;
}

function ShareRow({ share, onChangePermission, onRevoke }: ShareRowProps) {
  const initials = (share.sharedWithUsername ?? share.sharedWithEmail ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-muted/30 transition-colors"
      data-testid={`row-album-share-${share.id}`}
    >
      <Avatar className="h-7 w-7 shrink-0">
        {share.sharedWithAvatar && <AvatarImage src={share.sharedWithAvatar} />}
        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {share.sharedWithUsername ?? share.sharedWithEmail ?? "Unknown user"}
        </p>
        {share.sharedWithUsername && share.sharedWithEmail && (
          <p className="text-xs text-muted-foreground truncate">{share.sharedWithEmail}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-16 px-1.5 text-xs gap-0.5 text-muted-foreground shrink-0 justify-between"
            data-testid={`button-album-share-permission-${share.id}`}
          >
            {share.permission === "edit" ? "Editor" : "Viewer"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onChangePermission(share.id, "view")}
            className={cn(share.permission === "view" && "font-medium text-primary")}
          >
            Viewer
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChangePermission(share.id, "edit")}
            className={cn(share.permission === "edit" && "font-medium text-primary")}
          >
            Editor
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRevoke(share.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Remove access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
