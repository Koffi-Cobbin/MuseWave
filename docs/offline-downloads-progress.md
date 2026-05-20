# Offline Downloads — Implementation Progress

**Updated**: 2026-05-20  
**Plan**: See [`docs/offline-downloads-plan.md`](./offline-downloads-plan.md)  
**Status**: Phase 5 complete — offline indicators, button disable logic, and queue skip behavior all wired in

---

## Phase 1 — Storage Layer ✅

**Goal**: IndexedDB CRUD layer for downloaded tracks using the `idb` promise wrapper.

### Deliverables

| File | Action |
|------|--------|
| `package.json` (root) | Added `idb@^8.0.3` |
| `client/src/lib/offlineStorage.ts` | **Created** (260 lines) |

### Database Schema (`museWaveOffline`, v1)

| Object Store | Key Path | Value Contents |
|---|---|---|
| `tracks` | `id` | `{ id, track (full Track object), blob (audio), coverBlob, savedAt, audioUrl }` |
| `downloads_meta` | `trackId` | `{ trackId, status, progress, startedAt, fileSize }` |

### Exported Functions (11)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `saveTrack` | `(track, blob, coverBlob?) => Promise<void>` | Persist downloaded audio + metadata |
| `getTrackBlob` | `(trackId) => Promise<Blob \| undefined>` | Retrieve audio blob for playback |
| `getTrackMeta` | `(trackId) => Promise<TrackMeta \| undefined>` | Metadata without blob (list views) |
| `getAllDownloadedTracks` | `() => Promise<TrackMeta[]>` | All offline tracks (blobs excluded) |
| `isTrackDownloaded` | `(trackId) => Promise<boolean>` | Quick existence check |
| `removeTrack` | `(trackId) => Promise<void>` | Delete from both stores |
| `updateDownloadMeta` | `(trackId, meta) => Promise<void>` | Track download progress / status |
| `getDownloadMeta` | `(trackId) => Promise<DownloadMeta \| undefined>` | Get current download state |
| `getStorageInfo` | `() => Promise<{ used, quota }>` | Storage Manager API query |
| `requestPersistentStorage` | `() => Promise<boolean>` | Best-effort persistence request |
| `clearAll` | `() => Promise<void>` | Wipe all offline data |

### Key Design Decisions

- **Lazy DB singleton** — `getDb()` is module-private; first call opens/creates the database, subsequent calls reuse the connection
- **Blob safety** — `getAllDownloadedTracks()` strips audio blobs from results to keep list-view memory usage predictable
- **Blob URL lifecycle** — `removeTrack()` does NOT revoke blob URLs; the consumer (`useOfflineAudio` hook / components) owns those references
- **Error-safe** — read functions return `undefined` / `[]` on error instead of throwing, matching the graceful-degradation pattern in `code-quality.md`
- **Path alias** — uses `@shared/schema` for `Track` type import (matched to existing `tsconfig.json` paths)

---

## Phase 2 — Offline Context ✅

**Goal**: React context wrapping the app that provides download state, progress tracking, and actions.

### Deliverables

| File | Action |
|------|--------|
| `client/src/contexts/offline-context.tsx` | **Created** (260 lines) |
| `client/src/App.tsx` | **Edited** — added `OfflineProvider` + `/downloads` route |
| `client/src/pages/downloads.tsx` | **Created** (placeholder — replaced in Phase 4) |

### Context Interface

```typescript
interface OfflineContextType {
  downloads: Track[];                           // all saved offline tracks
  isTrackDownloaded: (id: string) => boolean;   // synchronous (local Set)
  downloadProgress: Record<string, number>;     // trackId → 0–100
  isOnline: boolean;                            // navigator.onLine + events
  storageUsed: number;                          // bytes
  storageQuota: number | null;                  // bytes or null
  downloadForOffline: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
}
```

### `downloadForOffline()` Flow

```
1. Skip if track is already downloaded or currently being downloaded
2. Set downloads_meta status = "downloading", progress = 0
3. Fetch audio from track.audioUrl (stream URL, NOT download endpoint)
4. Track progress via Response.body.getReader() + Content-Length header
   └─ Falls back to single blob fetch if ReadableStream unavailable
5. Optionally fetch track.coverUrl as blob (failures silently ignored)
6. saveTrack() to IndexedDB
7. Set downloads_meta status = "complete"
8. Refresh local downloads list + downloadedIds Set
9. Re-throw on failure so callers can show toasts
```

