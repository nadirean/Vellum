import { AppState } from 'react-native';

import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { IReactionDisposer, makeAutoObservable, reaction, runInAction } from 'mobx';

import { Audiobook } from '@type/LibraryTypes';
import * as NotificationUtils from '@utils/notifications';
import * as Storage from '@utils/storage';
import { PlaybackAction } from '@consts/notifications';
import {
  CHAPTER_SCAN_BATCH,
  DURATION_MEASURE_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  PROGRESS_SAVE_INTERVAL_MS,
  SKIP_MS,
  WAIT_FOR_LOAD_TIMEOUT_MS,
} from '@consts/playback';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Create a temporary player to measure duration then release it. */
async function measureDuration(uri: string): Promise<number> {
  return new Promise<number>((resolve) => {
    let resolved = false;
    const tmpPlayer = createAudioPlayer({ uri });

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          tmpPlayer.remove();
        } catch {
          /* ignore */
        }
      }
    };

    const sub = tmpPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.isLoaded && status.duration > 0 && !resolved) {
        resolved = true;
        const durMs = Math.round(status.duration * 1000);
        sub.remove();
        try {
          tmpPlayer.remove();
        } catch {
          /* ignore */
        }
        resolve(durMs);
      }
    });

    // Safety timeout – if we can't determine duration in 10s, return 0
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        sub.remove();
        resolve(0);
      }
    }, DURATION_MEASURE_TIMEOUT_MS);
  });
}

