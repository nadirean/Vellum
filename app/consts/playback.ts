// Selectable playback rates offered by the rate modal.
export const RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

// How many chapter durations are measured concurrently during the initial scan.
export const CHAPTER_SCAN_BATCH = 3;
// Seconds skipped by the notification rewind/forward actions (the player controls use 60s).
export const SKIP_MS = 15000;
// How often in-progress playback is persisted to MMKV.
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
// Ceiling for measuring a single chapter's duration with a temp player.
export const DURATION_MEASURE_TIMEOUT_MS = 10000;
// Polling interval when waiting for the native player to report itself loaded.
export const POLL_INTERVAL_MS = 50;
// Safety ceiling for the player-load wait.
export const WAIT_FOR_LOAD_TIMEOUT_MS = 5000;
// Safety ceiling for a single native seekTo call (seeking a paused player can hang on Android).
export const SEEK_TIMEOUT_MS = 3000;
