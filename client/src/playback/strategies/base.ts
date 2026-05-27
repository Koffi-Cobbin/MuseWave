import type { PlaybackState } from '../types';

/**
 * Creates a mutable ref object holding the internal playback state.
 *
 * Strategies use this ref to track `isPlayPending` and `lastTrackId` without
 * depending on React's `useRef`. The returned object is stable (the same
 * `{ current }` wrapper persists) while `current` is swapped as state changes.
 *
 * This is a pure JS factory: zero React dependencies, zero side effects.
 *
 * @returns An object with a `current` property initialized to a default
 *          `PlaybackState` where no play is pending and no track is set.
 */
export function createPlaybackStateRef(): { current: PlaybackState } {
  return {
    current: {
      isPlayPending: false,
      lastTrackId: null,
    },
  };
}
