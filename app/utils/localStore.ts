/**
 * Synchronous MMKV persistence layer (a single JSI-backed instance) for app settings and library
 * data. Reads/writes are synchronous, so every accessor can be awaited-free; progress reads are
 * memoized in memory. All keys live in @consts/storage.
 */
import { createMMKV } from 'react-native-mmkv';

import type { BookProgress } from '@type/LibraryTypes';
import { BASE_FOLDER_KEY, BOOK_PROGRESS_KEY, COVER_FOCUS_KEY } from '@consts/storage';

const storage = createMMKV();

/* ---- Base folder ---- */

/** Returns the stored audiobook base folder URI, or null when none has been selected yet. */
export function getBaseFolder(): string | null {
  return storage.getString(BASE_FOLDER_KEY) ?? null;
}

/** Persists the audiobook base folder URI. */
export function saveBaseFolder(uri: string): void {
  storage.set(BASE_FOLDER_KEY, uri);
}

/* ---- Book progress ---- */

let progressCache: Record<string, BookProgress> | null = null;

/** Reads and parses the whole progress map from MMKV, tolerating missing/corrupt JSON. */
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

/** Returns the in-memory progress map, lazily loading it from MMKV on first use. */
function getProgressCache(): Record<string, BookProgress> {
  if (progressCache === null) {
    progressCache = readProgress();
  }
  return progressCache;
}

/** Returns the persisted progress for a single book, or null when none is stored. */
export function getBookProgress(bookId: string): BookProgress | null {
  return getProgressCache()[bookId] ?? null;
}

/** Returns a copy of the whole persisted progress map. */
export function getAllProgress(): Record<string, BookProgress> {
  return { ...getProgressCache() };
}

/** Writes a book's progress into the map and persists the whole map to MMKV. */
export function saveBookProgress(bookId: string, progress: BookProgress): void {
  const cache = getProgressCache();
  cache[bookId] = progress;
  storage.set(BOOK_PROGRESS_KEY, JSON.stringify(cache));
}

/* ---- Cover focus (vertical crop position, 0-100, default 50 = centered) ---- */

/** Returns the whole map of bookId → vertical cover-focus (0–100). */
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

/** Persists a book's vertical cover-focus value (0–100). */
export function saveCoverFocusY(bookId: string, focusY: number): void {
  const all = getAllCoverFocus();
  all[bookId] = focusY;
  storage.set(COVER_FOCUS_KEY, JSON.stringify(all));
}
