# Shared Tracks Feature — Implementation Plan

**Status**: Draft | **Target**: User-facing shared tracks view | **Updated**: 2026-05-22

---

## Overview

Add a "Shared with Me" view for tracks, mirroring the existing playlist shared-with-me pattern. Users will be able to see all tracks that other users have shared with them, play them, and see who shared each track.

---

## What Exists Today

### Backend (Django — deployed on `pythonanywhere.com`)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/tracks/<id>/shares` | Share a private track (by username/email) |
| `GET /api/tracks/<id>/shares` | List shares for a track (owner only) |
| `DELETE /api/tracks/<id>/shares/<share_id>` | Revoke a share |

**Missing**: `GET /api/tracks/shared-with-me` — no endpoint exists to list tracks shared with the authenticated user.

### Frontend

| File | What Exists |
|------|-------------|
| `client/src/lib/apiConfig.ts` | Track share URLs defined but no `sharedWithMe` endpoint |
| `client/src/lib/queryClient.ts` | `listTrackShares()`, `shareTrackWithUser()`, `revokeTrackShare()` but no `listSharedTracks()` |
| `shared/schema.ts` | `TrackShare` schema exists; no "shared track with track data" response type |
| `client/src/components/tracks/ShareTrackModal.tsx` | Full share management UI (owner side — add/revoke) |
| `client/src/hooks/use-track-shares.ts` | Hook for loading/adding/removing shares on a single track |

### Playlist "Shared With Me" Pattern (reference)

| Component | What It Does |
|-----------|-------------|
| `GET /api/playlists/shared-with-me` | Backend endpoint (already exists) |
| `API_ENDPOINTS.playlists.sharedWithMe` | URL in apiConfig |
| `playlist-context.tsx` → `fetchSharedWithMe()` | React context method |
| `playlists.tsx` → "Shared with me" tab | UI tab rendering shared playlists |
| `artist.tsx` → "Shared with me" section | Section on artist profile page |
| `PlaylistCard.tsx` → `myPermission` badge | Card shows shared badge + permission level |

---

## Implementation

### Phase 1: Backend — New Django Endpoint

**File**: `backend/tracks/views.py` (on the Django server)

Add a new view:

```
GET /api/tracks/shared-with-me
Authorization: Bearer <jwt>
```

**Behavior**:
- Authenticated only (returns 401 if no token)
- Query the `TrackShare` model for all records where `shared_with = request.user`
- JOIN with the `Track` model to get full track data
- Return an array of objects, each containing:
  - All track fields (id, title, artist, genre, audio_duration, cover_url, etc.)
  - `shared_by_username` — who shared this track
  - `shared_by_display_name` — display name of the sharer
  - `shared_by_avatar` — avatar URL of the sharer
  - `shared_at` — timestamp of the share

**Response shape** (proposed):
```json
[
  {
    "id": "track-uuid",
    "title": "Secret Demo",
    "artist": "John Doe",
    "genre": "Pop",
    "audio_duration": 180.0,
    "cover_url": "https://...",
    "audio_url": "https://...",
    "visibility": "private",
    "published": true,
    "plays": 5,
    "likes": 0,
    "shared_by_username": "john_doe",
    "shared_by_display_name": "John Doe",
    "shared_by_avatar": "https://...",
    "shared_at": "2026-05-20T10:30:00Z"
  }
]
```

**URL pattern**: `/api/tracks/shared-with-me` (following the playlist convention)

**URLconf addition**: Add to `backend/tracks/urls.py`:
```python
path('shared-with-me', TrackSharedWithMeView.as_view(), name='track-shared-with-me'),
```

Make sure this route is placed **before** the `/<track_id>` catch-all route.

---

### Phase 2: Frontend — Shared Tracks Response Type

**File**: `shared/schema.ts`

Add a new schema for the shared tracks response:

```typescript
export const sharedTrackSchema = trackSchema.extend({
  sharedByUsername: z.string(),
  sharedByDisplayName: z.string().optional(),
  sharedByAvatar: z.string().optional(),
  sharedAt: z.string(),
});

export type SharedTrack = z.infer<typeof sharedTrackSchema>;
```

---

### Phase 3: Frontend — API Endpoint & Client Function

**File**: `client/src/lib/apiConfig.ts`

Add the shared-with-me endpoint to the `tracks` section:

```typescript
tracks: {
  // ... existing entries ...
  sharedWithMe: '/api/tracks/shared-with-me',  // NEW
}
```

**File**: `client/src/lib/queryClient.ts`

Add a new API function:

```typescript
import type { SharedTrack } from "@shared/schema";

/** List all tracks shared with the authenticated user. */
export async function listSharedTracks(): Promise<SharedTrack[]> {
  return apiRequestJson<SharedTrack[]>("GET", API_ENDPOINTS.tracks.sharedWithMe);
}
```

---

### Phase 4: Frontend — Shared Tracks Context / Hook

Create a lightweight hook (no full context needed unless shared tracks are consumed across many pages):

**File**: `client/src/hooks/use-shared-tracks.ts` (NEW)

```typescript
import { useState, useCallback } from "react";
import type { SharedTrack } from "@shared/schema";
import { listSharedTracks } from "@/lib/queryClient";

export function useSharedTracks() {
  const [sharedTracks, setSharedTracks] = useState<SharedTrack[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSharedTracks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSharedTracks();
      setSharedTracks(data);
    } catch (err) {
      console.error("Failed to load shared tracks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sharedTracks, loading, fetchSharedTracks };
}
```

