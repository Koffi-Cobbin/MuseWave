# Playback Restoration Plan

## Restore Current Playback Implementation to the Old (Simpler) Implementation

### Overview

The current playback system was refactored into a modular architecture with platform-specific strategies (`client/src/playback/`), additional context methods (`skipNext`, `skipPrev`, `playTrack`, `playQueue`, `isBuffering`), and a `useKeyboardShortcuts` hook. The old implementation was simpler — audio logic lived directly in `PlayerBar.tsx` with effects, and the context only managed state (`playNext`/`playPrev`).

This plan outlines how to revert each file to the old implementation while **keeping two current features**:
1. **Volume mute toggle** — `Volume2`/`VolumeX` icon button + `toggleMute` with `prevVolumeRef`
2. **Buffering spinner** — `Loader2` animated spinner when `isBuffering` is true

---

## Files to Modify (5 files)

### 1. `client/src/contexts/player-context.tsx`

**Target:** Old `player-context.tsx` (200 lines — state-only, no ref-based methods) **plus** keep `isBuffering`/`setIsBuffering`.

| Remove / Revert | Details |
|---|---|
| ~~`isBuffering`, `setIsBuffering`~~ | **KEEP** — needed for Loader2 spinner |
| `skipNext()` → `Track \| null` | Remove method + type |
| `skipPrev()` → `Track \| null` | Remove method + type |
| `playTrack(track)` → `Track` | Remove method + type |
| `playQueue(tracks, startIndex)` → `Track \| null` | Remove method + type |
| `useRef` imports for queueRef/indexRef/repeatModeRef | Remove all ref logic |
| `playNext()` refactored with refs | Revert to original closure-based `playNext()` (reads queue, queueIndex, repeatMode directly from state) |
| `playPrev()` refactored with refs | Revert to original closure-based `playPrev()` (reads queue, queueIndex directly) |

**Restored signature** (with `isBuffering` kept):
```typescript
type PlayerContextType = {
  active: Track | null;
  setActive: (track: Track | null) => void;
  autoPlay: boolean;
  setAutoPlay: (value: boolean) => void;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  isBuffering: boolean;              // ← KEPT from current
  setIsBuffering: (value: boolean) => void;  // ← KEPT from current
  queue: Track[];
  queueIndex: number;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  insertNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  queueCount: number;
  repeatMode: RepeatMode;
  toggleRepeatMode: () => void;
};
```

**import changes:** Remove `useRef` import. Keep `useState` (already present).

---

### 2. `client/src/playback/` (entire directory — 6 files)

**Action: DELETE** all files in this directory:

| File | Lines | Purpose |
|---|---|---|
| `client/src/playback/usePlayback.ts` | 264 | Central hook wrapping strategies |
| `client/src/playback/platform.ts` | 58 | Platform detection |
| `client/src/playback/types.ts` | 109 | Strategy interface & types |
| `client/src/playback/strategies/base.ts` | 22 | State ref factory |
| `client/src/playback/strategies/desktop.ts` | 102 | Desktop strategy |
| `client/src/playback/strategies/ios.ts` | 109 | iOS strategy |
| `client/src/playback/strategies/android.ts` | 198 | Android strategy (with hang detection) |

**Total:** ~862 lines of platform-specific code removed.

Audio logic will be restored to direct `useEffect` + `<audio>` management inside `PlayerBar.tsx`.

---

### 3. `client/src/components/PlayerBar.tsx`

**Target:** Old `PlayerBar.tsx` (905 lines — owns `<audio>` directly) **plus** keep volume mute toggle + buffering spinner from current.

