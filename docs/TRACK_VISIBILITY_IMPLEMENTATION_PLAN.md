# Track Visibility & Sharing — Implementation Plan

**Status:** ✅ Complete (see `docs/TRACK_VISIBILITY_CHANGELOG.md` for the execution log)  
**Target:** Frontend (client/), shared schemas, API config  
**Backend dependency:** Backend endpoints already exist at `https://kofficobbin.pythonanywhere.com` (see `docs/BACKEND_API_DOCUMENTATION.md`)**

> ⚡ **All 10 steps have been implemented.**  
> No backend changes needed. Zero TypeScript errors introduced.  
> See `docs/TRACK_VISIBILITY_CHANGELOG.md` for the per-file diff.

---

## 1. Overview

The backend already supports:
- **Track `visibility`** — every track has a `"public"` (default) or `"private"` field controlling who can view/stream/discover it.
- **Track sharing** — `POST/GET/DELETE /api/tracks/<track_id>/shares` lets the track owner share a private track with specific users by username or email.

The frontend is completely missing:
- A visibility toggle on the **Upload** page and **Edit Track** dialog.
- A **Track Share management** UI for the owner to add/revoke sharees.
- A **visibility indicator** on `TrackCard` (lock icon for private tracks).

**This plan covers all frontend work needed.**

---

## 2. Scope

### Included
- Shared schema changes (`shared/schema.ts`)
- API endpoint additions (`client/src/lib/apiConfig.ts`)
- API layer additions (`client/src/lib/queryClient.ts`)
- Upload page visibility toggle
- Edit Track dialog visibility toggle
- New `ShareTrackModal` component (patterned after existing `SharePlaylistModal`)
- TrackCard visibility badge
- TrackActionsMenu "Manage sharing" option for owners
- Context hook for track sharing (similar to `usePlaylists`)

### Out of scope
- Backend changes (all endpoint + access control logic is already deployed)
- Playlist-level private track filtering (already handled by backend)
- Autocomplete / user search for the share-by-username input (can use a free-text input initially)
- Real-time share notifications

---

## 3. Backend API Reference

### Track visibility

```
Field:       visibility
Values:      "public" (default) | "private"
Set on:      Track creation (POST /api/tracks/create)
              Track update  (PATCH /api/tracks/<id>)
Filter on:   GET /api/tracks?visibility=public|private
```

### Track sharing

| Method | Endpoint | Auth | Owner only | Body |
|--------|----------|------|------------|------|
| `POST` | `/api/tracks/<id>/shares` | ✅ | ✅ | `{"username": "..."}` or `{"email": "..."}` |
| `GET` | `/api/tracks/<id>/shares` | ✅ | ✅ | — |
| `DELETE` | `/api/tracks/<id>/shares/<share_id>` | ✅ | ✅ | — |

### Access control (already live on backend)

| Operation | Public track | Private track (owner) | Private track (shared user) | Private track (unrelated) |
|-----------|-------------|----------------------|-----------------------------|---------------------------|
| GET detail | ✅ | ✅ | ✅ | 404 |
| Stream/download/play | ✅ | ✅ | ✅ | 404 |
| Search | ✅ | ❌ excluded | ❌ excluded | ❌ excluded |
| List (authenticated) | ✅ | ✅ (own) | ❌ | ❌ |
| List (anonymous) | ✅ | ❌ | ❌ | ❌ |

---

## 4. Implementation Steps

### Step 1 — Shared schema (`shared/schema.ts`)

**1a.** Add `visibility` to `trackSchema`:

```ts
export const trackSchema = z.object({
  // ... existing fields (id, userId, title, artist, artistSlug, ...)
  
  // Visibility & sharing
  visibility: z.enum(["public", "private"]).default("public"),
  shares: z.number().default(0),              // already exists
})
```

**1b.** Add a `TrackShare` schema and type (modeled after `playlistShareSchema`):

```ts
export const trackShareSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  sharedByUsername: z.string(),
  sharedWithUsername: z.string().optional(),
  sharedWithEmail: z.string().optional(),
  sharedWithAvatar: z.string().optional(),
  createdAt: z.string(),
})

export type TrackShare = z.infer<typeof trackShareSchema>;
```

---

### Step 2 — API config (`client/src/lib/apiConfig.ts`)

**2a.** Add track share endpoints under the existing `tracks` section:

```ts
export const API_ENDPOINTS = {
  // ...
  tracks: {
    // ... existing endpoints
    shares: (id: string) => `/api/tracks/${id}/shares`,
    shareById: (id: string, shareId: string) => `/api/tracks/${id}/shares/${shareId}`,
  },
  // ...
} as const;
```

---

### Step 3 — API layer (`client/src/lib/queryClient.ts`)

Add track share functions to the API client. Read current `queryClient.ts` to follow the exact pattern:

