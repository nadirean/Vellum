import AsyncStorage from '@react-native-async-storage/async-storage';

import { BookProgress } from '@consts/types';

const KEYS = {
  BASE_FOLDER: '@vellum/baseFolder',
  BOOK_PROGRESS: '@vellum/bookProgress',
  COVER_FOCUS: '@vellum/coverFocus',
};

/* ---- In-memory cache to avoid constant disk reads ---- */
let progressCache: Record<string, BookProgress> | null = null;
let nextProgressVersion = 0;
let flushPromise: Promise<void> | null = null;
const pendingProgressVersions: Record<string, number> = {};
const progressWaiters: Record<
  string,
  Array<{
    version: number;
    resolve: () => void;
    reject: (error: unknown) => void;
  }>
> = {};

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

function hasPendingProgressWrites(): boolean {
  return Object.keys(pendingProgressVersions).length > 0;
}

function addProgressWaiter(bookId: string, version: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!progressWaiters[bookId]) {
      progressWaiters[bookId] = [];
    }

    progressWaiters[bookId].push({ version, resolve, reject });
  });
}

function resolveProgressWaiters(bookId: string, persistedVersion: number): void {
  const waiters = progressWaiters[bookId];
  if (!waiters?.length) return;

  const remaining = waiters.filter((waiter) => {
    if (waiter.version <= persistedVersion) {
      waiter.resolve();
      return false;
    }
    return true;
  });

  if (remaining.length > 0) {
    progressWaiters[bookId] = remaining;
  } else {
    delete progressWaiters[bookId];
  }
}

function rejectProgressWaiters(bookId: string, failedVersion: number, error: unknown): void {
  const waiters = progressWaiters[bookId];
  if (!waiters?.length) return;

  const remaining = waiters.filter((waiter) => {
    if (waiter.version <= failedVersion) {
      waiter.reject(error);
      return false;
    }
    return true;
  });

  if (remaining.length > 0) {
    progressWaiters[bookId] = remaining;
  } else {
    delete progressWaiters[bookId];
  }
}

async function runProgressFlush(): Promise<void> {
  while (hasPendingProgressWrites()) {
    const snapshotVersions = { ...pendingProgressVersions };
    const payload = JSON.stringify(progressCache ?? {});

    try {
      await AsyncStorage.setItem(KEYS.BOOK_PROGRESS, payload);
    } catch (error) {
      for (const [bookId, version] of Object.entries(snapshotVersions)) {
        rejectProgressWaiters(bookId, version, error);
      }
      throw error;
    }

    for (const [bookId, version] of Object.entries(snapshotVersions)) {
      if (pendingProgressVersions[bookId] === version) {
        delete pendingProgressVersions[bookId];
      }

      resolveProgressWaiters(bookId, version);
    }
  }
}

export async function flushBookProgress(): Promise<void> {
  if (progressCache === null) {
    await loadProgressCache();
  }

  while (hasPendingProgressWrites()) {
    const activeFlush = flushPromise ?? (flushPromise = runProgressFlush());

    try {
      await activeFlush;
    } finally {
      if (flushPromise === activeFlush) {
        flushPromise = null;
      }
    }
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

  const version = ++nextProgressVersion;
  progressCache![bookId] = progress;
  pendingProgressVersions[bookId] = version;

  const writePromise = addProgressWaiter(bookId, version);

  void flushBookProgress().catch(() => {
    // The returned promise for this specific write is rejected by rejectProgressWaiters.
  });

  await writePromise;
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
