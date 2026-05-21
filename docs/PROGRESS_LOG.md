# MuseWave — Development Progress Log

**Project:** MuseWave (indie music streaming/sharing platform)  
**Stack:** React 19 + TypeScript (Vite), Express server, Django REST API (`https://kofficobbin.pythonanywhere.com`), JWT auth in localStorage  
**Last updated:** 2026-05-21 (Session 4)

---

## Session 4 — Artist Page: Search, Sort, Pagination + About Tab Overhaul

**File:** `client/src/pages/artist.tsx`

### Tracks Tab — Replaced owner-only visibility filter tabs with Search + Sort + Pagination

**Removed:**
- `trackVisFilter` state (`"all" | "public" | "private"`)
- `visFilteredTracks` useMemo
- The three-button owner-only filter bar UI (All / Public / Private sub-tabs under Tracks)

**Added state:**
- `trackSearch: string` — real-time search query
- `trackSort: "latest" | "oldest" | "az" | "za" | "plays" | "likes"` — active sort key, defaults to `"latest"`
- `trackPage: number` — current page, defaults to 1
- `TRACKS_PER_PAGE = 10` — constant

**Added logic (`processedTracks` useMemo, before early returns):**
- Filters `tracks` by `trackSearch` against `title`, `genre`, and `artist` fields (case-insensitive)
- Sorts by: newest `createdAt` (latest), oldest `createdAt`, most `plays`, most `likes`, A→Z title, Z→A title
- `totalPages` and `pagedTracks` derived from `processedTracks` after memoization

**New UI (toolbar above track list):**
- Full-width search input with `Search` icon prefix; clears page to 1 on change
- `SlidersHorizontal` icon + `<select>` dropdown for sort; resets page to 1 on change
- Live result count: `"11 tracks"` or `"3 results for "amapiano" · page 1 of 2"`
- Empty-search state with a "Clear search" link

**New pagination controls (below track list, only when `totalPages > 1`):**
- ← Prev / Next → buttons with disabled state at edges
- Page number pills highlighting the active page
- Index passed to `TrackCard` accounts for page offset: `(trackPage - 1) * TRACKS_PER_PAGE + idx`

**Imports added:** `Search`, `ChevronLeft`, `SlidersHorizontal` from `lucide-react`

---

### About Tab — Visitor-focused redesign

**Removed:**
- "Growth snapshot" section — the data (Saves, Shares, Monthly Growth) was entirely derived from unrelated fields and misleading to visitors

**Added — Latest Release card (top of About tab):**
- Picks the track with the most recent `createdAt` date
- Shows blurred cover as backdrop + gradient overlay
- Displays: track cover thumbnail, "Latest Release" label, title, genre, year, duration
- Clicking the card plays the track and switches to the Tracks tab
- Falls back to a gradient placeholder when no cover image is present

**Added — Stats at a glance grid (2×2 on mobile, 4-up on desktop):**
- Monthly listeners, Followers, Track count, Total plays (summed from all loaded tracks)
- Uses real data from existing `artist.*` and `tracks` state — no fake derivations

**Improved — Bio card:**
- Title now reads "About {displayName}" for a more personal feel
- Bio text supports `whitespace-pre-line` for multi-paragraph bios
- Empty-state placeholder shown to visitors when no bio is set ("hasn't added a bio yet")

**Improved — Social links:**
- Section title now reads "Find {displayName} online" for a visitor-centric framing

---

## Session 1 — Bug Fixes & UI Improvements

### 1. Fixed `isOnline is not defined` crash in PlayerBar

**File:** `client/src/components/PlayerBar.tsx`

The `OverflowMenu` component used `isOnline` from the `useOffline()` hook but the variable was missing from its destructuring. This caused an immediate runtime crash on any page with a playing track.

**Fix:** Added `isOnline` to the `useOffline()` destructure inside `OverflowMenu`.

---

### 2. Installed missing `idb` package

The offline/IndexedDB context (`client/src/contexts/offline-context.tsx`) imported from the `idb` npm package, which was not listed in `package.json` or installed. This caused module-not-found errors during build.

**Fix:** Installed `idb` via the project package manager.

---

### 3. Moved Downloads from BottomNav to AccountSheet (mobile)

**Files:** `client/src/components/BottomNav.tsx`

The Downloads link occupied a slot in the mobile bottom navigation bar, crowding the primary navigation items. It was moved into the AccountSheet slide-up modal — accessible to both authenticated and unauthenticated users. The Downloads link remains in the desktop `SidebarNav` unchanged.

**Result:** Bottom nav is less cluttered on mobile; Downloads is still easy to reach via the Account button.

---

### 4. Increased Discover page bottom padding

**File:** `client/src/pages/discover.tsx`

Pagination controls and the last track cards were obscured by the floating PlayerBar + BottomNav stack on mobile. Padding was increased to `pb-44` on mobile and `pb-36` on small screens (`lg:pb-8` on desktop).

