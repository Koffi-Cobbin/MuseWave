Track is not playing when clicked to play on iPhone

Root Cause Analysis
Issue: When tapping a track on iPhone, audio.play() is called inside a React useEffect — after the user's touch event handler has completed. iOS Safari's autoplay policy requires playback to be initiated synchronously within a user gesture handler. By the time the effect runs, iOS blocks the play() call (rejected promise caught by .catch(() => {}), silently failing).
Contributing factor: The <audio> element is missing the playsinline attribute, required by iOS for inline audio playback.


Explore codebase structure and understand playback implementation
Identify root cause of iPhone playback issue
Fix: Add playsinline to audio element in PlayerBar.tsx
Fix: Add registerAudioElement + playTrack/playQueue to player-context.tsx
Fix: Register audio ref from PlayerBar with context
Fix: Update page handlers to use playTrack/playQueue (home, discover, artist, tracks, playlist-detail, downloads)