### Provider Hierarchy

```
QueryClientProvider
  └─ AuthProvider
      └─ PlayerProvider
          └─ PlaylistProvider
              └─ OfflineProvider          ← NEW
                  └─ TooltipProvider
                      ├─ SidebarNav
                      ├─ Router
                      │  └─ /downloads    ← NEW (placeholder)
                      ├─ BottomNav
                      └─ PlayerBar
```

### Key Design Decisions

- **Synchronous `isTrackDownloaded`** — uses a local `Set<string>` updated on mount and after every add/remove, avoiding async IndexedDB queries in hot paths (UI badges, button visibility)
- **Concurrent-download guard** — `activeDownloads` ref prevents starting the same track twice
- **Storage info refresh** — `storageUsed` updated after every download/removal via `navigator.storage.estimate()`
- **Persistent storage** — `requestPersistentStorage()` called on mount (best-effort, browser may deny)

---

## Phase 3 — Offline Audio Hook ✅

**Goal**: Resolve `<audio>` source to blob URL when track is stored offline, falling back to network URL.

### Deliverables

| File | Action |
|------|--------|
| `client/src/hooks/useOfflineAudio.ts` | **Created** (65 lines) |
| `client/src/components/PlayerBar.tsx` | **Edited** — import hook + use it for `<audio src>` |

### How It Works

```tsx
// PlayerBar.tsx — single line change:
const audioSrc = useOfflineAudio(active);
<audio ref={audioRef} src={audioSrc} preload="metadata" />
```

The hook queries IndexedDB for the track's blob. If found, it creates a `URL.createObjectURL(blob)` and returns the blob URL. Otherwise it falls back to `track.audioUrl` (network URL).

### Key Design Decisions

- **Race-safe** — uses a `cancelled` flag so a slow IndexedDB read for track A doesn't overwrite the state for track B when the user skips quickly
- **No memory leaks** — tracks the active blob URL in a `useRef` and revokes it in the effect cleanup (both on unmount and before establishing a new URL)
- **Network fallback** — `return blobUrl ?? track?.audioUrl` means if no blob is stored, playback works exactly as before

---

## Phase 4 — Downloads UI ✅

**Goal**: Full downloads management page + "Save Offline" / "Download File" buttons in all relevant locations + nav items.

### Deliverables

| File | Action |
|------|--------|
| `client/src/pages/downloads.tsx` | **Replaced** placeholder with full page (~250 lines) |
| `client/src/components/playlists/TrackActionsMenu.tsx` | **Edited** — added "Save Offline" + "Download File" dropdown items |
| `client/src/components/PlayScreen.tsx` | **Edited** — added "Save Offline" button (mobile + desktop layouts) |
| `client/src/components/PlayerBar.tsx` | **Edited** — added "Save Offline" entry + badge in overflow menu |
| `client/src/components/BottomNav.tsx` | **Edited** — added Downloads nav item with count badge |
| `client/src/components/SidebarNav.tsx` | **Edited** — added Downloads nav item with count badge |

### Downloads Page Features

| Feature | Detail |
|---------|--------|
| **Track cards** | Grid layout (responsive: 1-4 columns), cover art from `coverBlob` (IndexedDB), title, artist, duration |
| **Storage bar** | Visual bar showing `used / quota` with percentage, colored gradient |
| **Play button** | Sets track as active in queue immediately |
| **Play Next button** | Inserts track as next in queue |
| **Remove button** | Deletes from IndexedDB, revokes cover blob URL, shows toast |
| **Download progress** | SVG circular progress overlay on the card while downloading |
| **Empty state** | Icon + message directing users to "Save Offline" option on track menus |
| **Cover blob URLs** | Loaded from IndexedDB on mount, cleaned up on unmount |

### Button Placement in UI

| Location | Save Offline | Download File |
|----------|-------------|---------------|
| `TrackActionsMenu.tsx` | ✅ Dropdown item (disabled "Saved Offline" if already stored) | ✅ Dropdown item |
| `PlayScreen.tsx` mobile | ✅ Button in action row (shows "Saved Offline" if already stored) | ✅ Existing button (unchanged) |
| `PlayScreen.tsx` desktop | ✅ Button in action row (shows "Saved Offline" if already stored) | ✅ Existing button (unchanged) |
| `PlayerBar.tsx` overflow | ✅ Menu entry (disabled "Saved Offline" if already stored) | ✅ Existing button (unchanged) |

