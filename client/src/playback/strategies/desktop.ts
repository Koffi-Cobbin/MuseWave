import type { PlaybackStrategy, PlaybackState } from '../types';
import type { Track } from '../../../../shared/schema';
import { createPlaybackStateRef } from './base';

/**
 * Playback strategy for desktop browsers (Chrome, Firefox, Edge).
 *
 * Desktop-specific behaviors:
 * - Relaxed autoplay policy after first user interaction.
 * - `audio.play()` is generally allowed from gesture-initiated handlers.
 * - Non-gesture play (e.g., auto-advance, playTrack from React effects)
 *   uses the muted-trick (mute → play → unmute) because `audio.play()`
 *   without a user gesture is blocked by autoplay policy on modern browsers.
 * - `isPlayPending` guards against double-play when a gesture handler
 *   calls gesturePlay() and a React effect subsequently calls nonGesturePlay().
 *
 * Strategy:
 * - **gesturePlay**: Direct `src` assignment + `play()`. Silent catch
 *   for edge-case rejections (user may retry via UI).
 * - **nonGesturePlay**: Muted play → unmute once playback starts.
 *   Works outside gesture contexts (React effects, event callbacks).
 */
export class DesktopStrategy implements PlaybackStrategy {
  /** True while a `play()` call is in-flight (guards against double-play) */
  private _isPlayPending = false;

  /** Internal mutable state ref for isPlayPending tracking */
  private _state: { current: PlaybackState };

  constructor() {
    this._state = createPlaybackStateRef();
  }

  get isPlayPending(): boolean {
    return this._isPlayPending;
  }

  /**
   * Play a track from a user-initiated gesture (click, touch, keydown).
   *
   * Desktop browsers reliably support `audio.play()` inside gesture
   * callbacks. On the rare rejection, the error is silently caught;
   * the user can retry via UI.
   */
  async gesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current.isPlayPending = true;

    audio.src = track.audioUrl;
    try {
      await audio.play();
    } catch {
      // Gesture play failed — silent; user can retry
    } finally {
      this._isPlayPending = false;
      this._state.current.isPlayPending = false;
    }
  }

  /**
   * Play a track without a user gesture (e.g., auto-advance, React effect).
   *
   * Modern desktop browsers block unmuted `audio.play()` outside a user
   * gesture. The reliable workaround is to mute the element, call `play()`,
   * then unmute once playback starts.
   */
  async nonGesturePlay(track: Track, audio: HTMLAudioElement): Promise<void> {
    this._isPlayPending = true;
    this._state.current.isPlayPending = true;

    audio.src = track.audioUrl;
    const wasMuted = audio.muted;
    audio.muted = true;

    try {
      await audio.play();
      audio.muted = wasMuted;
    } catch {
      audio.muted = wasMuted;
    } finally {
      this._isPlayPending = false;
      this._state.current.isPlayPending = false;
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
   * Desktop strategy uses no timers, intervals, or external listeners,
   * so this is a no-op.
   */
  destroy(): void {
    // Nothing to clean up for desktop strategy
  }
}
