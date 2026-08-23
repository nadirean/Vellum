/**
 * Library list sorting. 'recent' orders by the persisted last-played timestamp (books never
 * played sink to the bottom, alphabetical among themselves); 'title' and 'author' use natural
 * comparison so numbered titles order sensibly. The direction flag flips whichever mode is
 * active. Sorting always returns a new array and never mutates the scanned book list.
 */
import { Audiobook, LibrarySort } from '@type/LibraryTypes';
import { naturalCompare } from '@utils/scanner';

/** Map of bookId → last-played timestamp (0 when never played). */
export type LastPlayedMap = Record<string, number>;

function compareByMode(
  a: Audiobook,
  b: Audiobook,
  lastPlayed: LastPlayedMap,
  mode: LibrarySort['mode'],
): number {
  if (mode === 'recent') {
    const diff = (lastPlayed[a.id] ?? 0) - (lastPlayed[b.id] ?? 0);
    return diff !== 0 ? diff : naturalCompare(a.title, b.title);
  }
  if (mode === 'author') {
    const cmp = naturalCompare(a.author, b.author);
    return cmp !== 0 ? cmp : naturalCompare(a.title, b.title);
  }
  const cmp = naturalCompare(a.title, b.title);
  return cmp !== 0 ? cmp : naturalCompare(a.author, b.author);
}

/** Returns the books ordered by the given sort preference. */
export function sortAudiobooks(
  books: Audiobook[],
  lastPlayed: LastPlayedMap,
  sort: LibrarySort,
): Audiobook[] {
  const sign = sort.ascending ? 1 : -1;
  return [...books].sort((a, b) => sign * compareByMode(a, b, lastPlayed, sort.mode));
}
