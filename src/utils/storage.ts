import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookProgress } from '@consts/types';

const KEYS = {
  BASE_FOLDER: '@vellum/baseFolder',
  BOOK_PROGRESS: '@vellum/bookProgress',
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
