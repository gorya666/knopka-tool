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

// ─── What the tool works out from the transcript ──────────────────────────────

export interface EpisodeGuest {
  name: string;
  role: string;
}

export interface EpisodeMeta {
  guest?: EpisodeGuest;
  // Hosts say this out loud: "закрита частина", "для тіммейтів"
  hasClosedPart: boolean;
  // A transcript of the raw take still has "камера, мікрофон, дай ще раз" at
  // the top, which means its timecodes will not line up with the cut video.
  rawTranscript: boolean;
}

export const EMPTY_META: EpisodeMeta = { hasClosedPart: false, rawTranscript: false };

// ─── Core content ─────────────────────────────────────────────────────────────

export interface Chapter {
  time: string;
  title: string;
}

// думка | позиція | історія. Titles, covers, the announcement list and the top
// five are built on insights and positions only — stories are colour, and get
// at most one post each (voice guide, rules 9 and 10).
export type MomentKind = 'insight' | 'position' | 'story';

// Working material the posts are written from — deliberately not shown in the UI.
export interface Moment {
  id: string;
  kind: MomentKind;
  quote: string;
  speaker: string;
  timestamp: string;
  why: string;
}

// A backup for the moments Riverside Magic Clips might miss.
export interface ClipSuggestion {
  start: string;
  end: string;
  about: string;
  why: string;
}

export type PostFormat =
  | 'tg_announcement' | 'tg_carousel_1_2_3' | 'tg_single_thought'
  | 'tg_question' | 'tg_closed_teaser' | 'top5_ig_linkedin';

// The top five post is one text with two sign-offs — the body is shared, only
// the last line differs per platform.
export interface PostEndings {
  instagram: string;
  linkedin: string;
}

// Stop-list findings. `blocks` trigger an automatic rewrite, `warnings` are
// shown as badges and left for a human to judge.
export interface LintReport {
  blocks: string[];
  warnings: string[];
}

export interface SocialPost {
  id: string;
  format: PostFormat;
  text: string;
  endings?: PostEndings;
  // top5 only: episode link plus a timestamped line per thought.
  firstComment?: string;
  // Which moments this post is built on, so two posts never retell one story.
  momentIds: string[];
  dayOffset: number;
  lint?: LintReport;
  publishedText?: string;
}

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  tg_announcement:   'анонс епізоду',
  tg_carousel_1_2_3: 'нарізка 1/2/3',
  tg_single_thought: 'окрема думка',
  tg_question:       'питання з опитуванням',
  tg_closed_teaser:  'тізер закритої частини',
  top5_ig_linkedin:  'топ-5 думок — instagram + linkedin',
};

// Length limits from the brief.
export const POST_MAX_CHARS: Record<PostFormat, number> = {
  tg_announcement:   1200,
  tg_carousel_1_2_3: 1200,
  tg_single_thought:  600,
  tg_question:        600,
  tg_closed_teaser:   600,
  top5_ig_linkedin:  1400,
};

export const DESCRIPTION_MAX_CHARS = 1200;

// Platforms that do not render markdown, so `**` would show up literally.
export const PLAIN_TEXT_FORMATS = new Set<PostFormat>(['top5_ig_linkedin']);

// Fallback schedule from the «Календар» section, used when the model omits or
// invents a day. The second single thought moves to day 11 in the parser.
export const DEFAULT_DAY_OFFSET: Record<PostFormat, number> = {
  tg_announcement:    0,
  top5_ig_linkedin:   0,
  tg_carousel_1_2_3:  2,
  tg_single_thought:  4,
  tg_question:        6,
  tg_closed_teaser:   9,
};

export const SECOND_THOUGHT_DAY = 11;

// Posts that may reuse a moment another post already used: the announcement
// summarises the whole episode, and the top five spans all of it.
export const SHARED_MOMENT_FORMATS = new Set<PostFormat>(['tg_announcement', 'top5_ig_linkedin']);

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface AnalysisResult {
  meta: EpisodeMeta;
  titles: string[];          // 5
  description: string;       // без чаптерів і футера — їх додає «копіювати опис»
  chapters: Chapter[];
  coverTitles: string[];     // 3
  clips: ClipSuggestion[];   // 3
  moments: Moment[];         // internal
  posts: SocialPost[];
  youtubeUrl?: string;       // pasted after generation, fills every [посилання]
}

// What each call returns on its own.
export type AnalysisCore = Pick<AnalysisResult, 'meta' | 'moments' | 'clips'>;
export type YouTubePack = Pick<AnalysisResult, 'titles' | 'description' | 'chapters' | 'coverTitles'>;
export type SocialPack = Pick<AnalysisResult, 'posts'>;

// ─── Versioned result ─────────────────────────────────────────────────────────

// The part of a post that changes when it is regenerated — everything else
// identifies the post and stays put across versions.
export interface PostBody {
  text: string;
  endings?: PostEndings;
  firstComment?: string;
  momentIds: string[];
  lint: LintReport;
}

export interface VersionedPost {
  id: string;
  format: PostFormat;
  dayOffset: number;
  body: FieldHistory<PostBody>;
  publishedText: string;
}

export interface VersionedResult {
  meta: EpisodeMeta;
  titles: FieldHistory<string[]>;
  description: FieldHistory<string>;
  chapters: FieldHistory<Chapter[]>;
  coverTitles: FieldHistory<string[]>;
  clips: FieldHistory<ClipSuggestion[]>;
  moments: FieldHistory<Moment[]>;
  posts: VersionedPost[];
  youtubeUrl: string;
}

