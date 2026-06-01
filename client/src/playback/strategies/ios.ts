import type { PlaybackStrategy, PlaybackState } from '../types';
import type { Track } from '../../../../shared/schema';
import { createPlaybackStateRef } from './base';

/**
 * Playback strategy for iOS Safari (iPhone/iPad).
 *
 * iOS-specific behaviors:
 * - Muted autoplay is allowed since iOS ~10.
 * - A user gesture is required for unmuted `play()` on a fresh page load.
 * - Once `play()` has been called within a gesture on an element, subsequent
 *   `play()` calls are allowed for approximately 30 seconds.
 * - The `ended` event is NOT a user gesture on iOS, so auto-advance must
 *   go through the muted-then-unmute path.
 *
 * Strategy:
 * - **gesturePlay**: Direct `play()` from the gesture stack. If rejected
 *   (browser policy), falls back to muted play then unmutes.
 * - **nonGesturePlay**: Always plays muted first (the only reliable
 *   non-gesture path on iOS), then unmutes once playback begins.
 * - `audio.load()` is avoided for consistency across all strategies,
 *   though iOS does permit it.
 */
export class iOSStrategy implements PlaybackStrategy {
  /** Reflects whether a play() call is currently in-flight */
  private _isPlayPending = false;

  /** Internal mutable state ref for isPlayPending and lastTrackId tracking */
  private _state: { current: PlaybackState } = createPlaybackStateRef();

  get isPlayPending(): boolean {
    return this._isPlayPending;
  }

  /**
   * Play a track from a user-initiated gesture (click, touch, keydown).
   *
   * iOS permits `audio.play()` within the gesture stack. On the rare
   * rejection (e.g., policy change, cross-origin), falls back to muted
   * play then restores the original mute state.
   */
  async gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current = { isPlayPending: true, lastTrackId: track.id };

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
      }
    } finally {
      this._isPlayPending = false;
      this._state.current = { isPlayPending: false, lastTrackId: track.id };
    }
  }

  /**
   * Play a track without a user gesture (e.g., auto-advance from `ended`).
   *
   * iOS blocks unmuted `play()` outside a gesture context. The reliable
   * workaround is to mute the element, call `play()`, then restore the
   * original mute state once playback starts.
   *
   * NOTE: Unmuting is done here in the strategy directly. The `playing`
   * event listener in usePlayback only calls setIsBuffering(false) — it
   * does NOT unmute. This is the sole unmute path.
   *
   * If the muted `play()` call itself is rejected, we fall back to a
   * `canplay` listener and retry — the same recovery used by AndroidStrategy.
   */
  async nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current = { isPlayPending: true, lastTrackId: track.id };

    audio.src = track.audioUrl;
    const wasMuted = audio.muted;
    audio.muted = true;

    try {
      await audio.play();
      audio.muted = wasMuted;
    } catch {
      audio.muted = wasMuted;

      // Fallback: wait for canplay then retry with muted play (Bug B fix)
      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          audio.muted = true;
          audio.play()
            .then(() => { audio.muted = wasMuted; resolve(); })
            .catch(() => resolve());
        };
        audio.addEventListener('canplay', onCanPlay, { once: true });
      });
    } finally {
      this._isPlayPending = false;
      this._state.current = { isPlayPending: false, lastTrackId: track.id };
    }
  }

  /**
   * Pause the audio element.
   */
  pause(audio: HTMLAudioElement): void {
    audio.pause();
  }

  /**
   * Clean up strategy resources.
   *
   * iOS strategy uses no timers, intervals, or external listeners,
   * so this is a no-op.
   */
  destroy(): void {
    // No timers or listeners to clean up for iOS strategy
  }
}
