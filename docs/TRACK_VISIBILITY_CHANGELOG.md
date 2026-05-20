# Track Visibility & Sharing — Implementation Changelog

**Date:** 2026-05-20  
**Plan reference:** `docs/TRACK_VISIBILITY_IMPLEMENTATION_PLAN.md`  

---

## Summary

Implemented frontend support for the existing backend track visibility (`public`/`private`) and sharing features across 10 files (2 new, 8 modified). All errors were already pre-existing and unrelated to this work.

---

## Files Changed

### Phase 1 — Foundation

#### `shared/schema.ts`
- Added `visibility: z.enum(["public", "private"]).default("public")` to `trackSchema`
- Added new `trackShareSchema` Zod schema + `TrackShare` type

#### `client/src/lib/apiConfig.ts`
- Added `tracks.shares(id)` and `tracks.shareById(id, shareId)` endpoint builders

#### `client/src/lib/queryClient.ts`
- Added `listTrackShares(trackId)` — GET shares for a track
- Added `shareTrackWithUser(trackId, payload)` — POST new share by username/email
- Added `revokeTrackShare(trackId, shareId)` — DELETE a share
- Added required imports (`API_ENDPOINTS`, `TrackShare`)

### Phase 2 — Upload & Edit

#### `client/src/pages/upload.tsx`
- Added `visibility: "public" | "private"` to the `UploadDraft` interface
- Added a two-button Public/Private toggle (with `Globe`/`Lock` icons) to Step 0 (Track details), after the mood selector
- Appends `visibility` to the upload FormData in `onSubmit()`
- Resets `visibility` to `"public"` on the "Upload another track" flow
- Added `Globe` and `Lock` to lucide-react imports

#### `client/src/components/playlists/TrackActionsMenu.tsx`
- Added `editVisibility` state to the Edit Track dialog
- Added a Public/Private toggle in the Edit dialog (after description)
- Includes `visibility` in the PATCH body on save
- Resets `editVisibility` when the edit menu item is clicked
- Added `Globe`, `Lock` imports and `cn` utility import

### Phase 3 — Track Sharing

#### `client/src/hooks/use-track-shares.ts` *(new)*
- Custom hook wrapping track share API calls
- Exposes `shares`, `loading`, `loadShares`, `addShare`, `removeShare`
- Uses the project's `useToast` pattern for error feedback

#### `client/src/components/tracks/ShareTrackModal.tsx` *(new)*
- Full modal component for managing track shares
- Add-person form with username/email input
- Shares list with avatar, name, and revoke button for each
- Helper note explaining the distinction between public and private tracks
- Patterned after the existing `SharePlaylistModal`

#### `client/src/components/playlists/TrackActionsMenu.tsx`
- Added "Manage sharing" menu item in the owner actions section
- Renders `ShareTrackModal` with the track's ID

### Phase 4 — Display

#### `client/src/components/TrackCard.tsx`
- *Desktop:* Added `Lock` + "Private" badge in the metadata row (alongside genre)
- *Mobile:* Added compact inline `Lock` + "Private" indicator below the artist name
- Added `Lock` to lucide-react imports

#### `client/src/components/PlayerBar.tsx`
- Improved download error toast: "Unable to download this track. It may be private."

---

## Backend Dependency

All backend endpoints were already deployed at `https://kofficobbin.pythonanywhere.com`:
- Track `visibility` field (sent during creation/update)
- `POST/GET/DELETE /api/tracks/<id>/shares` endpoints
- Access control on detail, stream, download, play, and search endpoints

No backend changes were needed.

---

## Verification

- TypeScript compilation: **zero new errors**
- Existing pre-type errors in `artist.tsx` and `verify-email.tsx` are unrelated
- All changed files follow existing project patterns (lucide icons, `cn()` styling, `useToast`, same import structure as `SharePlaylistModal`, `TrackCard`, etc.)