---

### Phase 5: Frontend — Shared Tracks Page / Tab

**Option A (recommended): Add a "Shared Tracks" tab to the existing playlists page**

**File**: `client/src/pages/playlists.tsx`

Add a third tab or add a shared tracks section alongside the existing "Shared with me" playlists tab. This keeps navigation simple.

Proposed layout:
```
┌─────────────────────────────────────┐
│  [My Playlists] [Shared w/ Me] [Shared Tracks]  │
├─────────────────────────────────────┤
│                                     │
│  ┌─ Track Card ────────────────┐   │
│  │ 🎵 Secret Demo               │   │
│  │ 👤 Shared by John Doe        │   │
│  │ 📅 May 20, 2026              │   │
│  └──────────────────────────────┘   │
│                                     │
│  Each card: clickable → plays       │
│  in the player, or navigates to     │
│  the track detail / artist page     │
└─────────────────────────────────────┘
```

Changes to `playlists.tsx`:
- Add a third tab `type Tab = "my" | "shared" | "tracks"`
- Import `useSharedTracks` hook
- Fetch shared tracks on mount alongside playlists
- Render a grid of tracks using `TrackCard` component when the "Shared Tracks" tab is active
- Show "shared by" info on each card (reuse the artist link pattern)

**Option B: Dedicated page at `/shared-tracks`** (Use if the page grows complex)

**File**: `client/src/pages/shared-tracks.tsx` (NEW)
**File**: `client/src/App.tsx` — add `<Route path="/shared-tracks" component={SharedTracks} />`

---

### Phase 6: Frontend — Navigation Entry

Add a link to the shared tracks view in the navigation so users can discover it.

**File**: `client/src/App.tsx` or sidebar component

Add a nav item (if there's a sidebar/mobile nav):
- Label: "Shared Tracks"
- Icon: `Users` or `Share2` from lucide-react
- Path: `/shared-tracks` or use tab on playlists page
- Show only for authenticated users

---

### Phase 7: UI Components & Polish

**TrackCard reuse**: The existing `TrackCard` can render shared tracks. It may need a new prop or slot for "shared by" attribution.

Alternatively, create a simple `SharedTrackRow` component or inline the rendering within the tab.

**Empty state**: Show when no tracks have been shared with the user:
```
No tracks shared with you yet
When someone shares a private track with you, it will appear here.
```

**Loading state**: Skeleton cards while fetching.

**Play behavior**: Clicking a shared track should:
1. Start playing it in the global player (same as any other track)
2. The stream endpoint `GET /api/tracks/<id>/stream/` should work because the user has a share grant

---

### Phase 8: Artist Page Integration

**File**: `client/src/pages/artist.tsx`

Add a "Shared with me" tracks section under the existing playlists shared section (lines ~1515-1549), similar to the playlist pattern but for tracks.

---

## File Change Summary

```
Phase 1 (Backend — Django):
  MOD  tracks/views.py              → Add TrackSharedWithMeView
  MOD  tracks/urls.py               → Add URL route

Phase 2 (Schema):
  MOD  shared/schema.ts              → Add SharedTrack type

Phase 3 (API Layer):
  MOD  client/src/lib/apiConfig.ts   → Add tracks.sharedWithMe endpoint
  MOD  client/src/lib/queryClient.ts → Add listSharedTracks()

Phase 4 (Hook):
  NEW  client/src/hooks/use-shared-tracks.ts

Phase 5 (UI):
  MOD  client/src/pages/playlists.tsx  → Add "Shared Tracks" tab
  -- OR --
  NEW  client/src/pages/shared-tracks.tsx
  MOD  client/src/App.tsx              → Add route

Phase 6 (Navigation):
  MOD  client/src/App.tsx / Nav component → Add nav entry

Phase 7 (Polish):
  MOD  TrackCard.tsx / inline rendering  → Shared-by attribution

Phase 8 (Artist page):
  MOD  client/src/pages/artist.tsx    → Add shared tracks section
```

---

## Dependencies & Risks

| Item | Risk | Mitigation |
|------|------|-----------|
| Backend endpoint doesn't exist yet | 🔴 Blocking | Backend work is straightforward — single view + URL |
| No backend access to deploy | 🟡 Slow | Can prototype UI with mock data; backend is a simple view |
| Track streaming for shared tracks | 🟡 Medium | API already returns 404 for unauthorized; shared users should pass the check |
| Private track audio URL expiry | 🟢 Low | Same as public tracks; no special handling needed |

---

## Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1: Backend | 1 view + URL | **Small** (~30 min) |
| Phase 2-3: Schema + API | 3 files | **Small** (~15 min) |
| Phase 4: Hook | 1 new file | **Small** (~10 min) |
| Phase 5: UI page/tab | 1-2 files | **Medium** (~30-45 min) |
| Phase 6-8: Nav + Polish | 2-3 files | **Small** (~20 min) |

**Total**: ~2 hours

---

## Acceptance Criteria

- [ ] Authenticated user sees all tracks shared with them
- [ ] Each shared track shows who shared it (username + avatar)
- [ ] Can play/stream shared tracks
- [ ] Clicking a shared track plays it in the global player
- [ ] Empty state when no tracks have been shared
- [ ] Loading skeleton while fetching
- [ ] Works alongside existing playlists shared-with-me feature
- [ ] Shared tracks respect API auth (401 if not logged in)