| Change | Details |
|---|---|
| Remove `import { usePlayback } from "@/playback/usePlayback"` | No longer needed |
| Remove `import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"` | No longer needed |
| **Keep** `import { Loader2, Volume2, VolumeX } from "lucide-react"` | Needed for mute toggle + spinner |
| Remove `usePlayback(...)` hook call + all destructured values (`nonGesturePlay`, `togglePlay`, `seek`, `currentTime`, `duration`, `isPlayPending`, `onEndedRef`) | Audio events managed directly |
| **Keep** `isBuffering` / `setIsBuffering` from context destructure | Needed for Loader2 spinner |
| Remove `skipNext`, `skipPrev`, `playTrack` from context destructure | Context no longer exposes these |
| Remove `useKeyboardShortcuts({...})` hook call | No keyboard shortcuts |
| Remove watcher effect (`prevActiveIdRef`, `active + isPlaying → nonGesturePlay`) | Replaced by simpler sync effect |
| Remove `onEndedRef.current = () => {...}` effect | Replaced by direct `ended` listener |
| Remove `handleSkipNext`, `handleSkipPrev`, `handlePlayTrack` wrappers | Not needed |
| Add `currentTime` / `duration` local state (`useState(0)`) | Restore local time management |
| Restore `useEffect` for `timeupdate` / `loadedmetadata` / `ended` directly on audioRef | Manage audio events in-component |
| Restore simple `togglePlay` handler: `setIsPlaying(!isPlaying)` | No strategy delegation |
| Restore `handleSeek(time)` updating `audio.currentTime` + `setCurrentTime(time)` | Direct audio manipulation |
| Restore `handleSeekDelta(delta)` for incremental seek | Direct audio manipulation |
| Change `onSeek={seek}` → `onSeek={handleSeek}` in PlayScreen props | Local handler |
| Change `onTogglePlay={togglePlay}` → `onTogglePlay={() => setIsPlaying(!isPlaying)}` in PlayScreen props | Simple toggle |
| Remove `onSkipNext={handleSkipNext}`, `onSkipPrev={handleSkipPrev}`, `onPlayTrack={handlePlayTrack}` from PlayScreen props | Props no longer accepted |
| Restore autoplay sync effect (`autoPlay + active → setIsPlaying`) | Original pattern |
| Restore audio sync effect (`isPlaying + active.id → play/pause` with canplay listener) | Original pattern |
| **Keep** volume mute toggle: `toggleMute` + `prevVolumeRef` + `Volume2`/`VolumeX` button | Replaces old emoji `🔊` |
| Restore old audio element: `<audio ref={audioRef} src={audioSrc} preload="metadata" />` | Remove `playsInline`, remove imperative src management |
| Remove shortcut hint HUD (`shortcutHint` state, `AnimatePresence` for shortcut badge) | Not in old implementation |
| **Keep** `Loader2` spinner for buffering state in play/pause button | `isBuffering && isPlaying ? <Loader2 className="animate-spin" /> : ...` |

**Restored behaviors (with kept features):**
- `playNext` / `playPrev` called directly from context for skip buttons
- `ended` event handler directly in component (checks repeatMode, calls `playNextRef.current()` or restarts)
- Play/pause managed via `setIsPlaying` + sync effect
- No platform-specific strategy abstraction
- No keyboard shortcuts
- **✅ KEPT:** `Loader2` spinner when buffering (`isBuffering` state)
- **✅ KEPT:** Volume mute toggle with `Volume2`/`VolumeX` icons + `toggleMute`

---

### 4. `client/src/components/PlayScreen.tsx`

**Target:** Old `PlayScreen.tsx` (959 lines — simpler props, uses context directly).
The old PlayScreen already includes `Volume2` for the volume slider in desktop layout — restoring to it naturally preserves volume controls.

| Change | Details |
|---|---|
| Remove `onSkipNext?: () => void` from props interface | Old interface doesn't have it |
| Remove `onSkipPrev?: () => void` from props interface | Old interface doesn't have it |
| Remove `onPlayTrack?: (track: Track) => void` from props interface | Old interface doesn't have it |
| Add `onSeekDelta` back to props interface | Used for incremental seek buttons |
| Add `volume?: number` and `onVolumeChange?: (v: number) => void` back to props interface | Restore volume control in PlayScreen (old version has it) |
| Remove local `skipNext` / `skipPrev` fallback logic | Not needed |
| Destructure `playNext`, `playPrev` from context instead of `skipNext`, `skipPrev` | Use original context methods |
| Change `onClick={skipNext}` → `onClick={playNext}` in NEXT buttons | Use context directly |
| Change `onClick={skipPrev}` → `onClick={playPrev}` in PREV buttons | Use context directly |
| **Keep** `Volume2` import (already present in old PlayScreen) | Used for volume slider UI |
| Restore volume slider in desktop layout (old version has it) | `onVolumeChange` + range input |
| Change `onClose` + `onPlayTrack` pattern in `MoreTrackRow` | Old accepts only `onClose` |
| `MoreTrackRow` uses `usePlayer()` for `setActive`, `setAutoPlay` directly | Not `playTrack` prop |

