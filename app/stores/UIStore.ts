import { makeAutoObservable, runInAction } from 'mobx';

import type { LibrarySort, LibrarySortMode } from '@type/LibraryTypes';
import * as LocalStore from '@utils/localStore';

/** Default ordering: most recently played first. */
const DEFAULT_LIBRARY_SORT: LibrarySort = { mode: 'recent', ascending: false };

/**
 * MobX store that manages persisted UI preferences: the per-book cover focus (vertical crop
 * 0-100, default 50) and the library sort order. Both are hydrated once during bootstrap and
 * written through to MMKV synchronously on every change.
 */
export class UIStore {
  coverFocusByBook: Record<string, number> = {};
  librarySort: LibrarySort = { ...DEFAULT_LIBRARY_SORT };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** Hydrate the cover focus map and sort preference from persisted storage on app start. */
  async bootstrap() {
    try {
      const all = LocalStore.getAllCoverFocus();
      const sort = LocalStore.getLibrarySort();
      runInAction(() => {
        this.coverFocusByBook = all;
        if (sort) {
          this.librarySort = sort;
        }
      });
    } catch (err) {
      console.warn('Failed to bootstrap UI preferences', err);
    }
  }

  /** Vertical focus (0-100) for a book, defaulting to 50 (centered). */
  getCoverFocusY(bookId: string): number {
    return this.coverFocusByBook[bookId] ?? 50;
  }

  /** Applies a new focus immediately and persists it synchronously. */
  setCoverFocusY(bookId: string, focusY: number) {
    this.coverFocusByBook = { ...this.coverFocusByBook, [bookId]: focusY };
    LocalStore.saveCoverFocusY(bookId, focusY);
  }

  /** Selects the library sort mode, keeping the current direction, and persists it. */
  setLibrarySort(mode: LibrarySortMode) {
    this.librarySort = { mode, ascending: this.librarySort.ascending };
    LocalStore.saveLibrarySort(this.librarySort);
  }

  /** Flips the current library sort direction and persists it. */
  flipLibrarySortDirection() {
    this.librarySort = { ...this.librarySort, ascending: !this.librarySort.ascending };
    LocalStore.saveLibrarySort(this.librarySort);
  }
}