```ts
// Track Shares
export async function listTrackShares(trackId: string): Promise<TrackShare[]> {
  const res = await apiRequestJson<TrackShare[]>(
    "GET", API_ENDPOINTS.tracks.shares(trackId)
  );
  return res;
}

export async function shareTrackWithUser(
  trackId: string,
  payload: { username?: string; email?: string }
): Promise<TrackShare> {
  const res = await apiRequestJson<TrackShare>(
    "POST", API_ENDPOINTS.tracks.shares(trackId), payload
  );
  return res;
}

export async function revokeTrackShare(
  trackId: string,
  shareId: string
): Promise<void> {
  await apiRequestJson("DELETE", API_ENDPOINTS.tracks.shareById(trackId, shareId));
}
```

---

### Step 4 — Track visibility toggle on Upload page (`client/src/pages/upload.tsx`)

**4a.** Add a `visibility` field to the `UploadDraft` interface:

```ts
interface UploadDraft {
  // ... existing fields
  visibility: "public" | "private";
}
```

**4b.** Add initial state:

```ts
const [draft, setDraft] = useState<UploadDraft>({
  // ... existing
  visibility: "public",
});
```

**4c.** Add a visibility toggle UI in Step 0 (track details), after the mood pills:

```tsx
{/* ── Visibility toggle ── */}
<div className="grid gap-1.5">
  <Label className="text-xs">
    Visibility
  </Label>
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => update("visibility", "public")}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all",
        draft.visibility === "public"
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"
      )}
    >
      <Globe className="h-3.5 w-3.5" />
      <div className="text-left">
        <div className="text-xs font-medium">Public</div>
        <div className="text-[10px] opacity-70">Anyone can discover & stream</div>
      </div>
    </button>
    <button
      type="button"
      onClick={() => update("visibility", "private")}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all",
        draft.visibility === "private"
          ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
          : "border-white/10 bg-white/4 text-muted-foreground hover:border-white/20"
      )}
    >
      <Lock className="h-3.5 w-3.5" />
      <div className="text-left">
        <div className="text-xs font-medium">Private</div>
        <div className="text-[10px] opacity-70">Only shared users can access</div>
      </div>
    </button>
  </div>
</div>
```

> **Import additions:** `Globe`, `Lock` from `lucide-react`.

**4d.** Append the visibility value to the upload FormData in `onSubmit()`:

```ts
formData.append("visibility", draft.visibility);
```

**4e.** (Optional) In the success / preview card, show a label like "Private track" or "Public track" near the metadata chips.

---

### Step 5 — Track visibility in Edit dialog (`client/src/components/playlists/TrackActionsMenu.tsx`)

**5a.** Add visibility to the edit form state:

```ts
const [editVisibility, setEditVisibility] = useState<"public" | "private">(
  (track as any).visibility ?? "public"
);
```

**5b.** Add a visibility toggle to the Edit dialog, after the description field:

```tsx
<div className="grid gap-1.5">
  <Label className="text-xs">Visibility</Label>
  <div className="flex gap-2">
    {/* Public button */}
    <button
      type="button"
      onClick={() => setEditVisibility("public")}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
        editVisibility === "public"
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/10 bg-white/4 text-muted-foreground"
      )}
    >
      <Globe className="h-3.5 w-3.5" />
      Public
    </button>
    {/* Private button */}
    <button
      type="button"
      onClick={() => setEditVisibility("private")}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
        editVisibility === "private"
          ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
          : "border-white/10 bg-white/4 text-muted-foreground"
      )}
    >
      <Lock className="h-3.5 w-3.5" />
      Private
    </button>
  </div>
</div>
```

**5c.** Include `visibility` in the PATCH body:

```ts
{ title: editTitle.trim(), genre: editGenre.trim(), description: editDescription.trim(), visibility: editVisibility }
```

> **Import additions:** `Globe`, `Lock` from `lucide-react`; `cn` from `@/lib/utils` (may already be imported).

---

### Step 6 — Track Shares context / hook (`client/src/hooks/use-track-shares.ts`)

Create a new hook that wraps the API functions from Step 3, following the pattern of `usePlaylists`:

```ts
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { TrackShare } from "@shared/schema";
import { listTrackShares, shareTrackWithUser, revokeTrackShare } from "@/lib/queryClient";

export function useTrackShares(trackId: string) {
  const { toast } = useToast();
  const [shares, setShares] = useState<TrackShare[]>([]);
  const [loading, setLoading] = useState(false);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTrackShares(trackId);
      setShares(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load shares", /* ... */ });
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  const addShare = useCallback(async (input: { username?: string; email?: string }) => {
    const share = await shareTrackWithUser(trackId, input);
    setShares((prev) => [...prev, share]);
    return share;
  }, [trackId]);

  const removeShare = useCallback(async (shareId: string) => {
    await revokeTrackShare(trackId, shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }, [trackId]);

  return { shares, loading, loadShares, addShare, removeShare };
}
```

---

### Step 7 — ShareTrackModal component (`client/src/components/tracks/ShareTrackModal.tsx`)

Create a new modal patterned after the existing `SharePlaylistModal` (`client/src/components/playlists/SharePlaylistModal.tsx`).