---

### 5. Restyled Downloads page

**File:** `client/src/pages/downloads.tsx`

The Downloads page had a plain/unstyled appearance inconsistent with the rest of the app. It was restyled to match the glass/gradient aesthetic used across the app (radial gradient background, glass cards, consistent spacing and typography).

---

## Session 2 — Track Visibility & Sharing (10-Step Plan)

**Reference:** `docs/TRACK_VISIBILITY_IMPLEMENTATION_PLAN.md`  
**Changelog:** `docs/TRACK_VISIBILITY_CHANGELOG.md`

All 10 steps of the original implementation plan were completed in a single session. Full detail is in the changelog above; summary below.

### Phase 1 — Foundation

| File | Change |
|------|--------|
| `shared/schema.ts` | Added `visibility: z.enum(["public","private"])` to `trackSchema`; added `trackShareSchema` + `TrackShare` type |
| `client/src/lib/apiConfig.ts` | Added `tracks.shares(id)` and `tracks.shareById(id, shareId)` endpoint builders |
| `client/src/lib/queryClient.ts` | Added `listTrackShares`, `shareTrackWithUser`, `revokeTrackShare` helper functions |

### Phase 2 — Upload & Edit

| File | Change |
|------|--------|
| `client/src/pages/upload.tsx` | Added Public/Private toggle (Globe/Lock icons) to Step 1; appends `visibility` to upload FormData |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Added visibility toggle in Edit dialog; includes `visibility` in PATCH body on save |

### Phase 3 — Track Sharing

| File | Change |
|------|--------|
| `client/src/hooks/use-track-shares.ts` *(new)* | Custom hook: `shares`, `loading`, `loadShares`, `addShare`, `removeShare` |
| `client/src/components/tracks/ShareTrackModal.tsx` *(new)* | Full share management modal: add by username/email, list shares, revoke per share |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Added "Manage sharing" owner menu item that opens `ShareTrackModal` |

### Phase 4 — Display

| File | Change |
|------|--------|
| `client/src/components/TrackCard.tsx` | Added "Private" lock badge on both desktop (metadata row) and mobile (below artist name) |
| `client/src/components/PlayerBar.tsx` | Improved download error toast copy: "It may be private." |

**Backend dependency:** All backend endpoints were already deployed. No Django changes needed.

---

## Session 3 — Phase 1 & 2 of TRACK_VISIBILITY_SHARING_PLAN.md

**Reference:** `docs/TRACK_VISIBILITY_SHARING_PLAN.md`

The second sharing plan identified four remaining gaps after the 10-step plan. Phases 1 and 2 were implemented; Phase 3 remains blocked pending a new Django endpoint; Phase 4 (polish) follows naturally.

---

### Phase 1 — Artist Dashboard (`/dashboard`) ✅

A new dedicated track management page for artists.

#### New file: `client/src/pages/dashboard.tsx`

**Features:**
- **Auth gate** — unauthenticated visitors see a lock icon + "Sign in" message; no redirect needed
- **Stats row** — four cards: Total tracks, Public count, Private count, Visibility rate (%)
- **Filter tabs** — All / Public / Private with live counts; client-side filtering of the fetched track list
- **Track list** — reuses `TrackCard` with `isOwner` prop for existing Edit/Delete actions
- **Inline visibility toggle** — hover (desktop) or always-visible (mobile) pill button per track row calls `PATCH /api/tracks/:id`; optimistic update on success
- **Share button** — appears on private tracks only; opens `ShareTrackModal` for that track
- **Refresh button** — re-fetches tracks silently without full page reload; spinner while loading
- **Loading state** — four skeleton rows while fetching
- **Empty states** — "No tracks yet" with Upload CTA when the list is empty; "No public/private tracks" with a reset link when the filter is empty
- **Background/spacing** — matches app radial gradient pattern; `pb-44 sm:pb-36 lg:pb-8` mobile clearance for PlayerBar + BottomNav

**API calls:**
- `GET /api/tracks?userId=<id>` — no `published` filter, so owner sees all their tracks including private
- `PATCH /api/tracks/:id` — updates `visibility` field inline

#### Navigation additions

| Location | Change |
|----------|--------|
| `client/src/components/SidebarNav.tsx` | Added "Dashboard" (`LayoutDashboard` icon) to `authenticatedItems` — only shown when logged in |
| `client/src/components/BottomNav.tsx` | Added "Dashboard" link in the AccountSheet modal (authenticated section), above Downloads |
| `client/src/App.tsx` | Added `import Dashboard` and `<Route path="/dashboard" component={Dashboard} />` |

---

### Phase 2 — Enhanced Artist Page Visibility ✅

**File:** `client/src/pages/artist.tsx`

#### Change 1 — Owner fetches all tracks (including private)

