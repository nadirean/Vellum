export interface AudioChapter {
  uri: string;
  filename: string;
}

export interface Audiobook {
  id: string;
  title: string;
  folderUri: string;
  chapters: AudioChapter[];
  coverUri: string | null;
}

export interface BookProgress {
  currentChapterIndex: number;
  positionMs: number;
  chapterDurations: number[];
  lastPlayedAt: number;
}