### Nav Items

| Location | Item | Badge |
|----------|------|-------|
| `BottomNav.tsx` | "Downloads" with `Download` icon | Count badge (9+ cap) |
| `SidebarNav.tsx` | "Downloads" with `Download` icon | Count badge (9+ cap) |

### Key Design Decisions

- **Cover from IndexedDB** — page loads `coverBlob` from `offlineStorage.getTrackMeta()` and creates blob URLs for offline cover display
- **Progress indicator** — SVG circular progress overlay on the track card, shown while `downloadProgress[track.id]` exists
- **Cover blob cleanup** — blob URLs tracked in component state, revoked on track removal and component unmount
- **"Saved Offline" vs "Save Offline"** — toggle disabled/active based on `isTrackDownloaded()` (context's synchronous check) followed by `downloadForOffline()`

---

## Phase 5 — Connectivity & Storage ✅

**Status**: Complete  
**Files**: `BottomNav.tsx`, `SidebarNav.tsx`, `TrackActionsMenu.tsx`, `PlayScreen.tsx`, `PlayerBar.tsx` (all edited)  
**Goal**: Offline badge, queue behavior when offline, disable streaming-only features.

### Deliverables

| File | Change |
|------|--------|
| `client/src/components/BottomNav.tsx` | Added amber "Offline" banner row with `WifiOff` icon below the blur backdrop, above nav items |
| `client/src/components/SidebarNav.tsx` | Added amber "Offline" chip with `WifiOff` icon below the separator, above nav links |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Save Offline item is now disabled + shows "Offline — connect to save" with `WifiOff` icon when `!isOnline` |
| `client/src/components/PlayScreen.tsx` | Both mobile + desktop Save Offline buttons disabled when offline; label switches to "Offline" |
| `client/src/components/PlayerBar.tsx` | Overflow menu Save Offline entry disabled when offline; shows `WifiOff` icon + "Offline" label. Added offline queue-skip effect: when offline, undownloaded tracks are automatically skipped with a 10-skip safety valve. |

### Details

- **Offline indicator (BottomNav)**: Amber banner between backdrop blur and nav items — "Offline — only saved tracks are available" with `WifiOff` icon.
- **Offline indicator (SidebarNav)**: Amber chip below separator — "Offline" with `WifiOff` icon.
- **Save Offline disabled**: All instances (TrackActionsMenu, PlayScreen mobile/desktop, PlayerBar overflow) show a disabled "Offline" state when `!isOnline`, using `WifiOff` icon and contextual text.
- **Queue skip**: When offline, a `useEffect` watches `active` and skips undownloaded tracks automatically. A `offlineSkipCountRef` limits to 10 consecutive skips to prevent infinite loops if the queue is completely unavailable offline.

---

## Phase 6 — Storage Management 🔜

**Status**: Not started  
**Files**: Same as Phase 5 (bundled)  
**Goal**: Quota check before download, track removal, clear-all.

---

## File Manifest Summary

| File | Phase | Status |
|------|-------|--------|
| `package.json` | 1 | ✅ `idb` added |
| `client/src/lib/offlineStorage.ts` | 1 | ✅ Created |
| `client/src/contexts/offline-context.tsx` | 2 | ✅ Created |
| `client/src/App.tsx` | 2 | ✅ Edited (provider + route) |
| `client/src/pages/downloads.tsx` | 4 | ✅ Replaced with full page |
| `client/src/hooks/useOfflineAudio.ts` | 3 | ✅ Created |
| `client/src/components/PlayerBar.tsx` | 3/4/5 | ✅ Edited (audioSrc + Save Offline menu; offline disable + queue skip) |
| `client/src/components/PlayScreen.tsx` | 4/5 | ✅ Edited (Save Offline buttons; offline disable) |
| `client/src/components/playlists/TrackActionsMenu.tsx` | 4/5 | ✅ Edited (Save Offline + Download File; offline disable) |
| `client/src/components/BottomNav.tsx` | 4/5 | ✅ Edited (Downloads nav item + badge; offline banner) |
| `client/src/components/SidebarNav.tsx` | 4/5 | ✅ Edited (Downloads nav item + badge; offline chip) |
