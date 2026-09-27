import {
  DEFAULT_DAY_OFFSET,
  EMPTY_META,
  POST_FORMAT_LABELS,
  SECOND_THOUGHT_DAY,
  type AnalysisCore,
  type Chapter,
  type ClipSuggestion,
  type EpisodeMeta,
  type Moment,
  type MomentKind,
  type PostFormat,
  type ShortResult,
  type SocialPack,
  type SocialPost,
  type YouTubePack,
} from '../types/podcast'
import { ANNOUNCEMENT_FOOTER, INSTAGRAM_ENDING, LINKEDIN_ENDING, YOUTUBE_FOOTER } from './prompt'
import { fillLinks, fixKnownNames } from './voice-lint'

// Placeholders stay in the stored texts; copy buttons fill them in on the way
// out, so pasting a URL after generation updates every text at once.
export function withLinks(text: string, url: string): string {
  return url.trim() ? fillLinks(text, url.trim()) : text
}

// Strip any accidental markdown fences the model wraps the JSON in, then cut to
// the outermost brackets — a trailing fence alone is enough to fail JSON.parse.
function stripFences(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.search(/[{[]/)
  if (start === -1) return trimmed
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  return end > start ? trimmed.slice(start, end + 1) : trimmed.slice(start)
}

function parseJSON(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(stripFences(raw)) as unknown
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object')
    return parsed as Record<string, unknown>
  } catch {
    throw new Error('Claude повернув невалідний JSON. Спробуй ще раз.')
  }
}

// Step 1 of the post-generation checks: known transcription errors are fixed
// everywhere, without costing a regeneration.
const str = (v: unknown): string => (typeof v === 'string' ? fixKnownNames(v.trim()) : '')

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : []

// ─── Fixed footers ────────────────────────────────────────────────────────────
// The model is told not to write these, but it sometimes does anyway. Drop any
// line carrying one of our URLs, then append the canonical footer, so the
// wording is always byte-identical.

export function stripFooterLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/base\.monobank\.ua|t\.me\/radioknopka/i.test(line))
    .join('\n')
    .trimEnd()
}

export function ensureAnnouncementFooter(text: string): string {
  return `${stripFooterLines(text)}\n\n${ANNOUNCEMENT_FOOTER}`
}

// Only the announcement carries a footer the voice guide spells out verbatim.
export function applyPostFooter(format: PostFormat, text: string): string {
  return format === 'tg_announcement' ? ensureAnnouncementFooter(text) : text.trim()
}

// YouTube reads chapters out of the description, so "copy description" hands
// over description + chapters + footer as one block.
export function buildFullDescription(description: string, chapters: Chapter[]): string {
  const chapterBlock = chapters.map((c) => `${c.time} ${c.title}`).join('\n')
  return [stripFooterLines(description), chapterBlock, YOUTUBE_FOOTER]
    .filter(Boolean)
    .join('\n\n')
}

// ─── Call 1: episode meta, moments, clip suggestions ──────────────────────────

function parseMeta(v: unknown): EpisodeMeta {
  if (typeof v !== 'object' || v === null) return EMPTY_META
  const m = v as Record<string, unknown>
  const g = m.guest as Record<string, unknown> | undefined

  const name = g ? str(g.name) : ''
  const role = g ? str(g.role) : ''

  return {
    guest: name ? { name, role } : undefined,
    hasClosedPart: m.hasClosedPart === true,
    rawTranscript: m.rawTranscript === true,
  }
}

const KINDS = new Set<MomentKind>(['insight', 'position', 'story'])

function parseMoments(v: unknown): Moment[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
    .map((m, i) => ({
      id: str(m.id) || `m${i + 1}`,
      kind: (KINDS.has(m.kind as MomentKind) ? m.kind : 'insight') as MomentKind,
      quote: str(m.quote),
      speaker: str(m.speaker),
      timestamp: str(m.timestamp),
      why: str(m.why),
    }))
    .filter((m) => m.quote)
}

function parseClips(v: unknown): ClipSuggestion[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({
      start: str(c.start),
      end: str(c.end),
      about: str(c.about),
      why: str(c.why),
    }))
    .filter((c) => c.start && c.about)
}

export function parseAnalysisCore(raw: string): AnalysisCore {
  const v = parseJSON(raw)
  const moments = parseMoments(v.moments)

  if (moments.length === 0) {
    throw new Error('Claude не знайшов жодного моменту в транскрипті. Спробуй ще раз.')
  }

  return { meta: parseMeta(v.meta), moments, clips: parseClips(v.clips) }
}

// ─── Call 2: the YouTube pack ─────────────────────────────────────────────────

function parseChapters(v: unknown): Chapter[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({ time: str(c.time), title: str(c.title) }))
    .filter((c) => c.time && c.title)
}

export function parseYouTubePack(raw: string): YouTubePack {
  const v = parseJSON(raw)

  const titles = strList(v.titles)
  const description = str(v.description)

  if (titles.length === 0) throw new Error('Claude не повернув жодної назви. Спробуй ще раз.')
  if (!description) throw new Error('Claude не повернув опис епізоду. Спробуй ще раз.')

  return {
    titles,
    description: stripFooterLines(description),
    chapters: parseChapters(v.chapters),
    coverTitles: strList(v.coverTitles),
  }
}

// ─── Call 3: posts + the guest pack ───────────────────────────────────────────

const KNOWN_FORMATS = new Set(Object.keys(POST_FORMAT_LABELS))

function isPostFormat(v: unknown): v is PostFormat {
  return typeof v === 'string' && KNOWN_FORMATS.has(v)
}

function dayOffsetFor(format: PostFormat, raw: unknown, seen: number): number {
  // A second single thought belongs on day 11, per the calendar.
  if (format === 'tg_single_thought' && seen > 1) return SECOND_THOUGHT_DAY
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
    ? raw
    : DEFAULT_DAY_OFFSET[format]
}

export function parseSocialPack(raw: string): SocialPack {
  const v = parseJSON(raw)
  const list = Array.isArray(v.posts) ? v.posts : []

  const counters = new Map<PostFormat, number>()
  const posts: SocialPost[] = []

  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const p = item as Record<string, unknown>
    if (!isPostFormat(p.format)) continue

    const text = str(p.text)
    if (!text) continue

    const n = (counters.get(p.format) ?? 0) + 1
    counters.set(p.format, n)

    const isTop5 = p.format === 'top5_ig_linkedin'

    posts.push({
      id: `${p.format}_${n}`,
      format: p.format,
      text: applyPostFooter(p.format, text),
      // The sign-offs are fixed in the voice guide, so we never take the model's.
      endings: isTop5 ? { instagram: INSTAGRAM_ENDING, linkedin: LINKEDIN_ENDING } : undefined,
      firstComment: isTop5 ? str(p.firstComment) || undefined : undefined,
      momentIds: strList(p.momentIds),
      dayOffset: dayOffsetFor(p.format, p.dayOffset, n),
    })
  }

  if (posts.length === 0) {
    throw new Error('Claude не повернув жодного поста. Спробуй ще раз.')
  }

  return { posts }
}

// ─── Short mode ───────────────────────────────────────────────────────────────

export function parseShortResult(raw: string): ShortResult {
  const v = parseJSON(raw)
  const thumbnailTitle = str(v.thumbnailTitle)
  const socialCaption = str(v.socialCaption)

  if (!thumbnailTitle || !socialCaption) {
    throw new Error('Структура відповіді не відповідає очікуваній. Спробуй ще раз.')
  }

  return { thumbnailTitle, socialCaption }
}