The `fetchData` effect previously always passed `published: true` to the tracks API, hiding private tracks even from the owner. Now it checks `authUser?.id === userData.id` and omits the `published` filter for owner requests.

```ts
// Before
{ userId: userData.id, published: true }

// After (owner sees all; everyone else still sees public only)
{ userId: userData.id, ...(isViewerOwner ? {} : { published: true }) }
```

#### Change 2 — Visibility sub-filter tabs (owner only)

Added `trackVisFilter` state (`"all" | "public" | "private"`) and a `useMemo`-derived `visFilteredTracks` array. When the viewer is the owner and has tracks, a compact three-button filter bar appears above the track list:

- **All** — shows every track (default)
- **Public** — shows only tracks with `visibility !== "private"`
- **Private** — shows only tracks with `visibility === "private"`

Each button shows a live count badge. The filter resets gracefully with a "View all tracks" link if the filtered result is empty.

Non-owner visitors see no filter bar and never receive private tracks (API enforces this server-side).

---

### Phase 3 — "Shared With Me" Tracks ⛔ Blocked

No `GET /api/tracks/shared-with-me` endpoint exists on the Django backend (playlists have one, tracks don't). This phase cannot ship without a new backend view.

**Recommended approach:** Add a `TrackSharedWithMeView` in Django following the playlist pattern, then add `sharedWithMe` to `apiConfig.ts` and `listSharedTracks` to `queryClient.ts`.

---

### Phase 4 — Polish 🔜 Pending

Deferred until after Phase 3. Planned work: unified `VisibilityBadge` component extracted from `TrackCard`, consistent badge styling across all list views, and test attribute coverage on new components.

---

## Session 3 — Bug Fixes (same session)

### Fix 1 — `useMemo` violated React Rules of Hooks

**File:** `client/src/pages/artist.tsx`

The `visFilteredTracks` useMemo was initially placed after the `if (loading)` and `if (!artist)` early returns. React requires all hooks to be called unconditionally before any return statement. This caused the entire artist page component to crash for every visitor.

**Fix:** Moved the `useMemo` call above both early returns, just after `const displayName = ...`.

**Symptom:** Artist page completely blank / not displaying.

---

### Fix 2 — Missing `Lock` import in artist.tsx

**File:** `client/src/pages/artist.tsx`

The new visibility filter tabs rendered `<Lock className="..." />` but `Lock` was not in the lucide-react import block. React received `undefined` as the component type and threw `Uncaught TypeError: Illegal constructor`, crashing the artist page again.

**Fix:** Added `Lock` to the lucide-react named imports.

**Symptom:** `Uncaught TypeError: Illegal constructor` in browser console; artist page not displaying.

---

## Current State Summary

| Area | Status |
|------|--------|
| Offline/download infrastructure | ✅ Fixed (`idb` installed, `isOnline` crash resolved) |
| Mobile nav UX | ✅ Downloads in AccountSheet, Discover padding fixed |
| Track visibility field (schema + upload + edit) | ✅ Complete |
| Track sharing (modal + hook + menu) | ✅ Complete |
| Private track badge on TrackCard | ✅ Complete |
| Artist Dashboard (`/dashboard`) | ✅ Complete |
| Artist page owner visibility filtering | ✅ Complete |
| "Shared With Me" tracks view | ⛔ Blocked — needs Django endpoint |
| Polish / unified VisibilityBadge component | 🔜 Pending |

---

## Known Pending Backend Work

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/tracks/shared-with-me` | List all tracks shared with the authenticated user | Medium |

Without this endpoint, users have no dedicated way to browse tracks that others have shared with them, even though the share records exist in the backend.

---

## File Index (All Changed/Created Files)

```
NEW  client/src/pages/dashboard.tsx
NEW  client/src/hooks/use-track-shares.ts
NEW  client/src/components/tracks/ShareTrackModal.tsx

MOD  client/src/App.tsx                               (dashboard route + import)
MOD  client/src/components/SidebarNav.tsx             (Dashboard nav item)
MOD  client/src/components/BottomNav.tsx              (Dashboard in AccountSheet)
MOD  client/src/pages/artist.tsx                      (owner track fetch + filter tabs + Lock import)
MOD  client/src/pages/upload.tsx                      (visibility toggle on upload)
MOD  client/src/pages/discover.tsx                    (bottom padding)
MOD  client/src/pages/downloads.tsx                   (restyled)
MOD  client/src/components/PlayerBar.tsx              (isOnline fix + toast copy)
MOD  client/src/components/TrackCard.tsx              (Private badge)
MOD  client/src/components/playlists/TrackActionsMenu.tsx  (visibility edit + Manage sharing)
MOD  shared/schema.ts                                 (Track.visibility, TrackShare type)
MOD  client/src/lib/apiConfig.ts                      (share endpoints)
MOD  client/src/lib/queryClient.ts                    (share helper functions)
```
