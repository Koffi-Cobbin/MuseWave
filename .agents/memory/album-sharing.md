---
name: Album sharing integration
description: How album sharing is wired in — schema, endpoints, helpers, modal, UI location.
---

## What was built

Album sharing mirrors the playlist sharing pattern (view/edit permissions, no link sharing):

- `shared/schema.ts` — `AlbumShare`, `SharedAlbum` (received), `MySharedAlbum` (sent) types added after `TrackStats`.
- `client/src/lib/apiConfig.ts` — `albums.shares(id)`, `albums.shareById(id, shareId)`, `albums.sharedWithMe`, `albums.sharedByMe` endpoints added to the albums section.
- `client/src/lib/queryClient.ts` — `listAlbumShares`, `shareAlbumWithUser`, `updateAlbumShare`, `revokeAlbumShare` helpers exported.
- `client/src/components/albums/ShareAlbumModal.tsx` — New component, similar to SharePlaylistModal minus link-sharing section.
- `client/src/hooks/use-shared-by-me.ts` — Extended with `sharedByMeAlbums`/`sharedWithMeAlbums` and their fetch functions.
- `client/src/pages/tracks.tsx` — Albums tab now has three sub-tabs (My Albums / Shared with Me / Shared by Me), album cards show a hover-reveal Share button that opens the modal.

**Why:** Backend has full album sharing API (`POST/GET/PATCH/DELETE /api/albums/{id}/shares`, `shared-by-me`, `shared-with-me`) but frontend had no implementation at all.

**How to apply:** The `apiRequestJson` auto-converts snake_case ↔ camelCase, so no manual field normalization is needed for any of these endpoints.
