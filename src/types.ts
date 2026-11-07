export interface Sentence {
  id: number;
  speaker: string;
  text: string;
  korean: string;
  stress: string[];
  start: number;
  end: number;
}

export type ProgressStatus = 'new' | 'practiced' | 'done';

export interface SentenceProgress {
  id: number;
  plays: number;
  recordings: number;
  selfCheck: (number | null)[]; // 3 items: [speed, stress, intonation] (0: good, 1: ok, 2: needs work)
  status: ProgressStatus;
}

export type ScreenType = 'start' | 'list' | 'practice' | 'edit' | 'finish';

export type ShadowStep = 1 | 2 | 3 | 4;

export interface MovieSettings {
  titleEn: string;
  titleKo: string;
  releaseYear: string;
  director: string;
  screenplay: string;
  production: string;
  distribution: string;
  sceneDescription: string;
  youtubeTitle: string;
  youtubeChannel: string;
  youtubeUrl: string;
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  madeBy: string;
  noticeEn: string;
  noticeKo: string;
  oneLineCredit: string;
}
