import { AudioChapter } from '@type/LibraryTypes';
import { EXTENSION_REGEX } from '@consts/regexes';

/** Strips the file extension from a chapter's filename for display. */
export function getChapterName(chapter: AudioChapter): string {
  return chapter.filename.replace(EXTENSION_REGEX, '');
}