**Restored behaviors:**
- Prev/Next buttons call `playPrev` / `playNext` from context
- MoreTrackRow uses `setActive` + `setAutoPlay` from context (not `playTrack` prop)
- Volume slider in desktop layout (restored from old PlayScreen)
- Simpler prop interface

---

### 5. `client/src/hooks/useKeyboardShortcuts.ts`

**Action:** This file can remain in the codebase (it may be used elsewhere in the future), but its import/usage is removed from `PlayerBar.tsx`. If no other component references it, it can be deleted.

| Action | Condition |
|---|---|
| Remove import from `PlayerBar.tsx` | Required |
| Delete `useKeyboardShortcuts.ts` | If no other file imports it |

---

## Step-by-Step Execution Order

1. **Delete `client/src/playback/` directory** — Remove all 6 platform strategy files
2. **Rewrite `client/src/contexts/player-context.tsx`** — Replace with old content **but keep `isBuffering`/`setIsBuffering`**; remove refs, skipNext, skipPrev, playTrack, playQueue
3. **Rewrite `client/src/components/PlayerBar.tsx`** — Replace with old content **but keep volume mute toggle + Loader2 spinner**; remove usePlayback, useKeyboardShortcuts, watcher effect; restore local time state, direct audio events, simple togglePlay/seek
4. **Rewrite `client/src/components/PlayScreen.tsx`** — Replace with old content (which already has `Volume2` + volume slider); remove onSkipNext/onSkipPrev/onPlayTrack props, use playNext/playPrev from context, simpler MoreTrackRow
5. **Delete `client/src/hooks/useKeyboardShortcuts.ts`** — Only if unused elsewhere
6. **Verify build** — Run type check and build to confirm no broken imports

---

## Files NOT to Modify

| File | Reason |
|---|---|
| `Old Implementation/` | Reference source — keep untouched |
| `docs/` other files | Unrelated to playback |
| Shared schema (`shared/schema.ts`) | Unchanged between versions |
| API config (`lib/apiConfig.ts`) | Unchanged between versions |
| Auth context, Offline context, etc. | Unrelated |

---

## Summary of Changes

| File | Old (lines) | Current (lines) | After Restore |
|---|---|---|---|
| `player-context.tsx` | 200 | 306 | **~210** (+10 for kept `isBuffering`) |
| `PlayerBar.tsx` | 905 | 961 | **~915** (+10 for kept mute toggle + spinner) |
| `PlayScreen.tsx` | 959 | 940 | **959** (restored to old) |
| `playback/` (6 files) | — | 862 | **DELETED** (-862) |
| `useKeyboardShortcuts.ts` | — | ~50 | **DELETED** (-50) |
| **Total** | **2,064** | **3,119** | **~2,084** (-1,035) |

### Features Preserved From Current Implementation

| Feature | Where | Why |
|---|---|---|
| ✅ **Volume mute toggle** (`Volume2`/`VolumeX` + `toggleMute` + `prevVolumeRef`) | `PlayerBar.tsx` | User request |
| ✅ **Buffering spinner** (`Loader2` + `isBuffering` state) | `player-context.tsx` + `PlayerBar.tsx` | User request |

The restored codebase will be ~1,035 lines lighter, with all audio logic self-contained in `PlayerBar.tsx` via `useRef` + `useEffect`, a simpler state-only context, **but retaining the volume mute toggle and buffering spinner UX enhancements**.
