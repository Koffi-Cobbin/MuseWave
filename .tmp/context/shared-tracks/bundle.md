# Shared Tracks Feature — Context Bundle

## Task Description
Add a "Shared With Me" view for tracks, mirroring the existing playlist shared-with-me pattern. Users can see all tracks shared with them, play them, and see who shared each track.

## Scope
Frontend only — the Django backend is deployed separately on pythonanywhere.com. The backend endpoint `GET /api/tracks/shared-with-me` needs to be implemented there but is out of scope for this repo.

## Files to Modify/Create

### Phase 2: Schema
- `shared/schema.ts` — Add `SharedTrack` type extending Track with shared_by fields

### Phase 3: API Layer
- `client/src/lib/apiConfig.ts` — Add `tracks.sharedWithMe` endpoint
- `client/src/lib/queryClient.ts` — Add `listSharedTracks()` function

### Phase 4: Hook
- `client/src/hooks/use-shared-tracks.ts` (NEW) — Hook for fetching shared tracks

### Phase 5: UI
- `client/src/pages/playlists.tsx` — Add "Shared Tracks" tab alongside "My Playlists" and "Shared w/ Me"

### Phase 6: Navigation
- Add nav entry to shared tracks (in App.tsx or sidebar/header component)

### Phase 8: Artist Page
- `client/src/pages/artist.tsx` — Add shared tracks section under existing shared playlists section

## Key Design Decisions

1. **SharedTrack type** extends Track with: `sharedByUsername`, `sharedByDisplayName?`, `sharedByAvatar?`, `sharedAt`
2. **Tab-based approach** — Add a third tab to the existing `/playlists` page rather than a separate route
3. **TrackCard reuse** — Use existing TrackCard component with a "shared by" attribution overlay
4. **Play behavior** — Clicking plays in global player normally (stream endpoint works due to share grant)

## Existing Pattern Reference
- Playlist shared-with-me: `GET /api/playlists/shared-with-me` → full playlist objects
- Track shared-with-me should follow: `GET /api/tracks/shared-with-me` → full track objects + share metadata

## Constraints
- All new components need `data-testid` attributes
- Loading skeleton for fetching state
- Empty state message when no shares
- Must match existing dark theme styling
- Follow camelCase convention (queryClient auto-converts snake_case from backend)
