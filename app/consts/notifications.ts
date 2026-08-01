// Android channel + iOS-compatible category identifiers for the playback notification.
export const PLAYBACK_CHANNEL_ID = 'playback-controls';
export const PLAYBACK_CATEGORY_ID = 'playback';

// Action identifiers used by the playback notification's category and response handling.
export enum PlaybackAction {
  TOGGLE = 'toggle',
  SKIP_BACK = 'skip-back',
  SKIP_FORWARD = 'skip-forward',
}
