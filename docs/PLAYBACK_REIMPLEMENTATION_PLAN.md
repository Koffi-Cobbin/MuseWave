# Cross-Platform Playback Re-implementation Plan

## Status: Proposed · Priority: High · Effort: Large (10–14 files, ~2 days)

---

## 1. Motivation

The current playback system has accumulated bugs from trying to serve iOS, Android, and desktop with a single code path. The result is a web of workarounds, ref-based sentinels, and React-effect races that are fragile and hard to reason about.

### Current Pain Points

| Issue | Root Cause | Symptom |
|-------|------------|---------|
| **Auto-advance silence on Android** | `audio.load()` causes Chrome's `play()` Promise to hang | Auto-advance track has no audio |
| **Stale `isPlaying` race** | `autoPlay` effect runs before `coreSync` effect; `setIsPlaying(true)` is still enqueued when coreSync reads `isPlaying` | Non-gesture path skips muted play entirely on second render → same-track path calls naked `play()` → ❌ |
| **Sentinel overloading** | `canplayHandlerRef` serves as both event-listener tracker and "playback pending" flag | Race when one is cleared and the other hasn't fired |
| **1114-line component** | Audio logic, event wiring, queue state, menu state, and rendering in one file | Hard to debug, easy to break |
| **No platform awareness** | One strategy tries to handle every browser via workarounds | Desktop pays for Android's hang-detection timeout; Android inherits iOS tricks that don't apply |
| **resolveAndPlay in context** | Context manages audio element directly | Mixes state (context role) with imperative DOM manipulation (audio element role) |

---

## 2. Proposed Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    UI Layer                               │
│  PlayerBar.tsx  ·  PlayScreen.tsx                        │
│  (render + minimal wiring)                               │
│  └─ calls usePlayback() hook                             │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│              usePlayback() hook                           │
│  Wraps strategy + owns audio lifecycle                   │
│  Exposes: play(), skipNext(), skipPrev(),                │
│           togglePlay(), seek(), setVolume(), ...          │
│  Subscribes audio events internally                      │
└──────┬─────────────────────────────────┬─────────────────┘
       │                                 │
       ▼                                 ▼
┌──────────────┐  ┌───────────────────────────────────────┐
│  Platform    │  │  PlaybackStrategy (interface)          │
│  detect()   │  ├───────────────────────────────────────┤
│  → 'ios'    │  │  ┌─ iOSStrategy ────────────────────┐  │
│  → 'android'│  │  │ gesturePlay:  src + play()       │  │
│  → 'desktop' │  │  │ nonGesture:  muted→unmute play   │  │
│              │  │  │ load() safe                       │  │
│              │  │  └──────────────────────────────────┘  │
│              │  │  ┌─ AndroidStrategy ────────────────┐  │
│              │  │  │ gesturePlay:  src + play()       │  │
│              │  │  │ nonGesture:  muted play +        │  │
│              │  │  │  500ms timeout → canplay fallback │  │
│              │  │  │ NEVER call load()                │  │
│              │  │  └──────────────────────────────────┘  │
│              │  │  ┌─ DesktopStrategy ────────────────┐  │
│              │  │  │ gesturePlay:  src + play()       │  │
│              │  │  │ nonGesture:  canplay → play()    │  │
│              │  │  └──────────────────────────────────┘  │
└──────────────┘  └───────────────────────────────────────┘
```

### 2.1 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Detect platform once** at module load | No re-detection; stored in a ref/constant |
| **Strategy is a class** (not hook) | Stateless interface; hook wraps it for React integration |
| **usePlayback hook owns audio events** | `timeupdate`, `ended`, `waiting`, `playing`, `pause`, `error` all in one place — never orphaned |
| **Context stays state-only** | `player-context.tsx` holds `active`, `isPlaying`, `isBuffering`, queue, repeat — no DOM manipulation |
| **Ref-based `pendingPromise`** replaces sentinel | Simple boolean: `true` while play() is in-flight; same-track path checks this before calling play() |
| **No `autoPlay` effect** | `nonGesturePlay()` is called directly from the `ended` handler — no two-pass React dance |
| **Offline blob swap in the hook** | Not in PlayerBar; the hook manages the lifecycle |

---

## 3. File Manifest

### New Files (7)

| File | Purpose |
|------|---------|
| `client/src/playback/types.ts` | `Platform`, `PlaybackState`, `PlaybackStrategy` interface, `TrackSource` resolver |
| `client/src/playback/platform.ts` | `detectPlatform()` + cached `getPlatform()` singleton |
| `client/src/playback/strategies/base.ts` | Shared state ref (`PlaybackStateRef`) and utility functions |
| `client/src/playback/strategies/desktop.ts` | Desktop playback strategy |
| `client/src/playback/strategies/ios.ts` | iOS Safari playback strategy |
| `client/src/playback/strategies/android.ts` | Android Chrome playback strategy |
| `client/src/playback/usePlayback.ts` | React hook that wires strategy + audio element + context setters |

### Modified Files (3)

| File | Change |
|------|--------|
| `client/src/contexts/player-context.tsx` | Remove `resolveAndPlay`, `gesturePlayPendingRef`, `consumeGesturePlay`; keep only state + queue logic |
| `client/src/components/PlayerBar.tsx` | Remove autoPlay effect, core sync effect, all audio event wiring, canplayHandlerRef, loadedTrackIdRef, offline swap effect; delegate to `usePlayback()` |
| `client/src/components/PlayScreen.tsx` | Minimal — already uses `skipNext`/`skipPrev` from context; remove `onTogglePlay` prop in favor of hook call |

---

## 4. Interface Definitions

### `PlaybackStrategy`

```typescript
interface PlaybackStrategy {
  /** Called from user-gesture handlers (click/tap/keyboard) — must set
   *  audio.src and call audio.play() synchronously within the gesture
   *  stack for iOS compatibility. */
  gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;

