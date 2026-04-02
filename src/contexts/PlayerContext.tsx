import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { Audiobook } from '@consts/types';
import * as Storage from '@utils/storage';
import * as NotificationUtils from '@utils/notifications';
import * as Notifications from 'expo-notifications';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlayerContextType {
  // State
  currentBook: Audiobook | null;
  currentChapterIndex: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  rate: number;
  chapterDurations: number[];
  isLoading: boolean;

  // Derived
  totalBookDurationMs: number;
  bookPositionMs: number;
  bookProgress: number;
  timeLeftMs: number;
  timeLeftWithTempoMs: number;

  // Actions
  loadBook: (book: Audiobook) => Promise<void>;
  togglePlayPause: () => void;
  seekRelative: (deltaMs: number) => Promise<void>;
  seekToBookPosition: (bookMs: number) => Promise<void>;
  setRate: (newRate: number) => void;
  goToChapter: (index: number) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

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
        try { tmpPlayer.remove(); } catch { /* ignore */ }
      }
    };

    const sub = tmpPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.isLoaded && status.duration > 0 && !resolved) {
        resolved = true;
        const durMs = Math.round(status.duration * 1000);
        sub.remove();
        try { tmpPlayer.remove(); } catch { /* ignore */ }
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
    }, 10000);
  });
}

