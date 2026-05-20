# Offline Downloads — Implementation Plan

**Status**: Draft  
**Target**: Enable users to download tracks for offline playback via IndexedDB + blob URLs

## Two Download Modes

This plan covers **two distinct download actions**, both of which are exposed in the UI side by side:

| Mode | Mechanism | User Goal |
|------|-----------|-----------|
| **Save Offline** | Fetch audio stream → store as `Blob` in IndexedDB → serve via `URL.createObjectURL()` later | Listen inside the app without internet |
| **Download to Device** | Fetch from `/api/tracks/:id/download/` (existing `downloadTrack()` in `apiConfig.ts`) → trigger browser file save | Own the audio file on their device |

- The **existing** `downloadTrack()` function in `apiConfig.ts` is **preserved as-is** — it handles the "Download to Device" path.
- The **new** code (Phases 1–3) implements the "Save Offline" path.
- Both modes appear as separate UI actions, differentiated by icon and label.

---

## Architecture Overview

```
                    ┌──────────────────────────────────┐
                    │        IndexedDB (app)            │
                    │  ┌──────────┐  ┌──────────────┐   │
                    │  │ tracks   │  │ downloads_meta│   │
                    │  │ object   │  │ object store  │   │
                    │  │ store    │  │ (progress,    │   │
                    │  │          │  │  status, etc) │   │
                    │  │ key: id  │  │ key: trackId  │   │
                    │  │ val: {   │  └──────────────┘   │
                    │  │   track,  │                     │
                    │  │   blob,   │                     │
                    │  │   savedAt │                     │
                    │  │ }        │                     │
                    │  └──────────┘                     │
                    └──────────────────────────────────┘
                              ▲
                              │ write / read
                              │
┌──────────────────┐ ┌──────────────────┐     ┌────────────────┐
│ downloadTrack()   │ │ offlineStorage.ts│──▶│  PlayerBar.tsx  │
│ (apiConfig.ts)    │ │                  │    │  <audio> src   │
│                   │ │ saveTrack()      │    │  resolved to   │
│ DOWNLOAD TO DEVICE│ │ getTrackBlob()   │    │  blob: URL if  │
│ Uses download     │ │ getAllTracks()   │    │  stored offline│
│ endpoint, browser │ │ removeTrack()    │    │  else network  │
│ native file save  │ │ getStorageInfo() │    │  URL as today  │
└──────────────────┘ │ isTrackDownloaded│    └────────────────┘
                     └──────────────────┘
                              │
                    ┌────────▼────────┐
                    │  useOffline()   │
                    │  hook           │
                    │  (context)      │
                    │                 │
                    │  - downloads[]  │
                    │  - isOnline     │
                    │  - download()   │
                    │  - remove()     │
                    │  - progress%    │
                    └─────────────────┘
```

> **Two download paths**: `downloadTrack()` in `apiConfig.ts` (existing, unchanged) handles **Download to Device** via the `/api/tracks/:id/download/` endpoint. The new `offlineStorage.ts` + context layer handles **Save Offline** by fetching from the stream URL and storing in IndexedDB. Both paths coexist, each with its own UI entry point.

---

## Phase 1 — Storage Layer (`client/src/lib/offlineStorage.ts`)

**Dependency**: Add `idb` package — a 1 kB IndexedDB promise wrapper.
```
npm install idb
```
> **Note**: The project uses a single root `package.json` — there is no `client/package.json`. Run `npm install` from the project root.

**Database schema**:

| Field | Type | Store | Description |
|-------|------|-------|-------------|
| `id` | `string` | `tracks` (keyPath) | Track ID |
| `track` | `Track` | `tracks` | Full track metadata |
| `blob` | `Blob` | `tracks` | Audio binary data |
| `coverBlob` | `Blob \| null` | `tracks` | Cached cover art |
| `savedAt` | `string` | `tracks` | ISO timestamp |
| `audioUrl` | `string` | `tracks` | Original source URL |
| `trackId` | `string` | `downloads_meta` (keyPath) | Track ID |
| `status` | `"downloading" \| "complete" \| "failed"` | `downloads_meta` | Download state |
| `progress` | `number` | `downloads_meta` | 0–100 |
| `startedAt` | `string` | `downloads_meta` | ISO timestamp |
| `fileSize` | `number` | `downloads_meta` | Bytes |

**Exported functions**:

| Function | Purpose |
|----------|---------|
| `openDB()` | Open/create IndexedDB, ensure object stores exist |
| `saveTrack(track, blob, coverBlob?)` | Store downloaded audio + metadata |
| `getTrackBlob(trackId)` | Retrieve audio blob for playback |
| `getTrackMeta(trackId)` | Retrieve track metadata (no blob) |
| `getAllDownloadedTracks()` | List all offline tracks for UI |
| `removeTrack(trackId)` | Delete from IndexedDB + revoke blob URLs |
| `getStorageInfo()` | Query `navigator.storage.estimate()` for usage |
| `isTrackDownloaded(trackId)` | Quick check (used for UI badges) |
| `clearAll()` | Remove all offline data |

