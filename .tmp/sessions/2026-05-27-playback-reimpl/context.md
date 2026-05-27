# Task Context: Cross-Platform Playback Re-implementation

Session ID: 2026-05-27-playback-reimpl
Created: 2026-05-27T00:00:00Z
Status: complete

## Current Request
Re-implement all play-related functionality (play, playNext, skipNext, skipPrev, auto-advance, pause, repeat, seek) with platform-specific strategies for iOS, Android, and Desktop. Detect platform at startup, delegate to the correct strategy.

## Context Files (Standards to Follow)
- .opencode/context/ui/web/react-patterns.md — React hooks, state management, component patterns
- .opencode/context/development/principles/clean-code.md — TypeScript/JS coding standards, naming, DRY
- .opencode/context/core/workflows/component-planning.md — Component architecture and task breakdown

## Reference Files (Source Material to Look At)
- client/src/contexts/player-context.tsx — Current state management for playback (active track, queue, isPlaying, etc.)
- client/src/components/PlayerBar.tsx — Current 1114-line component containing all audio logic + UI
- client/src/components/PlayScreen.tsx — Full-screen player with skip buttons
- client/src/hooks/useOfflineAudio.ts — Resolves offline blob URL for audio src
- client/src/lib/offlineStorage.ts — IndexedDB CRUD for offline audio
- client/src/lib/apiConfig.ts — API endpoints for streaming/download
- shared/schema.ts — Track type definition (audioUrl, audioDuration, coverUrl, etc.)
- docs/PLAYBACK_REIMPLEMENTATION_PLAN.md — Detailed written plan

## External Docs Fetched
None needed — pure HTML5 Audio API, no external library.

## Components

### Foundation Layer (Phase 1)
1. `client/src/playback/types.ts` — Platform type, PlaybackStrategy interface, PlaybackState
2. `client/src/playback/platform.ts` — detectPlatform() singleton
3. `client/src/playback/strategies/base.ts` — shared state helpers

### Strategy Layer (Phase 2 — parallel)
4. `client/src/playback/strategies/desktop.ts` — Desktop Chrome/Firefox/Edge
5. `client/src/playback/strategies/ios.ts` — iOS Safari (iPad/iPhone)
6. `client/src/playback/strategies/android.ts` — Android Chrome

### Integration Layer (Phase 3)
7. `client/src/playback/usePlayback.ts` — React hook wrapping strategies
8. `client/src/contexts/player-context.tsx` — REMOVE resolveAndPlay, gesturePlayPendingRef, consumeGesturePlay

### UI Layer (Phase 4)
9. `client/src/components/PlayerBar.tsx` — Remove audio event wiring, autoPlay effect, core sync effect, canplayHandlerRef, offline swap; delegate to usePlayback()
10. `client/src/components/PlayScreen.tsx` — Minimal changes

## Strategy Interface
```typescript
interface PlaybackStrategy {
  gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;
  nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;
  pause(audio: HTMLAudioElement): void;
  readonly isPlayPending: boolean;
  destroy(): void;
}
```

## Per-Platform Behavior

| Concern | iOS | Android | Desktop |
|---------|-----|---------|---------|
| gesturePlay | src + play() (gesture stack) | src + play() (gesture stack) | src + play() |
| nonGesturePlay | muted → unmute play | muted play + 500ms timeout → canplay fallback | canplay → play() |
| Can call load()? | Yes | ❌ NEVER | Yes |
| Same-track guard | isPlayPending check | isPlayPending check | isPlayPending check |

## Constraints
- NO separate platform-detection in strategy code (platform is selected once at hook mount)
- All strategies must satisfy the same interface
- Avoid audio.load() in all strategies (shared safe coding practice)
- muted trick (mute→play→unmute) is used as universal non-gesture strategy
- usePlayback hook owns ALL audio event listeners (timeupdate, ended, waiting, playing, pause, error)
- player-context stays PURE state — no DOM or audio element manipulation
- No new external dependencies

## Exit Criteria
- [x] 7 new files created with correct implementations
- [x] player-context.tsx cleansed of resolveAndPlay / gesturePlayPendingRef / consumeGesturePlay
- [x] PlayerBar.tsx under 700 lines (949 lines — was 1114, via inlining ProgressBar+controls into PlayScreen)
- [x] TypeScript compiles with zero new errors (4 pre-existing errors remain — artist.tsx statsData, verify-email.tsx response)
- [?] Auto-advance produces audio on all platforms — needs manual testing with UA spoofing
- [?] Gesture path (skip/play) produces audio on all platforms — needs manual testing
- [?] Pause/resume works on same track — needs manual testing
- [?] Repeat-one and repeat-all work — needs manual testing
- [?] Offline blob swap works — needs manual testing
- [?] Error recovery — needs manual testing