export function toVersionedPost(post: SocialPost): VersionedPost {
  return {
    id: post.id,
    format: post.format,
    dayOffset: post.dayOffset,
    body: createHistory({
      text: post.text,
      endings: post.endings,
      firstComment: post.firstComment,
      momentIds: post.momentIds ?? [],
      lint: post.lint ?? { blocks: [], warnings: [] },
    }),
    publishedText: post.publishedText ?? '',
  };
}

export function fromVersionedPost(post: VersionedPost): SocialPost {
  const body = current(post.body);
  return {
    id: post.id,
    format: post.format,
    dayOffset: post.dayOffset,
    text: body.text,
    endings: body.endings,
    firstComment: body.firstComment,
    momentIds: body.momentIds,
    lint: body.lint,
    publishedText: post.publishedText,
  };
}

// `?? …` throughout: episodes saved by an earlier version of the tool still load.
export function toVersionedResult(result: AnalysisResult): VersionedResult {
  return {
    meta: result.meta ?? EMPTY_META,
    titles: createHistory(result.titles ?? []),
    description: createHistory(result.description ?? ''),
    chapters: createHistory(result.chapters ?? []),
    coverTitles: createHistory(result.coverTitles ?? []),
    clips: createHistory(result.clips ?? []),
    moments: createHistory(result.moments ?? []),
    posts: (result.posts ?? []).map(toVersionedPost),
    youtubeUrl: result.youtubeUrl ?? '',
  };
}

// Flatten back to the plain shape we persist in localStorage.
export function fromVersionedResult(result: VersionedResult): AnalysisResult {
  return {
    meta: result.meta,
    titles: current(result.titles),
    description: current(result.description),
    chapters: current(result.chapters),
    coverTitles: current(result.coverTitles),
    clips: current(result.clips),
    moments: current(result.moments),
    posts: result.posts.map(fromVersionedPost),
    youtubeUrl: result.youtubeUrl,
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
  titles:      ['more_specific', 'shorter', 'different_angle', 'regenerate'],
  description: ['shorter', 'expand', 'more_casual', 'regenerate'],
  coverTitles: ['shorter', 'more_specific', 'regenerate'],
  chapters:    ['regenerate'],
  clips:       ['regenerate'],
  post:        ['shorter', 'stronger_hook', 'more_casual', 'different_angle', 'regenerate'],
};

export const COMMAND_LABELS: Record<QuickCommand, string> = {
  more_provocative: 'провокативніше',
  shorter:          'коротше',
  more_specific:    'конкретніше',
  expand:           'розширити',
  more_casual:      'розмовніше',
  stronger_hook:    'сильніший хук',
  different_angle:  'інший кут',
  regenerate:       'переписати',
}

// Nerd Font icons for each command (Font Awesome range, via Symbols Nerd Font)
export const COMMAND_ICONS: Record<QuickCommand, string> = {
  more_provocative: '', // fa-fire
  shorter:          '', // fa-scissors
  more_specific:    '', // fa-dot-circle
  expand:           '', // fa-plus-square
  more_casual:      '', // fa-comments
  stronger_hook:    '', // fa-bolt
  different_angle:  '', // fa-refresh
  regenerate:       '', // fa-repeat
};

// ─── Short mode ───────────────────────────────────────────────────────────────

export type AppMode = 'podcast' | 'short'

export const SHORT_THRESHOLD = 5000  // chars — below this auto-suggest short mode

export interface ShortResult {
  thumbnailTitle: string
  socialCaption: string
}

export interface VersionedShortResult {
  thumbnailTitle: FieldHistory<string>
  socialCaption:  FieldHistory<string>
}

export function toVersionedShortResult(r: ShortResult): VersionedShortResult {
  return {
    thumbnailTitle: createHistory(r.thumbnailTitle),
    socialCaption:  createHistory(r.socialCaption),
  }
}

// ─── App state machine ────────────────────────────────────────────────────────

// Podcast analysis runs in four passes: what the episode is, the YouTube pack,
// the posts, then the checks over everything written.
export type AnalyzePhase = 'analysis' | 'youtube' | 'social' | 'lint'

export const PHASE_LABELS: Record<AnalyzePhase, string> = {
  analysis: 'читаю транскрипт',
  youtube:  'пишу назви й опис',
  social:   'пишу пости',
  lint:     'перевіряю за стоп-листом',
}

export type AppState =
  | { status: 'empty' }
  | { status: 'loaded'; transcript: string; fileName: string; mode: AppMode }
  | { status: 'analyzing'; transcript: string; fileName: string; mode: AppMode; streamingText: string; phase: AnalyzePhase }
  | { status: 'done'; transcript: string; fileName: string; mode: 'podcast'; result: VersionedResult }
  | { status: 'done'; transcript: string; fileName: string; mode: 'short'; shortResult: VersionedShortResult }
  | { status: 'error'; message: string };

export type RegeneratingField =
  | 'titles' | 'description' | 'chapters' | 'coverTitles' | 'clips'
  | `post_${string}`
  | 'thumbnailTitle' | 'socialCaption'
  | null;

export function isPostField(field: NonNullable<RegeneratingField>): boolean {
  return field.startsWith('post_');
}

export function postIdFromField(field: NonNullable<RegeneratingField>): string {
  return field.slice('post_'.length);
}
