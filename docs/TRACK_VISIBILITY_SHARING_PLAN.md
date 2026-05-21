# Track Share & Visibility Control — Implementation Plan

**Status**: Draft | **Target**: Artist-facing track management | **Updated**: 2026-05-21

---

## Current State Assessment

### ✅ Backend API (Deployed — per `BACKEND_API_DOCUMENTATION.md`)

| Feature | Endpoint / Model | Status |
|---------|-----------------|--------|
| Track `visibility` field (`public`/`private`) | Track model | ✅ |
| Upload with visibility | `POST /api/tracks/create` | ✅ |
| Update visibility | `PATCH /api/tracks/<id>` | ✅ |
| Auth'd listing (own private + all public) | `GET /api/tracks` | ✅ |
| Search excludes private | `GET /api/search` | ✅ |
| Detail returns 404 for unauthorized private | `GET /api/tracks/<id>` | ✅ |
| Stream returns 404 for unauthorized private | `GET /api/tracks/<id>/stream/` | ✅ |
| Share track with user (by username/email) | `POST /api/tracks/<id>/shares` | ✅ |
| List shares (owner only) | `GET /api/tracks/<id>/shares` | ✅ |
| Revoke share | `DELETE /api/tracks/<id>/shares/<share_id>` | ✅ |
| TrackShare model | `(track, shared_by, shared_with)` | ✅ |
| Playlist private track filtering | Respects track visibility + shares | ✅ |

### ✅ Frontend (Already Implemented)

| File | What It Does | Status |
|------|-------------|--------|
| `shared/schema.ts` | `Track.visibility` (`public`/`private`), `TrackShare` type | ✅ |
| `client/src/lib/apiConfig.ts` | All share endpoint URLs in `API_ENDPOINTS.tracks.shares()` | ✅ |
| `client/src/lib/queryClient.ts` | `listTrackShares`, `shareTrackWithUser`, `revokeTrackShare` | ✅ |
| `client/src/hooks/use-track-shares.ts` | `useTrackShares` hook (load, add, remove) | ✅ |
| `client/src/pages/upload.tsx` | Visibility toggle in Step 1 | ✅ |
| `client/src/components/TrackCard.tsx` | "Private" badge + Lock icon on private tracks | ✅ |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Edit dialog with visibility toggle; "Manage sharing" menu item | ✅ |
| `client/src/components/tracks/ShareTrackModal.tsx` | Full share UI: add by username/email, list shares, revoke | ✅ |

### ❌ Gaps (Needs Implementation)

| Gap | Impact | Priority |
|-----|--------|----------|
| **No Artist Dashboard** — no single-page view to manage all tracks, toggle visibility, see shares | Artists must drill into each track's actions menu (3+ clicks) | 🔴 High |
| **No "Shared With Me" track view** — tracks shared with a user have no dedicated list (playlists do) | Users can't easily discover tracks shared with them | 🟡 Medium |
| **Artist page doesn't differentiate own private tracks** — owner can't filter "All" vs "Public" vs "Private" | Visibility state only visible via small badge | 🟡 Medium |
| **No inline visibility toggle** — must open edit dialog to change | Friction for managing many tracks | 🟡 Medium |
| **No share count on track cards** — no preview of shares per private track | Missing context | 🟢 Low |
| **No dashboard route** | Can't navigate there | 🔴 High |

---

## Implementation — 4 Phases

### Phase 1: Artist Dashboard (`/dashboard`)

Create a dedicated track management hub for artists.

#### Files to Create / Modify

| File | Action |
|------|--------|
| `client/src/pages/dashboard.tsx` | **NEW** — Full-page track manager |
| `client/src/App.tsx` | Add `<Route path="/dashboard" component={Dashboard} />` |
| `client/src/components/SidebarNav.tsx` | Add "Dashboard" nav item (authenticated users only) |
| `client/src/components/tracks/VisibilityToggle.tsx` | **NEW** — Reusable public/private toggle |
| `client/src/components/tracks/ShareCountBadge.tsx` | **NEW** — Share count + opens ShareTrackModal |
| `client/src/components/tracks/VisibilityBadge.tsx` | **NEW** — Extract from TrackCard for reuse |

#### Dashboard Layout

```
┌──────────────────────────────────────────────┐
│  Dashboard                                    │
│  ┌──────────────────────────────────────────┐ │
│  │  Stats: 12 tracks · 8 public · 4 private │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ┌─────┬────────┬───────┬────────┬──────────┐ │
│  │     │ Title  │ Genre │ Vis.   │ Shares   │ │
│  ├─────┼────────┼───────┼────────┼──────────┤ │
│  │ 🎵 │ Summer │ Pop   │ 🔓 Pub │ —        │ │
│  │ 🎵 │ Demo   │ Rock  │ 🔒 Priv│ 👥 3     │ │
│  └─────┴────────┴───────┴────────┴──────────┘ │
└──────────────────────────────────────────────┘
```

#### Key Behavior

- Fetch all tracks via `GET /api/tracks?userId=<id>` (no `published` filter — owner sees all)
- Inline visibility toggle calls `PATCH /api/tracks/<id>` with optimistic update
- Share count badge shows count from `GET /api/tracks/<id>/shares`
- Clicking share badge opens `ShareTrackModal`
- Skeleton loaders during fetch, empty state when no tracks