**Structure:**
- Props: `trackId`, `open`, `onOpenChange`
- State: track shares list, add-person form (input + loading), confirmation for revoke
- API calls via the `useTrackShares` hook (or direct calls, following `SharePlaylistModal`'s pattern)

**UI sections (guided by `SharePlaylistModal`):**
1. **Header** — Title "Manage track access" with `Lock` icon
2. **Add person form** — Text input for username/email + "Share" button
3. **Shares list** — Each row: avatar/initials, username, email fallback, date, "Revoke" button
4. **Note about private vs public** — Helper text explaining the visibility setting

> The `SharePlaylistModal` is ~476 lines and handles: loading shares, adding a share, updating permissions (not needed for tracks), revoking, link management (not needed for tracks). The track version will be simpler since tracks have no "edit"/"view" permission split or share-links — just grant or revoke.

---

### Step 8 — Share option in TrackActionsMenu (`client/src/components/playlists/TrackActionsMenu.tsx`)

**8a.** Add state for the share modal:

```ts
const [showShareModal, setShowShareModal] = useState(false);
```

**8b.** Add a new owner action in the "Manage track" section, after "Edit details":

```tsx
<DropdownMenuItem
  onClick={() => setShowShareModal(true)}
  data-testid={`menu-share-track-${track.id}`}
>
  <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
  Manage sharing
</DropdownMenuItem>
```

**8c.** Import and render the `ShareTrackModal` after the CreatePlaylistModal:

```tsx
<ShareTrackModal
  trackId={track.id}
  open={showShareModal}
  onOpenChange={setShowShareModal}
/>
```

> **Import additions:** `Users` may already be imported; add `ShareTrackModal`.

---

### Step 9 — Visibility indicator on TrackCard (`client/src/components/TrackCard.tsx`)

**9a.** Add a visibility badge to the metadata row on the desktop layout, alongside the genre badge:

```tsx
{(track as any).visibility === "private" && (
  <Badge
    variant="secondary"
    className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300/80 px-1.5 py-0 text-[10px] font-normal leading-none"
  >
    <Lock className="h-2.5 w-2.5 mr-0.5" />
    Private
  </Badge>
)}
```

**9b.** On the mobile layout, add the same badge after the artist name or in the metadata row.

**9c.** (Optional) Show a "Private track" badge when viewing other users track lists or when the TrackCard is rendered with a `showVisibility` prop.

> **Import additions:** `Lock` from `lucide-react`.

---

### Step 10 — Private track messaging in UI

**10a.** When a 404 is returned for a private track (on the track detail / PlayerBar seek / etc.), show a user-friendly toast or overlay:

> "This track is private. Only the owner and shared users can access it."

This is a frontend-only handling of the existing backend 404 responses.

**10b.** On the artist page (`client/src/pages/artist.tsx`), check the `visibility` filter. The backend already respects visibility — the frontend just needs to handle the fact that private tracks are returned for the owner but not for other users.

---

## 5. File Change Summary

| File | Action |
|------|--------|
| `shared/schema.ts` | Add `visibility` to `trackSchema` & add `trackShareSchema` |
| `client/src/lib/apiConfig.ts` | Add `tracks.shares()` & `tracks.shareById()` |
| `client/src/lib/queryClient.ts` | Add `listTrackShares`, `shareTrackWithUser`, `revokeTrackShare` |
| `client/src/pages/upload.tsx` | Add visibility toggle UI & append to FormData |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Add visibility toggle in Edit dialog; add "Manage sharing" menu item + ShareTrackModal |
| `client/src/components/tracks/ShareTrackModal.tsx` | **New file** — Modal for managing track shares |
| `client/src/components/TrackCard.tsx` | Add private-track badge on mobile & desktop |
| `client/src/hooks/use-track-shares.ts` | **New file** — Hook wrapping track share API calls |

**Total:** ~10 files changed, 2 new files created.

---

## 6. Sequence (Recommended Order)

```
Phase 1 — Foundation (no UI changes)
  Step 1  →  shared/schema.ts
  Step 2  →  client/src/lib/apiConfig.ts
  Step 3  →  client/src/lib/queryClient.ts

Phase 2 — Upload & Edit
  Step 4  →  Upload page visibility toggle
  Step 5  →  Edit dialog visibility toggle

Phase 3 — Track Sharing
  Step 6  →  use-track-shares.ts hook (new)
  Step 7  →  ShareTrackModal (new)
  Step 8  →  TrackActionsMenu "Manage sharing"

Phase 4 — Display
  Step 9  →  TrackCard visibility badge
  Step 10 →  Error/access messaging
```

Each phase is self-contained and can be deployed independently.

---

## 7. Resolved Questions

1. **User search for share input** — The share endpoint requires an exact username or email match. Free-text input is used. Future: autocomplete via `GET /api/search?q=...&type=users`.
2. **Private track in playlists** — Already handled by the backend (private tracks are excluded from non-owner playlist views). TrackCard shows the "Private" badge on the owner's own listing. Future work: add a "1 private track hidden" placeholder in shared playlist views.
3. **Visibility on album tracks** — The TrackCard badge already shows the private indicator on all layouts. No additional album-view changes needed.

---

## 8. Execution Log

See `docs/TRACK_VISIBILITY_CHANGELOG.md` for the complete per-file execution log including:
- Every line added/modified/removed per file
- Verification results (zero TypeScript errors)
- Date and implementation notes