---

## Phase 2 — Offline Context (`client/src/contexts/offline-context.tsx`)

A React context wrapping the app:

```typescript
interface OfflineContextType {
  downloads: Track[];                          // all downloaded tracks
  isTrackDownloaded: (id: string) => boolean;
  downloadProgress: Record<string, number>;    // trackId → 0–100
  isOnline: boolean;
  storageUsed: number;                         // bytes
  storageQuota: number;                        // bytes
  downloadForOffline: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
}
```

**`downloadForOffline(track)` flow**:

1. Check `isTrackDownloaded()` — skip if already downloaded
2. Set `downloads_meta[trackId].status = "downloading"` in IndexedDB
3. Fetch audio via **stream URL** (`track.audioUrl` or `getTrackStreamUrl(trackId)`) with `fetch()` + `response.blob()` — **use the stream endpoint, NOT the download endpoint** to keep the two paths independent
4. Optionally fetch `track.coverUrl` as blob
5. Track progress using `Response.body.getReader()` — calculate percentage from `track.audioFileSize`
6. On complete: `saveTrack(track, blob, coverBlob)` in IndexedDB
7. Update context `downloads` list
8. Set status to `"complete"`

> **Why not use the download endpoint?** The download endpoint (`/api/tracks/:id/download/`) is reserved for the "Download to Device" path and may have different auth/permission logic or return signed CDN URLs. The stream URL (`track.audioUrl`) returns the raw audio data we need for IndexedDB storage.

**Online detection**:

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const goOnline = () => setIsOnline(true);
  const goOffline = () => setIsOnline(false);
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
  return () => {
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
  };
}, []);
```

---

## Phase 3 — Offline Audio Hook (`client/src/hooks/useOfflineAudio.ts`)

Resolves the `<audio>` source to a blob URL when the track is stored locally:

```typescript
function useOfflineAudio(track: Track | null): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!track) { setBlobUrl(undefined); return; }

    getTrackBlob(track.id).then((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      }
      setBlobUrl(undefined); // fall back to network URL
    });
  }, [track?.id]);

  return blobUrl ?? track?.audioUrl;
}
```

**Usage in `PlayerBar.tsx`**:

```diff
- <audio ref={audioRef} src={active?.audioUrl} preload="metadata" />
+ const audioSrc = useOfflineAudio(active);
+ <audio ref={audioRef} src={audioSrc} preload="metadata" />
```

If the blob is in IndexedDB, playback uses the local copy; otherwise it transparently falls back to the network URL.

---

## Phase 4 — Downloads UI

### 4a. Download buttons — Two modes side by side

Each location that offers download actions must expose **both** modes, clearly differentiated:

| Mode | Icon | Label | Action |
|------|------|-------|--------|
| Save Offline | `Download` (or `CloudDownload`) | "Save Offline" | `offlineContext.downloadForOffline(track)` |
| Download to Device | `FileDown` (or `Download` with arrow) | "Download File" | `downloadTrack(track.id, filename)` |

| Location | Existing | Add / Change |
|----------|----------|-------------|
| `TrackActionsMenu.tsx` | No download actions | Add **both** "Save Offline" and "Download File" items (separator between them if space permits) |
| `PlayScreen.tsx` action row | "Download" (auth-only, device download) | Keep existing button **as-is** for "Download File"; add a **new** "Save Offline" button alongside it |
| `PlayerBar.tsx` overflow menu | "Download" (auth-only, device download) | Keep existing "Download" button; **add** a new "Save Offline" entry above/below it with a separator |
| Downloads page (`/downloads`) | N/A | All tracks here are already saved offline — no device download needed |

**Label guidance for small screens / tight layouts**: Use icon-only buttons with tooltips, or shorten to "Offline" / "Download".

### 4b. Downloads page (`client/src/pages/downloads.tsx`)

- New route: `/downloads`
- Grid/card list of all downloaded tracks (same layout as `PlaylistCard`)
- Each card shows:
  - Cover art (served from cached `coverBlob`)
  - Title, artist, duration
  - Storage size
  - "Remove" button
  - "Play" button (adds to queue inline)
- Storage usage bar at top
- Empty state: "No tracks downloaded yet. Download tracks to listen offline."

### 4c. Progress indicators

- Toast notification using **existing shadcn `useToast`/`toast`** system (`client/src/hooks/use-toast.ts`) when download starts/completes
  - Start: `toast({ title: "Downloading...", description: track.title })`
  - Complete: `toast({ title: "Saved offline", description: track.title })`
  - Error: `toast({ title: "Download failed", variant: "destructive" })`
  - > **Consistency**: The app uses shadcn toasts everywhere. Do NOT use `sonner` for this feature.
- Circular progress indicator on the track card while downloading
- Badge count on "Downloads" nav item

---

## Phase 5 — Connectivity Awareness

### 5a. Offline badge

- In `BottomNav.tsx` and `SidebarNav.tsx`, show a small indicator when offline
- Disable streaming-only features (upload, share) when offline
- **"Save Offline" buttons** — when already offline, either:
  - Hide the "Save Offline" action entirely (you can't fetch a blob without a network), or
  - Show it as disabled with tooltip "Connect to the internet to save offline"
- **"Download File" buttons** — these work regardless of online status (the existing `downloadTrack` already handles errors gracefully), but show a warning toast if offline and the download fails

### 5b. Queue behavior when offline

- When playing offline, skip tracks that aren't downloaded or show "unavailable"
- Auto-play only downloaded tracks in queue

**Integration with `player-context.tsx`**:
- Hook into `playNext()`: before advancing to the next track, check `isTrackDownloaded(nextTrack.id)`
- If not downloaded and `isOnline === false`, skip to the following track
- If the entire queue consists of undownloaded tracks, show a toast: `toast({ title: "No offline tracks", description: "All tracks in queue need an internet connection." })`
- No changes are needed to the `PlayerProvider` itself — this logic lives in the `PlayerBar.tsx` component (or a custom hook) that wraps `playNext()` with offline awareness

### 5c. Service worker

No changes needed initially. The existing SW already serves `index.html` for offline navigation. Audio playback uses IndexedDB blob URLs, which bypass the SW entirely.

---

## Phase 6 — Storage Management

### 6a. Quota check before download

```typescript
const estimate = await navigator.storage.estimate();
const available = estimate.quota! - estimate.usage!;
if (track.audioFileSize > available) {
  // Warn user, suggest removing old downloads
}
```

### 6b. Request persistent storage

```typescript
if (navigator.storage && navigator.storage.persist) {
  await navigator.storage.persist();
  // Browser may grant — reduces chance of eviction under storage pressure
}
```

### 6c. Track removal

- Individual "Remove" button per track in Downloads page
- "Clear all" button with confirmation dialog

---

## File Manifest

| File | Action | Purpose |
|------|--------|---------|
| `package.json` (root) | Add dep | `idb` (IndexedDB wrapper — `npm install idb`) |
| `client/src/lib/offlineStorage.ts` | **Create** | IndexedDB CRUD operations |
| `client/src/contexts/offline-context.tsx` | **Create** | React context + download logic |
| `client/src/hooks/useOfflineAudio.ts` | **Create** | Resolves audio src to blob URL |
| `client/src/pages/downloads.tsx` | **Create** | Downloads management page |
| `client/src/components/PlayerBar.tsx` | Edit | Use `useOfflineAudio`, add save-offline button |
| `client/src/components/PlayScreen.tsx` | Edit | Add "Save offline" action |
| `client/src/components/playlists/TrackActionsMenu.tsx` | Edit | Add "Download for offline" item |
| `client/src/App.tsx` | Edit | Add `/downloads` route, wrap `OfflineProvider` |
| `client/src/components/BottomNav.tsx` | Edit | Add "Downloads" nav item + offline indicator |
| `client/src/components/SidebarNav.tsx` | Edit | Add "Downloads" nav item + offline indicator |

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 + 6
```

