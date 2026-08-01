import { makeAutoObservable, runInAction } from 'mobx';

import * as LocalStore from '@utils/localStore';

/**
 * MobX store that manages the per-book cover focus (vertical crop 0-100, default 50).
 * Focus values are persisted to MMKV and hydrated once during bootstrap.
 */
export class UIStore {
  coverFocusByBook: Record<string, number> = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** Hydrate the cover focus map from persisted storage on app start. */
  async bootstrap() {
    try {
      const all = LocalStore.getAllCoverFocus();
      runInAction(() => {
        this.coverFocusByBook = all;
      });
    } catch (err) {
      console.warn('Failed to bootstrap cover focus', err);
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
}