  /** Called from the audio "ended" event (NOT a user gesture). Must
   *  start playback in a way the target browser permits without a
   *  trusted event (muted autoplay, canplay listener, etc.). */
  nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;

  /** Pause the current track. No src changes. */
  pause(audio: HTMLAudioElement): void;

  /** True while a play() call is in-flight. Used by the same-track
   *  resume path to avoid double play(). */
  readonly isPlayPending: boolean;

  /** Destroy any timers / listeners. Called by the hook on cleanup. */
  destroy(): void;
}
```

### `Platform` type

```typescript
type Platform = 'ios' | 'android' | 'desktop';
```

### `PlaybackState`

```typescript
interface PlaybackState {
  isPlayPending: boolean;   // true while play() promise unsettled
  lastTrackId: string | null;
}
```

---

## 5. Strategy Details

### 5.1 Desktop Strategy (baseline)

```
gesturePlay(track, audio):
  1. audio.src = track.audioUrl
  2. result = audio.play()
  3. if result rejects → setIsPlaying(false)
  ✅ No special handling

nonGesturePlay(track, audio):
  1. audio.src = track.audioUrl
  2. on canplay → audio.play()
  ✅ Standard media auto-advance pattern
```

### 5.2 iOS Strategy

```
gesturePlay(track, audio):
  1. audio.src = track.audioUrl        ← within gesture stack
  2. result = audio.play()             ← allowed on iOS in gesture
  3. if result rejects:
     a. audio.muted = true
     b. audio.play()                   ← muted autoplay allowed
     c. .then() → audio.muted = wasMuted
  ✅ Relies on gesture-stack permission

nonGesturePlay(track, audio):
  1. audio.src = track.audioUrl
  2. wasMuted = audio.muted
  3. audio.muted = true
  4. result = audio.play()             ← muted autoplay allowed since iOS ~10
  5. .then() → audio.muted = wasMuted
  6. .catch() → setIsPlaying(false)
  ⚠ No audio.load() called (safe on iOS, but we avoid it for code sharing)
```

**Key iOS knowledge:**
- Muted autoplay has been allowed on iOS Safari since iOS 10 (2016).
- A user gesture is required for unmuted play on a fresh page load.
- Once a gesture-initiated play() has been called on an element, subsequent calls to play() on the same element are allowed for ~30 seconds.
- The `ended` event is NOT a user gesture on iOS.

### 5.3 Android Strategy

```
gesturePlay(track, audio):
  1. audio.src = track.audioUrl
  2. result = audio.play()             ← within gesture stack
  3. if result rejects:
     a. audio.muted = true
     b. audio.play()                   ← muted autoplay fallback
     c. .then() → audio.muted = wasMuted
     d. .catch() → canplay → muted play
  ⚠ NO audio.load() anywhere (causes play() hang)

