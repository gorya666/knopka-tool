// All TypeScript interfaces for the Knopka Post-Production Tool

// ─── Field history wrapper ────────────────────────────────────────────────────

export interface FieldHistory<T> {
  versions: T[];
  currentIndex: number;
}

export function createHistory<T>(initial: T): FieldHistory<T> {
  return { versions: [initial], currentIndex: 0 };
}

export function addVersion<T>(history: FieldHistory<T>, next: T): FieldHistory<T> {
  const versions = [...history.versions.slice(0, history.currentIndex + 1), next];
  return { versions, currentIndex: versions.length - 1 };
}

export function navigate<T>(history: FieldHistory<T>, direction: 'prev' | 'next'): FieldHistory<T> {
  const next = direction === 'prev'
    ? Math.max(0, history.currentIndex - 1)
    : Math.min(history.versions.length - 1, history.currentIndex + 1);
  return { ...history, currentIndex: next };
}

export function current<T>(history: FieldHistory<T>): T {
  return history.versions[history.currentIndex];
}

// ─── Core types ───────────────────────────────────────────────────────────────

export interface Chapter {
  time: string;
  title: string;
}

export type ClipType = 'hot_take' | 'tip' | 'quote';

export interface Clip {
  timeRange: string;
  excerpt: string;
  type: ClipType;
  whyItWorks: string;
  tiktokCaption: string;
}

export interface SocialPosts {
  telegram: string;
  linkedin: string;
  instagram: string;
  tiktok: string;
}

export interface AnalysisResult {
  titles: [string, string, string];
  showNotes: string;
  chapters: Chapter[];
  clips: [Clip, Clip, Clip];
  social: SocialPosts;
}

// ─── Versioned result ─────────────────────────────────────────────────────────

export interface VersionedResult {
  titles: FieldHistory<[string, string, string]>;
  showNotes: FieldHistory<string>;
  chapters: FieldHistory<Chapter[]>;
  clips: FieldHistory<[Clip, Clip, Clip]>;
  social: {
    telegram: FieldHistory<string>;
    linkedin: FieldHistory<string>;
    instagram: FieldHistory<string>;
    tiktok: FieldHistory<string>;
  };
}

export function toVersionedResult(result: AnalysisResult): VersionedResult {
  return {
    titles: createHistory(result.titles),
    showNotes: createHistory(result.showNotes),
    chapters: createHistory(result.chapters),
    clips: createHistory(result.clips),
    social: {
      telegram: createHistory(result.social.telegram),
      linkedin: createHistory(result.social.linkedin),
      instagram: createHistory(result.social.instagram),
      tiktok: createHistory(result.social.tiktok),
    },
  };
}

// ─── Quick commands ───────────────────────────────────────────────────────────

export type QuickCommand =
  | 'more_provocative'
  | 'shorter'
  | 'more_specific'
  | 'expand'
  | 'more_casual'
  | 'stronger_hook'
  | 'different_angle'
  | 'regenerate';

export const COMMANDS_BY_FIELD: Record<string, QuickCommand[]> = {
  titles:    ['more_provocative', 'shorter', 'more_specific', 'regenerate'],
  showNotes: ['shorter', 'expand', 'more_casual', 'regenerate'],
  telegram:  ['shorter', 'stronger_hook', 'more_casual', 'regenerate'],
  linkedin:  ['shorter', 'stronger_hook', 'different_angle', 'regenerate'],
  instagram: ['shorter', 'stronger_hook', 'regenerate'],
  tiktok:    ['shorter', 'more_provocative', 'regenerate'],
  clips:     ['regenerate'],
};

export const COMMAND_LABELS: Record<QuickCommand, string> = {
  more_provocative: '🔥 Провокативніше',
  shorter:          '✂️ Коротше',
  more_specific:    '🎯 Конкретніше',
  expand:           '📝 Розширити',
  more_casual:      '💬 Розмовніше',
  stronger_hook:    '🪝 Сильніший хук',
  different_angle:  '🔄 Інший кут',
  regenerate:       '↺ Переписати',
};

// ─── App state machine ────────────────────────────────────────────────────────

export type AppState =
  | { status: 'empty' }
  | { status: 'loaded'; transcript: string; fileName: string }
  | { status: 'analyzing'; transcript: string; fileName: string }
  | { status: 'done'; transcript: string; fileName: string; result: VersionedResult }
  | { status: 'error'; message: string };

export type RegeneratingField =
  | 'titles' | 'showNotes' | 'chapters' | 'clips'
  | 'telegram' | 'linkedin' | 'instagram' | 'tiktok'
  | null;
