// A single playable audio file within an audiobook.
export interface AudioChapter {
  uri: string;
  filename: string;
}

// A scanned audiobook: one subfolder of the base folder, with its parsed title/author and chapters.
export interface Audiobook {
  id: string;
  title: string;
  author: string;
  folderUri: string;
  chapters: AudioChapter[];
  coverUri: string | null;
}

// Persisted playback state for a book, keyed by book id in the MMKV progress map.
export interface BookProgress {
  currentChapterIndex: number;
  positionMs: number;
  chapterDurations: number[];
  lastPlayedAt: number;
  rate?: number;
}
