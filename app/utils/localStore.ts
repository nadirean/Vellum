import { createMMKV } from 'react-native-mmkv';

import type { BookProgress } from '@type/LibraryTypes';
import { BASE_FOLDER_KEY, BOOK_PROGRESS_KEY, COVER_FOCUS_KEY } from '@consts/storage';

const storage = createMMKV();

/* ---- Base folder ---- */

export function getBaseFolder(): string | null {
  return storage.getString(BASE_FOLDER_KEY) ?? null;
}

export function saveBaseFolder(uri: string): void {
  storage.set(BASE_FOLDER_KEY, uri);
}

/* ---- Book progress ---- */

let progressCache: Record<string, BookProgress> | null = null;

function readProgress(): Record<string, BookProgress> {
  const raw = storage.getString(BOOK_PROGRESS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, BookProgress>)
      : {};
  } catch {
    return {};
  }
}

function getProgressCache(): Record<string, BookProgress> {
  if (progressCache === null) {
    progressCache = readProgress();
  }
  return progressCache;
}

export function getBookProgress(bookId: string): BookProgress | null {
  return getProgressCache()[bookId] ?? null;
}

export function getAllProgress(): Record<string, BookProgress> {
  return { ...getProgressCache() };
}

export function saveBookProgress(bookId: string, progress: BookProgress): void {
  const cache = getProgressCache();
  cache[bookId] = progress;
  storage.set(BOOK_PROGRESS_KEY, JSON.stringify(cache));
}

/* ---- Cover focus (vertical crop position, 0-100, default 50 = centered) ---- */

export function getAllCoverFocus(): Record<string, number> {
  const raw = storage.getString(COVER_FOCUS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveCoverFocusY(bookId: string, focusY: number): void {
  const all = getAllCoverFocus();
  all[bookId] = focusY;
  storage.set(COVER_FOCUS_KEY, JSON.stringify(all));
}