nonGesturePlay(track, audio):
  1. isPlayPending = true              ← prevents same-track interference
  2. audio.src = track.audioUrl        ← implicitly starts load
  3. wasMuted = audio.muted
  4. audio.muted = true
  5. result = audio.play()             ← muted autoplay always allowed
  6. Set 500ms hangTimer:
     if timeout fires before promise settles:
       a. Add canplay listener
       b. on canplay → audio.muted = true; audio.play()
       c. isPlayPending = false when resolves
  7. .then() → clear hangTimer, isPlayPending = false, unmute
  8. .catch() → clear hangTimer, isPlayPending = false
     → canplay listener → audio.muted = true; audio.play()
```

**Key Android knowledge:**
- `audio.load()` synchronously aborts the resource selection algorithm started by `audio.src = url`. This causes `audio.play()` to reject or hang indefinitely with a never-settling Promise.
- Muted autoplay (`audio.muted=true; audio.play()`) is universally allowed on Android Chrome.
- The `play()` Promise can still hang even with muted autoplay (Chrome bug). The 500ms timeout detects this.
- Direct `play()` (non-muted) outside a gesture is always blocked and the Promise rejects.

---

## 6. State Flow (before vs after)

### Current (broken)

```
playNext()                    ended event
    │                             │
    ▼                             ▼
setActiveState(next)         setAutoPlay(true)
    │                             │
    └─────────┬───────────────────┘
              │ (batched React update)
              ▼
         RENDER 1: active=next, autoPlay=true, isPlaying=false
              │
     ┌────────┴────────┐
     ▼                 ▼
  Effect A          Effect B
  (autoPlay)        (coreSync)
  enqueues:         reads isPlaying → false ❌
  setIsPlaying(true)→ sets src, SKIPS muted play
  setAutoPlay(false)
     │                 │
     └────────┬────────┘
              │ (enqueued state processed)
              ▼
         RENDER 2: autoPlay=false, isPlaying=true
              │
              ▼
         Same-track path
         canplayHandlerRef.current = null
         audio.play()  →  FAILS on Android ❌
```

### Proposed (fixed)

```
playNext()                    ended event
    │                             │
    ▼                             ▼
setActiveState(next)         strategy.nonGesturePlay(next, audio)
    │                             │
    │                             ├─ isPlayPending = true
    │                             ├─ audio.src = next.audioUrl
    │                             ├─ audio.muted = true
    │                             ├─ audio.play()
    │                             │  ├─ .then() → unmute, isPlayPending = false
    │                             │  ├─ .catch() → canplay → muted play
    │                             │  └─ 500ms timeout → canplay → muted play
    │                             ▼
    │                         Playback started ✅
    ▼
RENDER: active=next, isPlaying=true
    │
    ▼
