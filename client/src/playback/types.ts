import type { Track } from '../../../shared/schema';

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Supported playback platforms.
 *
 * Each platform has distinct browser autoplay policies and audio API behaviors:
 * - `ios`: Safari on iPhone/iPad. Requires user gesture for audio context. No `audio.load()`.
 * - `android`: Chrome on Android. Requires user gesture for audio context. `audio.load()` causes issues.
 * - `desktop`: Chrome/Firefox/Edge on desktop. Relaxed autoplay after first interaction.
 */
export type Platform = 'ios' | 'android' | 'desktop';

// ============================================================================
// Playback Strategy Interface
// ============================================================================

/**
 * Platform-specific playback strategy.
 *
 * The key distinction is between **gesture** and **non-gesture** play:
 *
 * - **gesturePlay**: Called from user-initiated event handlers (click, touch, keydown).
 *   All platforms support direct `audio.play()` from a user gesture context.
 *
 * - **nonGesturePlay**: Called from the `ended` event during auto-advance, or any
 *   scenario where no user gesture is active. Browsers block `audio.play()` without
 *   a prior gesture. The strategy must work around this via platform-specific tricks
 *   (e.g., muted play, `canplay` fallback).
 */
export interface PlaybackStrategy {
  /**
   * Play a track from a user-gesture-initiated handler (click, touch, keyboard).
   *
   * Browsers permit `audio.play()` inside user gesture callbacks, so this path
   * sets the source and calls `play()` directly.
   *
   * @param track - The track to play
   * @param audio - The HTMLAudioElement to use
   */
  gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;

  /**
   * Play a track without a user gesture (e.g., auto-advance from `ended` event).
   *
   * Browsers block `audio.play()` outside gesture context. Strategies use
   * platform-specific workarounds:
   * - iOS: Play muted, then unmute once playback starts.
   * - Android: Play muted with a fallback timeout.
   * - Desktop: Wait for `canplay` event, then play.
   *
   * @param track - The track to play
   * @param audio - The HTMLAudioElement to use
   */
  nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void>;

  /**
   * Pause the current track.
   *
   * @param audio - The HTMLAudioElement to pause
   */
  pause(audio: HTMLAudioElement): void;

  /**
   * Whether a `play()` call is currently in-flight.
   *
   * Used as a guard to prevent duplicate play calls on the same audio element,
   * which browsers may reject or queue unpredictably.
   */
  readonly isPlayPending: boolean;

  /**
   * Clean up any timers, event listeners, or pending promises.
   *
   * Called when the strategy is no longer needed (e.g., hook unmount, platform
   * change). Must not throw.
   */
  destroy(): void;
}

// ============================================================================
// Playback State
// ============================================================================

/**
 * Reactive playback state exposed to the UI layer.
 */
export interface PlaybackState {
  /** True while a `play()` call is in-flight on the current audio element */
  isPlayPending: boolean;
  /** The ID of the last track a play was attempted for (null on initial load) */
  lastTrackId: string | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Duration (in milliseconds) before an in-flight `play()` call is considered hung.
 *
 * Some Android devices may never resolve a muted `play()` promise. This timeout
 * triggers a fallback: setting `isPlayPending = false` so subsequent user taps
 * can retry playback.
 */
export const HANG_TIMEOUT_MS = 500;
