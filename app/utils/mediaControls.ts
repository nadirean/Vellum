/**
 * Wraps expo-media-control to provide system-level media controls (Android notification,
 * lock screen, Control Center) with artwork, playback state, and remote command handling.
 *
 * Replaces the old expo-notifications sticky notification approach.
 */
import { Command, MediaControl, PlaybackState } from 'expo-media-control';

/** Enable the system media controls once during app startup. */
export async function setupMediaControls(): Promise<void> {
  await MediaControl.enableMediaControls({
    capabilities: [
      Command.PLAY,
      Command.PAUSE,
      Command.STOP,
      Command.NEXT_TRACK,
      Command.PREVIOUS_TRACK,
      Command.SKIP_FORWARD,
      Command.SKIP_BACKWARD,
      Command.SEEK,
    ],
    compactCapabilities: [Command.PREVIOUS_TRACK, Command.PLAY, Command.NEXT_TRACK],
    notification: {
      color: '#427A43',
    },
    android: {
      skipInterval: 15,
    },
  });
}

/** Update the metadata displayed in system controls (title, artist, artwork, duration). */
export async function updateMetadata(book: {
  title: string;
  author: string;
  coverUri?: string | null;
  durationMs?: number;
}): Promise<void> {
  await MediaControl.updateMetadata({
    title: book.title,
    artist: book.author,
    artwork: book.coverUri ? { uri: book.coverUri } : undefined,
    duration: book.durationMs != null ? book.durationMs / 1000 : undefined,
  });
}

/** Push the current playback state (playing/paused, position, rate) to system controls. */
export async function updatePlaybackState(
  isPlaying: boolean,
  positionMs: number,
  rate = 1.0,
): Promise<void> {
  await MediaControl.updatePlaybackState(
    isPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED,
    positionMs / 1000,
    isPlaying ? rate : 0.0,
  );
}

/** Remove the media controls notification entirely. */
export async function dismissMediaControls(): Promise<void> {
  await MediaControl.disableMediaControls();
}

/** Register a listener for media control commands from system UI. Returns a removal function. */
export function addListener(
  callback: (event: { command: Command; data?: Record<string, unknown> }) => void,
): () => void {
  return MediaControl.addListener(callback as never);
}

/** Remove all registered media control listeners. */
export async function removeAllListeners(): Promise<void> {
  await MediaControl.removeAllListeners();
}
