import { AppState } from 'react-native';

import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Command } from 'expo-media-control';
import { IReactionDisposer, makeAutoObservable, reaction, runInAction } from 'mobx';

import { Audiobook } from '@type/LibraryTypes';
import * as LocalStore from '@utils/localStore';
import * as MediaControls from '@utils/mediaControls';
import {
  CHAPTER_SCAN_BATCH,
  DURATION_MEASURE_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  PROGRESS_SAVE_INTERVAL_MS,
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

/**
 * Scan every chapter of a book with a temporary player to measure its duration, batching the
 * measurements so only a few players exist at once. Returns a duration array matching the chapter
 * order, with 0 for any chapter that could not be measured.
 */
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

/**
 * Owns all playback state for the whole app: the currently loaded audiobook, active chapter,
 * position, rate, and chapter durations, plus the native expo-audio player and every listener,
 * timer, and MobX reaction wired up during setup. Booting the store hydrates persisted state and
 * setup() begins reacting to playback changes to persist progress and keep the notification in sync.
 */
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
  pendingSeekTargetMs: number | null = null;
  lastSeekTime = 0;
  saveTimer: ReturnType<typeof setInterval> | null = null;
  persistReaction: IReactionDisposer | null = null;
  notificationReaction: IReactionDisposer | null = null;
  appStateSub: { remove: () => void } | null = null;
  mediaControlRemove: (() => void) | null = null;

  constructor() {
    makeAutoObservable(
      this,
      {
        player: false,
        listener: false,
        loadingChapter: false,
        pendingSeekTargetMs: false,
        lastSeekTime: false,
        saveTimer: false,
        persistReaction: false,
        notificationReaction: false,
        appStateSub: false,
        mediaControlRemove: false,
      },
      { autoBind: true },
    );
  }

  /* ---- derived values ---- */

  /** Sum of every measured chapter duration, i.e. the whole book's length in ms. */
  get totalBookDurationMs(): number {
    return this.chapterDurations.reduce((s, d) => s + d, 0);
  }

  /** Book-wide position in ms: the sum of prior chapter durations plus the current position. */
  get bookPositionMs(): number {
    const prev = this.chapterDurations
      .slice(0, this.currentChapterIndex)
      .reduce((s, d) => s + d, 0);
    return prev + this.positionMs;
  }

  /** Overall book progress as a percentage (0–100), 0 when the total duration is unknown. */
  get bookProgress(): number {
    return this.totalBookDurationMs > 0
      ? (this.bookPositionMs / this.totalBookDurationMs) * 100
      : 0;
  }

  /* ---- setup / dispose ---- */

  /**
   * Boots background playback support: configures the audio session for background/silent-mode
   * playback and wires the reaction-based side effects that persist progress (on pause, every 5s,
   * and on backgrounding) and keep the media controls current. Media controls are enabled lazily
   * when a book loads (see syncMediaControls), so no notification exists until a book is opened.
   */
  setup() {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });

    this.mediaControlRemove = MediaControls.addListener((event) => {
      switch (event.command) {
        case Command.PLAY:
        case Command.PAUSE:
          this.togglePlayPause();
          break;
        case Command.STOP:
          this.stopFromMediaControls();
          break;
        case Command.NEXT_TRACK:
          void this.goToNextChapter();
          break;
        case Command.PREVIOUS_TRACK:
          void this.goToPreviousChapter();
          break;
        case Command.SKIP_FORWARD:
          void this.seekRelative(15000);
          break;
        case Command.SKIP_BACKWARD:
          void this.seekRelative(-15000);
          break;
        case Command.SEEK:
          if (event.data?.position != null) {
            void this.seekToBookPosition((event.data.position as number) * 1000);
          }
          break;
      }
    });

    // Persist immediately when playback pauses and every 5s while a book is loaded
    this.persistReaction = reaction(
      () => (this.currentBook && !this.isLoading ? this.isPlaying : null),
      (isPlaying) => {
        if (isPlaying === false && this.currentBook) {
          try {
            this.persistCurrentProgress();
          } catch (err) {
            console.error('Failed to persist progress for book:', this.currentBook?.id, err);
          }
        }
      },
    );
    this.saveTimer = setInterval(() => {
      if (this.currentBook && !this.isLoading) {
        try {
          this.persistCurrentProgress();
        } catch (err) {
          console.error('Failed to persist progress for book:', this.currentBook?.id, err);
        }
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    this.appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        try {
          this.persistCurrentProgress();
        } catch (err) {
          console.error('Failed to persist progress while app was backgrounding:', err);
        }
      }
    });

    // Keep the media controls in sync with book/playback transitions. Position is intentionally
    // not tracked: Android animates the scrubber natively from the reported rate, and per-second
    // updates would interrupt that animation. Explicit syncs happen after seeks and chapter loads.
    this.notificationReaction = reaction(
      () =>
        this.currentBook
          ? [this.currentBook.id, this.isPlaying, this.rate, this.isLoading].join('|')
          : null,
      () => {
        const book = this.currentBook;
        if (!book) {
          void MediaControls.dismissMediaControls().catch((error) => {
            console.error('Failed to dismiss media controls:', error);
          });
          return;
        }
        if (this.isLoading) return;

        void this.syncMediaControls(book);
      },
    );
  }

  /**
   * Tears down everything setup() created: media control listeners, app-state listeners,
   * the progress and notification reactions, the save interval, and the native player.
   * Called by the provider when the app is disposed.
   */
  dispose() {
    void MediaControls.dismissMediaControls();
    void MediaControls.removeAllListeners();
    this.mediaControlRemove = null;

    this.appStateSub?.remove();
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

  /* ---- media controls sync ---- */

  /** Pauses playback and removes the system media notification (Stop button on the controls). */
  stopFromMediaControls() {
    this.player?.pause();
    void MediaControls.dismissMediaControls().catch((error) => {
      console.error('Failed to dismiss media controls:', error);
    });
  }

  /**
   * Pushes current book metadata and playback state to the system media controls, enabling them
   * first so the notification only ever exists while a book is loaded. Chained in order: enable
   * must complete before metadata/state reach the native session.
   */
  private async syncMediaControls(book: Audiobook) {
    try {
      await MediaControls.ensureMediaControls();
      await MediaControls.updateMetadata({
        title: book.title,
        author: book.author,
        coverUri: book.coverUri,
        durationMs: this.totalBookDurationMs,
      });
      await MediaControls.updatePlaybackState(this.isPlaying, this.bookPositionMs, this.rate);
    } catch (error) {
      console.error('Failed to sync media controls:', error);
    }
  }

  /**
   * Pushes only the playback state (playing/paused, position, rate). Called explicitly after
   * seeks and chapter loads, where observables tracked by the notification reaction don't change.
   */
  private async syncPlaybackState() {
    if (!this.currentBook || this.isLoading) return;
    try {
      await MediaControls.ensureMediaControls();
      await MediaControls.updatePlaybackState(this.isPlaying, this.bookPositionMs, this.rate);
    } catch (error) {
      console.error('Failed to update media playback state:', error);
    }
  }

  /* ---- persistence ---- */

  /**
   * Synchronously writes the current chapter index, position, measured durations, rate, and
   * timestamp into the persisted progress map. No-op while a book is loading to avoid capturing a
   * half-switched state.
   */
  persistCurrentProgress() {
    const book = this.currentBook;
    if (!book || this.isLoading) return;

    LocalStore.saveBookProgress(book.id, {
      currentChapterIndex: this.currentChapterIndex,
      positionMs: this.positionMs,
      chapterDurations: this.chapterDurations,
      lastPlayedAt: Date.now(),
      rate: this.rate,
    });
  }

  /* ---- core: load a single chapter's audio ---- */

  /**
   * Loads a single chapter's audio into the (reused) native player, updates the observable state to
   * point at that chapter, seeks to the given position once loaded, and starts playing when asked.
   * Also records the chapter's measured duration for progress bookkeeping. Re-entrant while a load
   * is already in flight (skipped) so rapid chapter switches don't race.
   */
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
      this.pendingSeekTargetMs = positionMsArg;
      this.lastSeekTime = Date.now();
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

      // Chapter switches don't change anything tracked by the notification reaction
      void this.syncPlaybackState();
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      this.loadingChapter = false;
    }
  }

  /** Resolves once the player reports itself loaded, with a safety timeout so a stuck load never hangs. */
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

  /**
   * Player status callback mirroring position, duration, and playing state into observables. Guards
   * against intermediate seek telemetry (the pending-seek window), folds better duration values back
   * into chapterDurations, and auto-advances to the next chapter when one finishes.
   */
  handlePlaybackStatus(status: AudioStatus) {
    if (!status.isLoaded) return;

    const curMs = Math.round(status.currentTime * 1000);
    const durMs = Math.round(status.duration * 1000);

    if (this.pendingSeekTargetMs !== null) {
      const isClose = Math.abs(curMs - this.pendingSeekTargetMs) < 1000;
      const isTimedOut = Date.now() - this.lastSeekTime > 1000;
      if (isClose || isTimedOut) {
        this.pendingSeekTargetMs = null;
      } else {
        return;
      }
    }

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

  /**
   * Opens a book: saves the previous book's progress, restores the stored chapter/position/rate (or
   * measures chapter durations from scratch when none are persisted), then starts loading the
   * restored chapter without playing. Switching to the already-loaded book is a no-op.
   */
  async loadBook(book: Audiobook) {
    // Already loaded – skip
    if (this.currentBook?.id === book.id && !this.isLoading) return;

    // CRITICAL: Save the current book's progress immediately before switching
    if (this.currentBook) {
      try {
        this.persistCurrentProgress();
      } catch (err) {
        console.error('Failed to save progress for current book before switching:', err);
      }
    }

    this.isLoading = true;
    this.currentBook = book;

    try {
      // Check stored progress
      const progress = LocalStore.getBookProgress(book.id);

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

  /** Toggles the native player between playing and paused; no-op when no player exists yet. */
  togglePlayPause() {
    const player = this.player;
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  /**
   * Seeks by a signed delta in ms relative to the current position, wrapping into the previous or
   * next chapter (loading it as needed) when the seek crosses a chapter boundary, and clamping to
   * the current chapter's edges otherwise.
   */
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
        runInAction(() => {
          this.positionMs = 0;
        });
        this.pendingSeekTargetMs = 0;
        this.lastSeekTime = Date.now();
        await player.seekTo(0);
        void this.syncPlaybackState();
      }
    } else if (target > totalMs) {
      const nextIdx = this.currentChapterIndex + 1;
      if (this.currentBook && nextIdx < this.currentBook.chapters.length) {
        const overflow = target - totalMs;
        await this.loadChapterAudio(this.currentBook, nextIdx, overflow, this.isPlaying);
      } else {
        runInAction(() => {
          this.positionMs = totalMs;
        });
        this.pendingSeekTargetMs = totalMs;
        this.lastSeekTime = Date.now();
        await player.seekTo(totalMs / 1000);
        void this.syncPlaybackState();
      }
    } else {
      runInAction(() => {
        this.positionMs = target;
      });
      this.pendingSeekTargetMs = target;
      this.lastSeekTime = Date.now();
      await player.seekTo(target / 1000);
      void this.syncPlaybackState();
    }
  }

  /**
   * Seeks to an absolute book-wide position in ms. Walks the measured durations to find the
   * enclosing chapter, then either seeks in place (same chapter) or loads that chapter at the
   * computed in-chapter position.
   */
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
          runInAction(() => {
            this.positionMs = posInCh;
          });
          this.pendingSeekTargetMs = posInCh;
          this.lastSeekTime = Date.now();
          await this.player.seekTo(posInCh / 1000);
          void this.syncPlaybackState();
        } else {
          await this.loadChapterAudio(book, i, posInCh, this.isPlaying);
        }
        return;
      }
      accumulated += chDur;
    }
  }

  /** Sets the playback rate on both the store and the native player. */
  setRate(newRate: number) {
    this.rate = newRate;
    const player = this.player;
    if (player) {
      player.setPlaybackRate(newRate);
    }
  }

  /** Jumps to a chapter by index, starting it from the beginning while keeping the current play state. */
  async goToChapter(index: number) {
    const book = this.currentBook;
    if (!book || index < 0 || index >= book.chapters.length) return;
    await this.loadChapterAudio(book, index, 0, this.isPlaying);
  }

  /** Advances to the next chapter if one exists, starting from the beginning. */
  async goToNextChapter() {
    const book = this.currentBook;
    if (!book) return;
    const nextIdx = this.currentChapterIndex + 1;
    if (nextIdx < book.chapters.length) {
      await this.loadChapterAudio(book, nextIdx, 0, this.isPlaying);
    }
  }

  /** Returns to the beginning of the current chapter, or the previous chapter if already near the start. */
  async goToPreviousChapter() {
    const book = this.currentBook;
    if (!book) return;
    // If more than 3 seconds into the chapter, restart it; otherwise go to previous
    if (this.positionMs > 3000) {
      await this.loadChapterAudio(book, this.currentChapterIndex, 0, this.isPlaying);
    } else {
      const prevIdx = this.currentChapterIndex - 1;
      if (prevIdx >= 0) {
        await this.loadChapterAudio(book, prevIdx, 0, this.isPlaying);
      }
    }
  }
}
