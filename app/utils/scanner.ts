import { Directory, File } from 'expo-file-system';

import { Audiobook, AudioChapter } from '@type/LibraryTypes';
import { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS } from '@consts/files';
import { DIGITS_ONLY_REGEX, NATURAL_SPLIT_REGEX, TITLE_AUTHOR_REGEX } from '@consts/regexes';

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0) return '';
  return filename.substring(lastDot).toLowerCase();
}

function isAudioFile(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(getExtension(filename));
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(filename));
}

/**
 * Natural-sort comparator that handles many chapter naming conventions:
 *   1.mp3, 2.mp3, 10.mp3
 *   001.mp3, 002.mp3
 *   1a.mp3, 1b.mp3
 *   Chapter 1.mp3, Chapter 2.mp3
 *   Gaps like 1.mp3 then 3.mp3
 */
export function naturalCompare(a: string, b: string): number {
  const partsA = tokenize(a);
  const partsB = tokenize(b);

  const len = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const pa = partsA[i];
    const pb = partsB[i];

    const aNum = parseInt(pa, 10);
    const bNum = parseInt(pb, 10);

    const aIsNum = !isNaN(aNum) && DIGITS_ONLY_REGEX.test(pa);
    const bIsNum = !isNaN(bNum) && DIGITS_ONLY_REGEX.test(pb);

    if (aIsNum && bIsNum) {
      if (aNum !== bNum) return aNum - bNum;
      if (pa.length !== pb.length) return pa.length - pb.length;
    } else if (aIsNum !== bIsNum) {
      return aIsNum ? -1 : 1;
    } else {
      const cmp = pa.localeCompare(pb, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  return partsA.length - partsB.length;
}

/** Split a filename into alternating text / numeric tokens. */
function tokenize(s: string): string[] {
  return s.match(NATURAL_SPLIT_REGEX) || [s];
}

/**
 * Choose the best cover image from a list of image files.
 * Prefers files named "cover", then "folder", then "front", then first found.
 */
function selectCoverImage(images: { uri: string; name: string }[]): string | null {
  if (images.length === 0) return null;

  const preferredNames = ['cover', 'folder', 'front'];
  for (const pref of preferredNames) {
    const match = images.find((f) => {
      const base = f.name.substring(0, f.name.lastIndexOf('.')).toLowerCase();
      return base === pref;
    });
    if (match) return match.uri;
  }

  return images[0].uri;
}

/**
 * Scan the user-selected base folder for audiobook sub-folders.
 * Each direct child that is a directory is treated as one audiobook.
 */
export async function scanAudiobooks(baseFolderUri: string): Promise<Audiobook[]> {
  try {
    const baseDir = new Directory(baseFolderUri);
    const children = baseDir.list();

    const directories = children.filter((item): item is Directory => item instanceof Directory);

    const books: Audiobook[] = directories.map((dir) => scanSingleBook(dir));

    return books
      .filter((book: Audiobook) => book.chapters.length > 0)
      .sort((a: Audiobook, b: Audiobook) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error('Error scanning audiobooks:', error);
    return [];
  }
}

function scanSingleBook(dir: Directory): Audiobook {
  const chapters: AudioChapter[] = [];
  const images: { uri: string; name: string }[] = [];
  const rawTitle = dir.name;

  // Pattern used in Player.tsx: Title [Author]
  const authorMatch = rawTitle.match(TITLE_AUTHOR_REGEX);
  const title = authorMatch ? authorMatch[1].trim() : rawTitle;
  const author = authorMatch ? authorMatch[2].trim() : 'Unknown Author';

  try {
    const contents = dir.list();

    for (const item of contents) {
      if (item instanceof File) {
        const filename = item.name;
        if (isAudioFile(filename)) {
          chapters.push({ uri: item.uri, filename });
        } else if (isImageFile(filename)) {
          images.push({ uri: item.uri, name: filename });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning book "${rawTitle}":`, error);
  }

  // Sort chapters using natural ordering
  chapters.sort((a, b) => naturalCompare(a.filename, b.filename));

  return {
    id: rawTitle,
    title,
    author,
    folderUri: dir.uri,
    chapters,
    coverUri: selectCoverImage(images),
  };
}
