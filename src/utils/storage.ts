import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookProgress } from '@consts/types';

const KEYS = {
  BASE_FOLDER: '@vellum/baseFolder',
  BOOK_PROGRESS: '@vellum/bookProgress',
  COVER_FOCUS: '@vellum/coverFocus',
};

export async function getBaseFolder(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.BASE_FOLDER);
}

export async function setBaseFolder(uri: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.BASE_FOLDER, uri);
}

export async function getBookProgress(bookId: string): Promise<BookProgress | null> {
  const all = await getAllProgress();
  return all[bookId] || null;
}

export async function setBookProgress(bookId: string, progress: BookProgress): Promise<void> {
  const all = await getAllProgress();
  all[bookId] = progress;
  await AsyncStorage.setItem(KEYS.BOOK_PROGRESS, JSON.stringify(all));
}

export async function getAllProgress(): Promise<Record<string, BookProgress>> {
  const raw = await AsyncStorage.getItem(KEYS.BOOK_PROGRESS);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
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
