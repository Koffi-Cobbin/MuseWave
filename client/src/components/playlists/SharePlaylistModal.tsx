import { useState, useEffect, useCallback } from "react";
import { Playlist, PlaylistShare } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { usePlaylists } from "@/contexts/playlist-context";
import {
  Loader2, Link2, Copy, Check, Trash2, ChevronDown,
  Globe, Lock, Users, UserPlus,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { cn } from "@/lib/utils";

interface SharePlaylistModalProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaylistUpdated?: (updated: Partial<Playlist>) => void;
}

type Permission = "view" | "edit";

export function SharePlaylistModal({
  playlist,
  open,
  onOpenChange,
  onPlaylistUpdated,
}: SharePlaylistModalProps) {
  const { toast } = useToast();
  const { shareWithUser, listShares, updateShare, revokeShare, generateLink, updateLink, revokeLink, renamePlaylist } = usePlaylists();

  const [shares, setShares] = useState<PlaylistShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  // Add-person form
  const [addInput, setAddInput] = useState("");
  const [addPermission, setAddPermission] = useState<Permission>("view");
  const [addLoading, setAddLoading] = useState(false);

  // Link state — taken from playlist prop (owner can see shareToken)
  const [shareToken, setShareToken] = useState<string | null>(playlist.shareToken ?? null);
  const [linkPermission, setLinkPermission] = useState<Permission>(playlist.linkPermission ?? "view");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Public toggle
  const [isPublic, setIsPublic] = useState(playlist.public ?? false);
  const [publicLoading, setPublicLoading] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/playlists/link/${shareToken}`
    : null;

  const loadShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const data = await listShares(playlist.id);
      setShares(data);
    } catch {
      // silently fail — non-owners won't have access
    } finally {
      setSharesLoading(false);
    }
  }, [playlist.id, listShares]);

  useEffect(() => {
    if (open) {
      setShareToken(playlist.shareToken ?? null);
      setLinkPermission(playlist.linkPermission ?? "view");
      setIsPublic(playlist.public ?? false);
      loadShares();
    }
  }, [open, playlist.shareToken, playlist.linkPermission, playlist.public, loadShares]);

  // ── Add person ─────────────────────────────────────────────────────────────

  const isEmail = addInput.includes("@");

  const handleAddPerson = async () => {
    if (!addInput.trim()) return;
    setAddLoading(true);
    try {
      const newShare = await shareWithUser(playlist.id, addInput.trim(), isEmail, addPermission);
      setShares(prev => {
        const exists = prev.find(s => s.id === newShare.id);
        if (exists) return prev.map(s => s.id === newShare.id ? newShare : s);
        return [...prev, newShare];
      });
      setAddInput("");
      toast({ title: "Access granted", description: `Shared with ${newShare.sharedWithUsername || addInput}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setAddLoading(false);
    }
  };

  // ── Change / revoke share ─────────────────────────────────────────────────

  const handleChangePermission = async (shareId: string, permission: Permission) => {
    try {
      const updated = await updateShare(playlist.id, shareId, permission);
      setShares(prev => prev.map(s => s.id === shareId ? updated : s));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update permission";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeShare(playlist.id, shareId);
      setShares(prev => prev.filter(s => s.id !== shareId));
      toast({ title: "Access removed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke access";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  // ── Link ──────────────────────────────────────────────────────────────────

  const handleGenerateLink = async () => {
    setLinkLoading(true);
    try {
      const result = await generateLink(playlist.id, linkPermission);
      setShareToken(result.shareToken);
      setLinkPermission(result.linkPermission);
      onPlaylistUpdated?.({ shareToken: result.shareToken, linkPermission: result.linkPermission });
      toast({ title: "Link generated" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate link";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLinkLoading(false);
    }
  };

  const handleChangeLinkPermission = async (permission: Permission) => {
    setLinkPermission(permission);
    if (!shareToken) return;
    try {
      await updateLink(playlist.id, permission);
      onPlaylistUpdated?.({ linkPermission: permission });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update link";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleRevokeLink = async () => {
    setLinkLoading(true);
    try {
      await revokeLink(playlist.id);
      setShareToken(null);
      onPlaylistUpdated?.({ shareToken: null });
      toast({ title: "Link revoked" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke link";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Public toggle ─────────────────────────────────────────────────────────

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
    setPublicLoading(true);
    try {
      await renamePlaylist(playlist.id, playlist.name, playlist.description, checked);
      onPlaylistUpdated?.({ public: checked });
      toast({
        title: checked ? "Playlist is now public" : "Playlist is now private",
        description: checked
          ? "Anyone can see this playlist on your profile"
          : "Only people you share it with can access it",
      });
    } catch (err) {
      setIsPublic(!checked);
      const msg = err instanceof Error ? err.message : "Failed to update visibility";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setPublicLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{playlist.name}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Add person ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Add people</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Username or email address"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                className="flex-1"
                data-testid="input-share-person"
              />
              <Select value={addPermission} onValueChange={(v) => setAddPermission(v as Permission)}>
                <SelectTrigger className="w-[100px]" data-testid="select-share-permission">
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
                size="sm"
                data-testid="button-share-add"
              >
                {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* ── People with access ───────────────────────────────────────── */}
          {(sharesLoading || shares.length > 0) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">People with access</Label>
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
                      onRevoke={handleRevokeShare}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* ── Link sharing ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Link sharing</Label>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {shareToken ? "Anyone with the link" : "No link generated"}
                  </span>
                </div>
                {shareToken && (
                  <Select value={linkPermission} onValueChange={(v) => handleChangeLinkPermission(v as Permission)}>
                    <SelectTrigger className="w-[100px] h-7 text-xs" data-testid="select-link-permission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Viewer</SelectItem>
                      <SelectItem value="edit">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {shareToken && shareUrl && (
                <div className="flex items-center gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 h-8 text-xs bg-background"
                    data-testid="input-share-link"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    {linkCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                {!shareToken ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleGenerateLink}
                    disabled={linkLoading}
                    data-testid="button-generate-link"
                  >
                    {linkLoading
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Link2 className="h-4 w-4 mr-2" />}
                    Generate link
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleGenerateLink}
                      disabled={linkLoading}
                      data-testid="button-regenerate-link"
                    >
                      {linkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Regenerate link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleRevokeLink}
                      disabled={linkLoading}
                      data-testid="button-revoke-link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Public visibility ────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isPublic
                ? <Globe className="h-4 w-4 text-primary" />
                : <Lock className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{isPublic ? "Public playlist" : "Private playlist"}</p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Appears on your profile for everyone to see"
                    : "Only visible to people you share it with"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={publicLoading}
              data-testid="switch-playlist-public"
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share row sub-component ─────────────────────────────────────────────────

interface ShareRowProps {
  share: PlaylistShare;
  onChangePermission: (shareId: string, permission: "view" | "edit") => void;
  onRevoke: (shareId: string) => void;
}

function ShareRow({ share, onChangePermission, onRevoke }: ShareRowProps) {
  const initials = (share.sharedWithUsername ?? share.sharedWithEmail ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-muted/30 transition-colors" data-testid={`row-share-${share.id}`}>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            data-testid={`button-share-permission-${share.id}`}
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
            Viewer — can only view
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChangePermission(share.id, "edit")}
            className={cn(share.permission === "edit" && "font-medium text-primary")}
          >
            Editor — can add/remove tracks
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