async function scanChapterDurations(book: Audiobook): Promise<number[]> {
  const BATCH = 3;
  const durations: number[] = new Array(book.chapters.length).fill(0);

  for (let i = 0; i < book.chapters.length; i += BATCH) {
    const batch = book.chapters.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((ch) => measureDuration(ch.uri)),
    );
    results.forEach((d: number, j: number) => {
      durations[i + j] = d;
    });
  }
  return durations;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  /* ---- state ---- */
  const [currentBook, setCurrentBook] = useState<Audiobook | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(1.0);
  const [chapterDurations, setChapterDurations] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /* ---- refs (stable access for async callbacks) ---- */
  const playerRef = useRef<AudioPlayer | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const bookRef = useRef<Audiobook | null>(null);
  const chapterIdxRef = useRef(0);
  const rateRef = useRef(1.0);
  const durationsRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);
  const positionRef = useRef(0);
  const loadingChapterRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Keep refs in sync
  bookRef.current = currentBook;
  chapterIdxRef.current = currentChapterIndex;
  rateRef.current = rate;
  durationsRef.current = chapterDurations;
  isPlayingRef.current = isPlaying;
  positionRef.current = positionMs;
  isLoadingRef.current = isLoading;

  /* ---- audio mode ---- */
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  }, []);

  /* ---- cleanup player on unmount ---- */
  useEffect(() => {
    return () => {
      listenerRef.current?.remove();
      try { playerRef.current?.remove(); } catch { /* ignore */ }
    };
  }, []);

  /* ---- persist progress every 5 s & on pause ---- */
  const persistCurrentProgress = useCallback(async () => {
    const book = bookRef.current;
    if (!book || isLoadingRef.current) return;

    await Storage.setBookProgress(book.id, {
      currentChapterIndex: chapterIdxRef.current,
      positionMs: positionRef.current,
      chapterDurations: durationsRef.current,
      lastPlayedAt: Date.now(),
      rate: rateRef.current,
    });
  }, []);

  useEffect(() => {
    if (!currentBook || isLoading) return;
    const save = () => {
      persistCurrentProgress().catch((err) => {
        console.error('Failed to persist progress for book:', bookRef.current?.id, err);
      });
    };
    
    // Save immediately when paused
    if (!isPlaying) {
      save();
    }
    
    const id = setInterval(save, 5000);
    return () => {
      clearInterval(id);
      save(); // save on cleanup too
    };
  }, [currentBook?.id, isLoading, isPlaying, persistCurrentProgress]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistCurrentProgress().catch((err) => {
          console.error('Failed to persist progress while app was backgrounding:', err);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [persistCurrentProgress]);

  /* ---- core: load a single chapter's audio ---- */
  const loadChapterAudio = useCallback(async (
    book: Audiobook,
    chapterIndex: number,
    positionMsArg: number,
    shouldPlay: boolean,
  ) => {
    if (loadingChapterRef.current) return;
    loadingChapterRef.current = true;

    try {
      const chapter = book.chapters[chapterIndex];
      if (!chapter) return;

      // Remove old listener
      listenerRef.current?.remove();
      listenerRef.current = null;

      // Reuse existing player (replace source) or create new one
      if (playerRef.current) {
        playerRef.current.replace({ uri: chapter.uri });
      } else {
        playerRef.current = createAudioPlayer({ uri: chapter.uri });
      }

      const player = playerRef.current;
      player.setPlaybackRate(rateRef.current);

      // Update state immediately
      const newDurations = [...durationsRef.current];
      while (newDurations.length < book.chapters.length) newDurations.push(0);

      durationsRef.current = newDurations;
      chapterIdxRef.current = chapterIndex;
      bookRef.current = book;

      setCurrentBook(book);
      setCurrentChapterIndex(chapterIndex);
      setPositionMs(positionMsArg);
      setIsPlaying(shouldPlay);
      setChapterDurations(newDurations);

      // Set up status listener
      const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (!status.isLoaded) return;

        const curMs = Math.round(status.currentTime * 1000);
        const durMs = Math.round(status.duration * 1000);

        setPositionMs(curMs);
        positionRef.current = curMs;

        if (durMs > 0) {
          setDurationMs(durMs);
          // Update chapter duration if we got a better value
          const curDurations = [...durationsRef.current];
          if (curDurations[chapterIdxRef.current] !== durMs && durMs > 0) {
            curDurations[chapterIdxRef.current] = durMs;
            durationsRef.current = curDurations;
            setChapterDurations(curDurations);
          }
        }

        setIsPlaying(status.playing);
        isPlayingRef.current = status.playing;

        if (status.didJustFinish) {
          const bk = bookRef.current;
          const nextIdx = chapterIdxRef.current + 1;
          if (bk && nextIdx < bk.chapters.length) {
            loadingChapterRef.current = false; // allow re-entry
            loadChapterAudio(bk, nextIdx, 0, true);
          }
        }
      });

      listenerRef.current = sub;

      // Wait a tick for the player to load, then seek + play
      const waitForLoad = (): Promise<void> => {
        return new Promise((resolve) => {
          const check = () => {
            if (player.isLoaded) {
              resolve();
            } else {
              setTimeout(check, 50);
            }
          };
          check();
          // Safety timeout
          setTimeout(resolve, 5000);
        });
      };

      await waitForLoad();

      if (positionMsArg > 0) {
        await player.seekTo(positionMsArg / 1000);
      }

      if (shouldPlay) {
        player.play();
      }

      // Capture duration now that it's loaded
      if (player.duration > 0) {
        const loadedDur = Math.round(player.duration * 1000);
        setDurationMs(loadedDur);
        const updDurations = [...durationsRef.current];
        updDurations[chapterIndex] = loadedDur;
        durationsRef.current = updDurations;
        setChapterDurations(updDurations);
      }

    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      loadingChapterRef.current = false;
    }
  }, []);

  /* ---- public API ---- */

  const loadBook = async (book: Audiobook) => {
    // Already loaded – skip
    if (bookRef.current?.id === book.id && !isLoading) return;

    // CRITICAL: Save the current book's progress immediately before switching
    if (bookRef.current) {
      try {
        await persistCurrentProgress();
      } catch (err) {
        console.error('Failed to save progress for current book before switching:', err);
      }
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setCurrentBook(book);
    bookRef.current = book;

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

      durationsRef.current = durations;
      setChapterDurations(durations);

      const startRate = progress?.rate ?? 1.0;
      rateRef.current = startRate;
      setRateState(startRate);

      let startChapter = progress?.currentChapterIndex ?? 0;
      let startPosition = progress?.positionMs ?? 0;
      if (startChapter >= book.chapters.length) {
        startChapter = 0;
        startPosition = 0;
      }

      await loadChapterAudio(book, startChapter, startPosition, false);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const seekRelative = async (deltaMs: number) => {
    const player = playerRef.current;
    if (!player || !player.isLoaded) return;

    const curMs = Math.round(player.currentTime * 1000);
    const totalMs = Math.round(player.duration * 1000);
    const target = curMs + deltaMs;

    if (target < 0) {
      const prevIdx = chapterIdxRef.current - 1;
      if (prevIdx >= 0 && bookRef.current) {
        const prevDur = durationsRef.current[prevIdx] ?? 0;
        const pos = Math.max(0, prevDur + target);
        await loadChapterAudio(bookRef.current, prevIdx, pos, isPlayingRef.current);
      } else {
        await player.seekTo(0);
      }
    } else if (target > totalMs) {
      const nextIdx = chapterIdxRef.current + 1;
      if (bookRef.current && nextIdx < bookRef.current.chapters.length) {
        const overflow = target - totalMs;
        await loadChapterAudio(bookRef.current, nextIdx, overflow, isPlayingRef.current);
      } else {
        await player.seekTo(totalMs / 1000);
      }
    } else {
      await player.seekTo(target / 1000);
    }
  };

  const seekToBookPosition = async (targetBookMs: number) => {
    const book = bookRef.current;
    if (!book) return;
    const durs = durationsRef.current;

    let accumulated = 0;
    for (let i = 0; i < durs.length; i++) {
      const chDur = durs[i] ?? 0;
      if (accumulated + chDur > targetBookMs || i === durs.length - 1) {
        const posInCh = Math.max(0, Math.min(targetBookMs - accumulated, chDur));
        if (i === chapterIdxRef.current && playerRef.current) {
          await playerRef.current.seekTo(posInCh / 1000);
        } else {
          await loadChapterAudio(book, i, posInCh, isPlayingRef.current);
        }
        return;
      }
      accumulated += chDur;
    }
  };

  const setRate = (newRate: number) => {
    rateRef.current = newRate;
    setRateState(newRate);
    const player = playerRef.current;
    if (player) {
      player.setPlaybackRate(newRate);
    }
  };

  const goToChapter = async (index: number) => {
    const book = bookRef.current;
    if (!book || index < 0 || index >= book.chapters.length) return;
    await loadChapterAudio(book, index, 0, isPlayingRef.current);
  };

  /* ---- derived values ---- */
  const totalBookDurationMs = useMemo(
    () => chapterDurations.reduce((s, d) => s + d, 0),
    [chapterDurations],
  );

  const bookPositionMs = useMemo(() => {
    const prev = chapterDurations.slice(0, currentChapterIndex).reduce((s, d) => s + d, 0);
    return prev + positionMs;
  }, [chapterDurations, currentChapterIndex, positionMs]);

  const bookProgress = totalBookDurationMs > 0
    ? (bookPositionMs / totalBookDurationMs) * 100
    : 0;

  const timeLeftMs = Math.max(0, totalBookDurationMs - bookPositionMs);
  const timeLeftWithTempoMs = rate > 0 ? timeLeftMs / rate : timeLeftMs;

  /* ---- notifications ---- */
  useEffect(() => {
    NotificationUtils.setupNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      if (actionId === NotificationUtils.PlaybackAction.TOGGLE) {
        togglePlayPause();
      } else if (actionId === NotificationUtils.PlaybackAction.SKIP_BACK) {
        seekRelative(-15000);
      } else if (actionId === NotificationUtils.PlaybackAction.SKIP_FORWARD) {
        seekRelative(15000);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [togglePlayPause, seekRelative]);

  useEffect(() => {
    if (currentBook && !isLoading) {
      NotificationUtils.updatePlaybackNotification(
        currentBook.title,
        currentBook.author,
        isPlaying,
        bookProgress,
      );
    } else if (!currentBook) {
      NotificationUtils.dismissPlaybackNotification();
    }
  }, [currentBook?.id, isPlaying, Math.floor(bookProgress), isLoading]);

  /* ---- context value ---- */
  const value: PlayerContextType = {
    currentBook,
    currentChapterIndex,
    isPlaying,
    positionMs,
    durationMs,
    rate,
    chapterDurations,
    isLoading,
    totalBookDurationMs,
    bookPositionMs,
    bookProgress,
    timeLeftMs,
    timeLeftWithTempoMs,
    loadBook,
    togglePlayPause,
    seekRelative,
    seekToBookPosition,
    setRate,
    goToChapter,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}