#### Visibility Toggle Pattern (Optimistic)

```typescript
async function handleToggle(trackId: string, newVisibility: "public" | "private") {
  // 1. Optimistic update
  setTracks((prev) =>
    prev.map((t) => (t.id === trackId ? { ...t, visibility: newVisibility } : t))
  );

  // 2. API call
  const updated = await apiRequestJson<Track>("PATCH",
    API_ENDPOINTS.tracks.update(trackId),
    { visibility: newVisibility }
  );

  // 3. Sync with server
  setTracks((prev) =>
    prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
  );
}
```

#### Acceptance Criteria

- [ ] Logged-in artist sees all their tracks at `/dashboard`
- [ ] Stats summary: total, public, private counts
- [ ] Visibility toggle instantly updates track state
- [ ] Share count visible for each private track
- [ ] Share count click opens `ShareTrackModal`
- [ ] Loading skeleton, empty state, error handling
- [ ] Responsive: card grid on mobile, table on desktop

---

### Phase 2: Enhanced Artist Page Visibility

Improve visibility context when viewing own profile.

#### Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/artist.tsx` | Visibility-aware track listing for owner |

#### Changes

1. **Track fetching** — when `isOwner`, fetch all tracks (not just `published: true`)
2. **Tab toggle** — add "All" / "Public" / "Private" filter tabs for track listing (owner only)
3. **Visibility toggle** — integrate `VisibilityToggle` into track rows (owner only)
4. **Share management** — add share count + quick "Manage sharing" button per track (owner only)

#### Acceptance Criteria

- [ ] Artist sees private tracks on their own page with clear badges
- [ ] Can filter own tracks by visibility
- [ ] Inline visibility toggle works on artist page
- [ ] Share modal accessible from track listing
- [ ] Non-owner visitors never see private tracks (handled by API)

---

### Phase 3: "Shared With Me" Track View

Let users see all tracks that have been shared with them.

#### Issue

The backend has no `/api/tracks/shared-with-me` endpoint (playlists have this, tracks don't).

#### Options

| Option | Effort | Pros | Cons |
|--------|--------|------|------|
| **A** New backend endpoint | Medium | Clean, single API call | Requires Django work |
| **B** Client-side aggregation | Medium | No backend changes | Slow, complex for many shares |
| **C** Extend `GET /api/tracks` with a filter param | Small | Simple | Requires backend change |

**Recommended:** Option A — add `GET /api/tracks/shared-with-me` to the Django backend, following the playlist pattern.

#### Files

| File | Action |
|------|--------|
| (Django) New view | **NEW** — `TrackSharedWithMeView` |
| `client/src/lib/apiConfig.ts` | Add `sharedWithMe` endpoint |
| `client/src/lib/queryClient.ts` | Add `listSharedTracks` function |
| `client/src/pages/shared-tracks.tsx` or tabs in `playlists.tsx` | **NEW** — Shared tracks display |

#### Acceptance Criteria

- [ ] User sees all tracks shared with them
- [ ] Can play/stream shared tracks
- [ ] Can see who shared each track
- [ ] Empty state when no shares

---

### Phase 4: Polish & Edge Cases

| Task | Files | Details |
|------|-------|---------|
| Consistent Private badge | `TrackCard.tsx` + any list views | Unify badge style using extracted `VisibilityBadge` |
| Playlist private track handling | Playlist detail pages | Verify hidden from unauthorized users per API spec |
| Loading/error/empty states | All new components | Skeletons, toasts, empty illustrations |
| Test attributes | All new components | `data-testid` on interactive elements |

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Phase 3 blocked by backend endpoint | Can prototype UI with mock data; backend work is straightforward |
| Visibility toggle conflicts with other editors | Backend should handle ownership checks (already does) |
| API rate limiting on share list calls | Cache share counts; batch requests |

---

## File Change Summary

```
NEW  client/src/pages/dashboard.tsx
NEW  client/src/components/tracks/VisibilityToggle.tsx
NEW  client/src/components/tracks/ShareCountBadge.tsx
NEW  client/src/components/tracks/VisibilityBadge.tsx
MOD  client/src/App.tsx
MOD  client/src/components/SidebarNav.tsx
MOD  client/src/pages/artist.tsx
NEW  client/src/pages/shared-tracks.tsx     (Phase 3)
MOD  client/src/lib/apiConfig.ts            (Phase 3)
MOD  client/src/lib/queryClient.ts           (Phase 3)
NEW  (Django) tracks/views.py view           (Phase 3)
```

---

## Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1: Artist Dashboard | ~5 files, new page + reusable components | **Large** (3–5 hrs) |
| Phase 2: Artist Page Enhancements | ~1 file modified | **Medium** (1–2 hrs) |
| Phase 3: Shared With Me | 2–3 frontend + 1 backend file | **Medium** (2–3 hrs) |
| Phase 4: Polish | 2–3 files modified | **Small** (30 min–1 hr) |

**Total estimated effort:** ~7–11 hours

---

## Recommended Starting Point

**Phase 1 (Artist Dashboard)** provides the most immediate value — a dedicated hub for artists to manage track visibility and sharing at a glance. It unlocks the core workflow that artists need today.
