import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookProgress } from '@consts/types';

const KEYS = {
  BASE_FOLDER: '@vellum/baseFolder',
  BOOK_PROGRESS: '@vellum/bookProgress',
  COVER_FOCUS: '@vellum/coverFocus',
};

/* ---- In-memory cache to avoid constant disk reads ---- */
let progressCache: Record<string, BookProgress> | null = null;
let isSaving = false;
const pendingUpdates: Record<string, BookProgress> = {};

async function loadProgressCache(): Promise<void> {
  if (progressCache !== null) return;
  const raw = await AsyncStorage.getItem(KEYS.BOOK_PROGRESS);
  if (!raw) {
    progressCache = {};
  } else {
    try {
      progressCache = JSON.parse(raw);
      if (typeof progressCache !== 'object' || progressCache === null) {
        progressCache = {};
      }
    } catch {
      progressCache = {};
    }
  }
}

async function flushProgress(): Promise<void> {
  // If already saving, just mark that we need to save again
  if (isSaving) {
    return;
  }

  isSaving = true;
  try {
    // Keep flushing until no pending updates
    while (Object.keys(pendingUpdates).length > 0) {
      const updates = { ...pendingUpdates };
      Object.keys(updates).forEach((key) => delete pendingUpdates[key]);

      if (progressCache === null) {
        await loadProgressCache();
      }

      // Apply all pending updates
      Object.assign(progressCache, updates);

      // Write to storage
      const json = JSON.stringify(progressCache);
      await AsyncStorage.setItem(KEYS.BOOK_PROGRESS, json);
    }
  } finally {
    isSaving = false;
  }
}

export async function getBaseFolder(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.BASE_FOLDER);
}

export async function setBaseFolder(uri: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.BASE_FOLDER, uri);
}

export async function getBookProgress(bookId: string): Promise<BookProgress | null> {
  if (progressCache === null) {
    await loadProgressCache();
  }
  return progressCache![bookId] || null;
}

export async function setBookProgress(bookId: string, progress: BookProgress): Promise<void> {
  if (progressCache === null) {
    await loadProgressCache();
  }
  
  // Queue the update
  pendingUpdates[bookId] = progress;
  
  // Start flush if not already running
  if (!isSaving) {
    // Don't await here - let it run in background
    flushProgress().catch((err) => {
      console.error('Failed to save book progress:', err);
    });
  }
}

export async function getAllProgress(): Promise<Record<string, BookProgress>> {
  if (progressCache === null) {
    await loadProgressCache();
  }
  return { ...progressCache! };
}

/* Cover focus (vertical crop position, 0–100, default 50 = centered) */

export async function getCoverFocusY(bookId: string): Promise<number> {
  const all = await getAllCoverFocus();
  return all[bookId] ?? 50;
}

export async function setCoverFocusY(bookId: string, focusY: number): Promise<void> {
  const all = await getAllCoverFocus();
  all[bookId] = focusY;
  await AsyncStorage.setItem(KEYS.COVER_FOCUS, JSON.stringify(all));
}

export async function getAllCoverFocus(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEYS.COVER_FOCUS);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
