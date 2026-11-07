import { Sentence, SentenceProgress } from '../types';
import { INITIAL_SENTENCES } from '../constants/insideOutData';

const SENTENCES_KEY = 'scene_shadow_inside_out_sentences_v7';
const PROGRESS_KEY = 'scene_shadow_inside_out_progress_v1';

let memorySentences: Sentence[] = [...INITIAL_SENTENCES];
let memoryProgress: Record<number, SentenceProgress> = {};

export function loadSentences(): Sentence[] {
  try {
    const raw = localStorage.getItem(SENTENCES_KEY);
    if (!raw) {
      // First time on v2: initialize with updated INITIAL_SENTENCES
      saveSentences(INITIAL_SENTENCES);
      return [...INITIAL_SENTENCES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...INITIAL_SENTENCES];
  } catch (err) {
    console.warn('localStorage not accessible, using memory store for sentences', err);
    return memorySentences;
  }
}

export function saveSentences(sentences: Sentence[]): void {
  memorySentences = [...sentences];
  try {
    localStorage.setItem(SENTENCES_KEY, JSON.stringify(sentences));
  } catch (err) {
    console.warn('Failed to save sentences to localStorage', err);
  }
}

export function resetSentencesToDefault(): Sentence[] {
  saveSentences(INITIAL_SENTENCES);
  return [...INITIAL_SENTENCES];
}

export function loadProgress(): Record<number, SentenceProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('localStorage not accessible, using memory store for progress', err);
    return memoryProgress;
  }
}

export function saveProgress(progress: Record<number, SentenceProgress>): void {
  memoryProgress = { ...progress };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save progress to localStorage', err);
  }
}

export function getSentenceProgress(
  id: number,
  allProgress: Record<number, SentenceProgress>
): SentenceProgress {
  if (allProgress[id]) {
    return allProgress[id];
  }
  return {
    id,
    plays: 0,
    recordings: 0,
    selfCheck: [null, null, null],
    status: 'new',
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  if (tenths > 0) {
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
