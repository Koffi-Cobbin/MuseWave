import { HANG_TIMEOUT_MS, type PlaybackState, type PlaybackStrategy } from '../types';
import { createPlaybackStateRef } from './base';
import type { Track } from '../../../../shared/schema';

/**
 * Playback strategy for Android Chrome.
 *
 * # Android-Specific Behavior
 *
 * ## NEVER call audio.load()
 * Calling `audio.load()` aborts the in-flight resource selection algorithm queued by
 * setting `audio.src`. This causes the `play()` Promise to hang indefinitely.
 *
 * ## Muted Autoplay
 * `audio.muted = true; audio.play()` is universally allowed on Android Chrome.
 * However, the `play()` Promise can still hang even with muted autoplay due to a
 * known Chrome bug. A 500ms timeout detects the hang and falls back to a
 * `canplay`-based play.
 *
 * ## Gesture Context
 * Direct `play()` (non-muted) outside a user gesture is always blocked. When called
 * from a gesture context, the strategy tries direct play first, then falls back through
 * muted play → `canplay` play.
 *
 * ## Hang Detection (non-gesture path)
 * A `_hangTimer` (500ms) detects when a muted `play()` Promise never settles.
 * On timeout, the strategy switches to a `canplay` listener that fires muted `play()`
 * once the audio data is ready.
 */
export class AndroidStrategy implements PlaybackStrategy {
  /** True while a `play()` call is in-flight */
  private _isPlayPending = false;

  /** External-facing playback state ref (observed by the hook) */
  private _state: { current: PlaybackState };

  /**
   * Timer that fires when a muted `play()` Promise hangs.
   * Triggers `canplay`-based fallback on timeout.
   */
  private _hangTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this._state = createPlaybackStateRef();
  }

  // --------------------------------------------------------------------------
  // PlaybackStrategy implementation
  // --------------------------------------------------------------------------

  get isPlayPending(): boolean {
    return this._isPlayPending;
  }

  /**
   * Play a track from a user gesture context (click, touch, keyboard).
   *
   * Three-layer fallback chain:
   * 1. Direct `play()` (works inside gesture)
   * 2. Muted `play()` (if gesture context is lost)
   * 3. `canplay` → muted `play()` (last resort)
   */
  async gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current.isPlayPending = true;
    this._state.current.lastTrackId = track.id;

    // CRITICAL: Set src first, then play. Never call audio.load().
    audio.src = track.audioUrl;

    try {
      await audio.play();
    } catch {
      // Gesture play rejected — fall back to muted play
      const wasMuted = audio.muted;
      audio.muted = true;

      try {
        await audio.play();
        audio.muted = wasMuted;
      } catch {
        audio.muted = wasMuted;

        // Final fallback: wait for canplay, then muted play
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audio.muted = true;
            audio.play()
              .then(() => {
                audio.muted = wasMuted;
                resolve();
              })
              .catch(() => resolve());
          };
          audio.addEventListener('canplay', onCanPlay, { once: true });
        });
      }
    } finally {
      this._isPlayPending = false;
      this._state.current.isPlayPending = false;
    }
  }

  /**
   * Play a track without a user gesture (e.g., auto-advance from `ended` event).
   *
   * Android requires muted play outside gesture. A 500ms hang timer detects
   * when the muted `play()` Promise never settles (Chrome bug) and falls back
   * to a `canplay` listener.
   */
  async nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current.isPlayPending = true;
    this._state.current.lastTrackId = track.id;

    // ── Reset audio element after ended event (Android Chrome quirk) ─────
    //
    // On Android Chrome, after the `ended` event fires, the audio element
    // can remain in a stale state where changing `audio.src` doesn't
    // properly reinitialize playback.  Setting src to empty string forces
    // the element to `HAVE_NOTHING` before loading the new track.
    //
    // This is safe because we haven't called play() for the new track yet
    // (the Android hang bug only occurs when load() is called after play()).

    audio.src = '';

    audio.src = track.audioUrl;

    const wasMuted = audio.muted;
    audio.muted = true;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      // Hang detection: Android Chrome can hang on play() even when muted
      const timer = setTimeout(() => {
        // The play() call didn't settle within HANG_TIMEOUT_MS —
        // fall back to waiting for canplay, then muted play
        const onCanPlay = () => {
          audio.muted = true;
          audio.play()
            .then(() => {
              audio.muted = wasMuted;
              this._isPlayPending = false;
              this._state.current.isPlayPending = false;
            })
            .catch(() => {
              audio.muted = wasMuted;
              this._isPlayPending = false;
              this._state.current.isPlayPending = false;
            });
        };
        audio.addEventListener('canplay', onCanPlay, { once: true });
      }, HANG_TIMEOUT_MS);
      this._hangTimer = timer;

      try {
        await playPromise;
        clearTimeout(timer);
        this._hangTimer = null;
        audio.muted = wasMuted;
      } catch {
        clearTimeout(timer);
        this._hangTimer = null;
        audio.muted = wasMuted;

        // Fall back to canplay-based play
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audio.muted = true;
            audio.play()
              .then(() => {
                audio.muted = wasMuted;
                resolve();
              })
              .catch(() => resolve());
          };
          audio.addEventListener('canplay', onCanPlay, { once: true });
        });
      }
    }

    this._isPlayPending = false;
    this._state.current.isPlayPending = false;
  }

  pause(audio: HTMLAudioElement): void {
    audio.pause();
  }

  destroy(): void {
    if (this._hangTimer !== null) {
      clearTimeout(this._hangTimer);
      this._hangTimer = null;
    }
  }
}
