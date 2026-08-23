/**
 * Artwork helper for system media controls. The native notification center-crops whatever
 * bitmap it receives, so a portrait cover with a custom vertical focus must be physically
 * cropped to a square before being handed over - otherwise the focused region is lost.
 * The math mirrors FocusedCoverImage: the visible window starts at focusY/100 of the
 * vertical overflow.
 */
import { Image } from 'react-native';

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Notification artwork is small; 512px keeps cropping fast and output files light.
const ARTWORK_SIZE = 512;

/** In-memory cache so repeated media-control syncs don't re-crop the same cover. */
const artworkCache = new Map<string, string>();

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Returns a URI suitable for media-control artwork: the original cover when no custom
 * focus applies (centered default or non-portrait image), otherwise a square crop honouring
 * the book's focus, rendered to cache. Falls back to the original cover on any failure.
 */
export async function getNotificationArtworkUri(
  bookId: string,
  coverUri: string,
  focusY: number,
): Promise<string> {
  const cacheKey = `${bookId}|${coverUri}|${focusY}`;
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;

  if (focusY === 50) return coverUri;

  try {
    const { width, height } = await getImageSize(coverUri);
    // Only portrait covers overflow vertically (mirrors FocusedCoverImage's fast path).
    if (height <= width) return coverUri;

    const overflow = height - width;
    const originY = Math.min(Math.max(Math.round((overflow * focusY) / 100), 0), overflow);

    const imageRef = await ImageManipulator.manipulate(coverUri)
      .crop({ originX: 0, originY, width, height: width })
      .resize({ width: ARTWORK_SIZE, height: ARTWORK_SIZE })
      .renderAsync();
    const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    imageRef.release();

    artworkCache.set(cacheKey, result.uri);
    return result.uri;
  } catch (err) {
    console.warn('Failed to crop notification artwork:', err);
    return coverUri;
  }
}