Each phase builds on the previous:

1. **Storage layer** — no UI dependencies, can be tested in isolation
2. **Offline context** — depends on storage layer, provides state to entire app
3. **Offline playback** — depends on storage layer, integrates into `<audio>` element
4. **Downloads UI** — depends on context, adds user-facing controls
5. **Connectivity + storage management** — polish layer on top

---

## Existing Architecture — Why This Fits

- **Player context** is already separated from audio source resolution — we inject `useOfflineAudio` at the `<audio>` element level
- **IndexedDB blob URLs** work as drop-in replacements for network URLs in `<audio src>`
- **Existing `downloadTrack`** (in `apiConfig.ts`) provides the "Download to Device" path and is preserved unchanged — the new "Save Offline" path is a separate flow using the stream URL
- **PWA manifest + service worker** already exist — offline navigation is handled, we just add offline audio
- **Track data model** includes `audioFileSize` (for quota estimation), `audioFormat`, `coverUrl` — everything needed
- **No third-party audio library** — we use raw HTML5 `<audio>` with blob URLs, which is the simplest path

---

## Estimated Effort

| Phase | New files | Edited files | Est. lines |
|-------|-----------|-------------|------------|
| 1 — Storage layer | 1 | 1 (`package.json`) | ~120 |
| 2 — Offline context | 1 | 1 (`App.tsx`) | ~180 |
| 3 — Offline audio hook | 1 | 1 (`PlayerBar.tsx`) | ~40 |
| 4 — Downloads UI | 1 | 4 | ~250 |
| 5 — Connectivity + storage | 0 | 2 | ~60 |
| **Total** | **4** | **9** | **~650** |