Same-track path
reads isPlayPending → true
SKIPS audio.play()  ✅
```

---

## 7. Offline Blob Swap

The offline blob swap (when `offlineAudioSrc` resolves to a `blob:` URL) moves into `usePlayback`:

```typescript
// Inside usePlayback, a dedicated useEffect:
useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !active || !offlineAudioSrc) return;
  if (
    audio.currentTime < 0.5 &&
    !audio.src.startsWith("blob:") &&
    offlineAudioSrc.startsWith("blob:")
  ) {
    const wasPlaying = !audio.paused;
    audio.src = offlineAudioSrc;
    if (wasPlaying) {
      audio.play().catch(() => {
        audio.addEventListener("canplay", () => audio.play().catch(() => {}), { once: true });
      });
    }
  }
}, [offlineAudioSrc, active?.id]);
```

The strategy is NOT involved in offline swap — it's a simple src replacement that happens early in playback. The strategy only deals with initiating play.

---

## 8. Repeat Mode

Stay as-is: handled in the `ended` event handler inside `usePlayback`.

```typescript
const handleEnded = useCallback(() => {
  recordPlay(...);

  if (repeatModeRef.current === 'one') {
    audio.currentTime = 0;
    audio.play().catch(() => {
      audio.addEventListener("canplay", () => audio.play().catch(() => {}), { once: true });
      audio.load();  // safe on desktop/iOS; Android config should avoid repeat-one
    });
  } else {
    const nextTrack = determineNext();
    if (nextTrack) {
      strategy.nonGesturePlay(nextTrack, audio)
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }
}, [strategy]);
```

---

## 9. Error Recovery

| Scenario | Behavior |
|----------|----------|
| `play()` rejects in gesture path | Muted fallback → canplay fallback |
| `play()` rejects in non-gesture path | canplay fallback → muted play |
| All play attempts fail | `setIsPlaying(false)` — user sees pause state |
| Audio element fires `error` event | `setIsPlaying(false)` + `setIsBuffering(false)` |
| Offline track not downloaded | Auto-skip to next (existing behavior, unchanged) |

---

## 10. Testing Strategy

| Test | How |
|------|-----|
| iOS gesture play | Mock `navigator.userAgent` → `'iPhone'`, call `gesturePlay()`, verify `audio.play()` called |
| iOS non-gesture muted play | Mock UA → `'iPhone'`, call `nonGesturePlay()`, verify `audio.muted=true` before `play()` |
| Android gesture play | Mock UA → `'Android'`, call `gesturePlay()`, verify no `audio.load()` |
| Android non-gesture hang | Mock UA → `'Android'`, mock `play()` returns never-settling promise, verify 500ms timeout triggers canplay |
| Desktop canplay path | Mock UA → `'Chrome'` (no iOS/Android), call `nonGesturePlay()`, verify canplay listener added |
| Same-track guard | Set `isPlayPending=true`, call same-track resume, verify `audio.play()` NOT called |
| Offline blob swap | Set `offlineAudioSrc='blob:...'`, verify src swap + play |
| Repeat-one | Fire `ended` with `repeatMode='one'`, verify `audio.currentTime=0` + `play()` |

---

## 11. Implementation Order (Dependency Graph)

```
Phase 1 — Foundation (independent)
┌──────────────────────────────────────────────────────┐
│  1.1  types.ts         (no deps)                     │
│  1.2  platform.ts      (no deps)                     │
│  1.3  base.ts          (depends: 1.1)                │
└──────────────────────────────────────────────────────┘

Phase 2 — Strategies (independent of each other)
┌──────────────────────────────────────────────────────┐
│  2.1  desktop.ts       (depends: 1.1, 1.3)          │
│  2.2  ios.ts           (depends: 1.1, 1.3)          │
│  2.3  android.ts       (depends: 1.1, 1.3)          │
└──────────────────────────────────────────────────────┘
  (Can be done in parallel — strategies are independent)

Phase 3 — Integration
┌──────────────────────────────────────────────────────┐
│  3.1  usePlayback.ts   (depends: all strategies)     │
│  3.2  player-context.tsx (depends: none — removal    │
│        of resolveAndPlay is purely subtractive)       │
└──────────────────────────────────────────────────────┘

Phase 4 — UI cleanup
┌──────────────────────────────────────────────────────┐
│  4.1  PlayerBar.tsx    (depends: 3.1, 3.2)          │
│  4.2  PlayScreen.tsx   (depends: 3.2)               │
└──────────────────────────────────────────────────────┘

Phase 5 — Validation
┌──────────────────────────────────────────────────────┐
│  5.1  Type check (tsc --noEmit)                     │
│  5.2  Manual test on iOS Safari                     │
│  5.3  Manual test on Android Chrome                 │
│  5.4  Manual test on Desktop (Chrome, Firefox, Edge)│
│  5.5  Edge case: offline playback                   │
│  5.6  Edge case: repeat-one / repeat-all            │
└──────────────────────────────────────────────────────┘
```

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| iOS changes break gesture play | Low | High | Keep `resolveAndPlay` pattern in iOS strategy unchanged |
| Android timeout is wrong duration | Medium | Medium | Make `HANG_TIMEOUT_MS` a configurable constant; test on real devices |
| Platform detection false positives (iPadOS) | Low | Low | Use `maxTouchPoints` check for iPad Pro detection |
| Strategy interface too rigid | Low | Low | Start minimal; add methods as needed |
| Regression in queue edge cases | Medium | Medium | Write test scenarios before refactoring context state logic |

---

## 13. Success Criteria

- [ ] Auto-advance produces audio on **Android Chrome** (was silent)
- [ ] Auto-advance produces audio on **iOS Safari**
- [ ] Auto-advance works on **Desktop** (Chrome, Firefox, Edge)
- [ ] **Skip Next/Prev** (gesture path) works on all platforms
- [ ] **Repeat-one** re-plays track on all platforms
- [ ] **Pause/Resume** on same track works on all platforms
- [ ] **Offline blob swap** works (no infinite spinner)
- [ ] **Error recovery**: bad URL → `isPlaying=false` → next tap plays
- [ ] TypeScript compiles with **zero errors**
- [ ] PlayerBar is **under 700 lines** (was 1114)
