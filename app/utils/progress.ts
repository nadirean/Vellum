import { Audiobook } from '@type/LibraryTypes';
import { getAllProgress } from '@utils/localStore';

/**
 * Computes each book's overall playback progress (0-100) from persisted progress.
 * Books without measurable progress are omitted from the map.
 */
export function computeProgressMap(bookList: Audiobook[]): Record<string, number> {
  const all = getAllProgress();
  const map: Record<string, number> = {};
  for (const b of bookList) {
    const p = all[b.id];
    if (p && p.chapterDurations.length > 0) {
      const total = p.chapterDurations.reduce((s, d) => s + d, 0);
      if (total > 0) {
        const elapsed =
          p.chapterDurations.slice(0, p.currentChapterIndex).reduce((s, d) => s + d, 0) +
          p.positionMs;
        map[b.id] = (elapsed / total) * 100;
      }
    }
  }
  return map;
}