async function scanChapterDurations(book: Audiobook): Promise<number[]> {
  const durations: number[] = new Array(book.chapters.length).fill(0);

  for (let i = 0; i < book.chapters.length; i += CHAPTER_SCAN_BATCH) {
    const batch = book.chapters.slice(i, i + CHAPTER_SCAN_BATCH);
    const results = await Promise.all(batch.map((ch) => measureDuration(ch.uri)));
    results.forEach((d: number, j: number) => {
      durations[i + j] = d;
    });
  }
  return durations;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export class PlayerStore {
  // Observables
  currentBook: Audiobook | null = null;
  currentChapterIndex = 0;
  isPlaying = false;
  positionMs = 0;
  durationMs = 0;
  rate = 1.0;
  chapterDurations: number[] = [];
  isLoading = false;

  // Non-observable internals (stable refs for native player and listeners)
  player: AudioPlayer | null = null;
  listener: { remove: () => void } | null = null;
  loadingChapter = false;
  saveTimer: ReturnType<typeof setInterval> | null = null;
  persistReaction: IReactionDisposer | null = null;
  notificationReaction: IReactionDisposer | null = null;
  appStateSub: { remove: () => void } | null = null;
  notificationResponseSub: Notifications.EventSubscription | null = null;

  constructor() {
    makeAutoObservable(
      this,
      {
        player: false,
        listener: false,
        loadingChapter: false,
        saveTimer: false,
        persistReaction: false,
        notificationReaction: false,
        appStateSub: false,
        notificationResponseSub: false,
      },
      { autoBind: true },
    );
  }

  /* ---- derived values ---- */

  get totalBookDurationMs(): number {
    return this.chapterDurations.reduce((s, d) => s + d, 0);
  }

  get bookPositionMs(): number {
    const prev = this.chapterDurations
      .slice(0, this.currentChapterIndex)
      .reduce((s, d) => s + d, 0);
    return prev + this.positionMs;
  }

  get bookProgress(): number {
    return this.totalBookDurationMs > 0
      ? (this.bookPositionMs / this.totalBookDurationMs) * 100
      : 0;
  }

  get timeLeftMs(): number {
    return Math.max(0, this.totalBookDurationMs - this.bookPositionMs);
  }

  get timeLeftWithTempoMs(): number {
    return this.rate > 0 ? this.timeLeftMs / this.rate : this.timeLeftMs;
  }

  /* ---- setup / dispose ---- */

  setup() {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });

    void NotificationUtils.setupNotifications().catch((error) => {
      console.error('Failed to set up playback notifications:', error);
    });

    this.notificationResponseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const actionId = response.actionIdentifier;
        if (actionId === PlaybackAction.TOGGLE) {
          this.togglePlayPause();
        } else if (actionId === PlaybackAction.SKIP_BACK) {
          void this.seekRelative(-SKIP_MS);
        } else if (actionId === PlaybackAction.SKIP_FORWARD) {
          void this.seekRelative(SKIP_MS);
        }
      },
    );

    // Persist immediately when playback pauses and every 5s while a book is loaded
    this.persistReaction = reaction(
      () => (this.currentBook && !this.isLoading ? this.isPlaying : null),
      (isPlaying) => {
        if (isPlaying === false && this.currentBook) {
          this.persistCurrentProgress().catch((err) => {
            console.error('Failed to persist progress for book:', this.currentBook?.id, err);
          });
        }
      },
    );
    this.saveTimer = setInterval(() => {
      if (this.currentBook && !this.isLoading) {
        this.persistCurrentProgress().catch((err) => {
          console.error('Failed to persist progress for book:', this.currentBook?.id, err);
        });
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    this.appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        this.persistCurrentProgress().catch((err) => {
          console.error('Failed to persist progress while app was backgrounding:', err);
        });
      }
    });

    // Keep the playback notification in sync with player state
    this.notificationReaction = reaction(
      () =>
        this.currentBook
          ? [
              this.currentBook.id,
              this.isPlaying,
              Math.floor(this.bookProgress),
              this.isLoading,
            ].join('|')
          : null,
      () => {
        const book = this.currentBook;
        if (!book) {
          void NotificationUtils.dismissPlaybackNotification().catch((error) => {
            console.error('Failed to dismiss playback notification:', error);
          });
          return;
        }
        if (this.isLoading) return;
        void NotificationUtils.updatePlaybackNotification(
          book.title,
          book.author,
          this.isPlaying,
          Math.floor(this.bookProgress),
        ).catch((error) => {
          console.error('Failed to update playback notification:', error);
        });
      },
    );
  }

  dispose() {
    this.notificationResponseSub?.remove();
    this.appStateSub?.remove();
    this.notificationResponseSub = null;
    this.appStateSub = null;

    if (this.saveTimer !== null) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.persistReaction?.();
    this.persistReaction = null;
    this.notificationReaction?.();
    this.notificationReaction = null;

    this.listener?.remove();
    this.listener = null;
    try {
      this.player?.remove();
    } catch {
      /* ignore */
    }
    this.player = null;
  }

  /* ---- persistence ---- */

  async persistCurrentProgress() {
    const book = this.currentBook;
    if (!book || this.isLoading) return;

    await Storage.setBookProgress(book.id, {
      currentChapterIndex: this.currentChapterIndex,
      positionMs: this.positionMs,
      chapterDurations: this.chapterDurations,
      lastPlayedAt: Date.now(),
      rate: this.rate,
    });
  }

  /* ---- core: load a single chapter's audio ---- */

  async loadChapterAudio(
    book: Audiobook,
    chapterIndex: number,
    positionMsArg: number,
    shouldPlay: boolean,
  ) {
    if (this.loadingChapter) return;
    this.loadingChapter = true;

    try {
      const chapter = book.chapters[chapterIndex];
      if (!chapter) return;

      // Remove old listener
      this.listener?.remove();
      this.listener = null;

      // Reuse existing player (replace source) or create new one
      if (this.player) {
        this.player.replace({ uri: chapter.uri });
      } else {
        this.player = createAudioPlayer({ uri: chapter.uri });
      }

      const player = this.player;
      player.setPlaybackRate(this.rate);

      // Update state immediately
      const newDurations = [...this.chapterDurations];
      while (newDurations.length < book.chapters.length) newDurations.push(0);

      this.chapterDurations = newDurations;
      this.currentBook = book;
      this.currentChapterIndex = chapterIndex;
      this.positionMs = positionMsArg;
      this.isPlaying = shouldPlay;

      // Set up status listener
      this.listener = player.addListener('playbackStatusUpdate', this.handlePlaybackStatus);

      // Wait a tick for the player to load, then seek + play
      await this.waitForPlayerLoad(player);

      if (positionMsArg > 0) {
        await player.seekTo(positionMsArg / 1000);
      }

      if (shouldPlay) {
        player.play();
      }

      // Capture duration now that it's loaded
      if (player.duration > 0) {
        const loadedDur = Math.round(player.duration * 1000);
        runInAction(() => {
          this.durationMs = loadedDur;
          const updDurations = [...this.chapterDurations];
          updDurations[chapterIndex] = loadedDur;
          this.chapterDurations = updDurations;
        });
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      this.loadingChapter = false;
    }
  }

  private waitForPlayerLoad(player: AudioPlayer): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (player.isLoaded) {
          resolve();
        } else {
          setTimeout(check, POLL_INTERVAL_MS);
        }
      };
      check();
      // Safety timeout
      setTimeout(resolve, WAIT_FOR_LOAD_TIMEOUT_MS);
    });
  }

  handlePlaybackStatus(status: AudioStatus) {
    if (!status.isLoaded) return;

    const curMs = Math.round(status.currentTime * 1000);
    const durMs = Math.round(status.duration * 1000);

    this.positionMs = curMs;

    if (durMs > 0) {
      this.durationMs = durMs;
      // Update chapter duration if we got a better value
      if (this.chapterDurations[this.currentChapterIndex] !== durMs && durMs > 0) {
        const curDurations = [...this.chapterDurations];
        curDurations[this.currentChapterIndex] = durMs;
        this.chapterDurations = curDurations;
      }
    }

    this.isPlaying = status.playing;

    if (status.didJustFinish) {
      const nextIdx = this.currentChapterIndex + 1;
      if (this.currentBook && nextIdx < this.currentBook.chapters.length) {
        this.loadingChapter = false; // allow re-entry
        void this.loadChapterAudio(this.currentBook, nextIdx, 0, true);
      }
    }
  }

  /* ---- public API ---- */

  async loadBook(book: Audiobook) {
    // Already loaded – skip
    if (this.currentBook?.id === book.id && !this.isLoading) return;

    // CRITICAL: Save the current book's progress immediately before switching
    if (this.currentBook) {
      try {
        await this.persistCurrentProgress();
      } catch (err) {
        console.error('Failed to save progress for current book before switching:', err);
      }
    }

    this.isLoading = true;
    this.currentBook = book;

    try {
      // Check stored progress
      const progress = await Storage.getBookProgress(book.id);

      let durations: number[];
      if (
        progress &&
        progress.chapterDurations.length === book.chapters.length &&
        progress.chapterDurations.every((d) => d > 0)
      ) {
        durations = progress.chapterDurations;
      } else {
        durations = await scanChapterDurations(book);
      }

      runInAction(() => {
        this.chapterDurations = durations;
        this.rate = progress?.rate ?? 1.0;
      });

      let startChapter = progress?.currentChapterIndex ?? 0;
      let startPosition = progress?.positionMs ?? 0;
      if (startChapter >= book.chapters.length) {
        startChapter = 0;
        startPosition = 0;
      }

      await this.loadChapterAudio(book, startChapter, startPosition, false);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  togglePlayPause() {
    const player = this.player;
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  async seekRelative(deltaMs: number) {
    const player = this.player;
    if (!player || !player.isLoaded) return;

    const curMs = Math.round(player.currentTime * 1000);
    const totalMs = Math.round(player.duration * 1000);
    const target = curMs + deltaMs;

    if (target < 0) {
      const prevIdx = this.currentChapterIndex - 1;
      if (prevIdx >= 0 && this.currentBook) {
        const prevDur = this.chapterDurations[prevIdx] ?? 0;
        const pos = Math.max(0, prevDur + target);
        await this.loadChapterAudio(this.currentBook, prevIdx, pos, this.isPlaying);
      } else {
        await player.seekTo(0);
      }
    } else if (target > totalMs) {
      const nextIdx = this.currentChapterIndex + 1;
      if (this.currentBook && nextIdx < this.currentBook.chapters.length) {
        const overflow = target - totalMs;
        await this.loadChapterAudio(this.currentBook, nextIdx, overflow, this.isPlaying);
      } else {
        await player.seekTo(totalMs / 1000);
      }
    } else {
      await player.seekTo(target / 1000);
    }
  }

  async seekToBookPosition(targetBookMs: number) {
    const book = this.currentBook;
    if (!book) return;
    const durs = this.chapterDurations;

    let accumulated = 0;
    for (let i = 0; i < durs.length; i++) {
      const chDur = durs[i] ?? 0;
      if (accumulated + chDur > targetBookMs || i === durs.length - 1) {
        const posInCh = Math.max(0, Math.min(targetBookMs - accumulated, chDur));
        if (i === this.currentChapterIndex && this.player) {
          await this.player.seekTo(posInCh / 1000);
        } else {
          await this.loadChapterAudio(book, i, posInCh, this.isPlaying);
        }
        return;
      }
      accumulated += chDur;
    }
  }

  setRate(newRate: number) {
    this.rate = newRate;
    const player = this.player;
    if (player) {
      player.setPlaybackRate(newRate);
    }
  }

  async goToChapter(index: number) {
    const book = this.currentBook;
    if (!book || index < 0 || index >= book.chapters.length) return;
    await this.loadChapterAudio(book, index, 0, this.isPlaying);
  }
}
