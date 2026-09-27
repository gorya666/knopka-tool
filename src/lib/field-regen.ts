// Shared field regeneration logic — used by useAnalyze and EpisodeView.

import {
  buildDescriptionRegeneratePrompt,
  buildPostRegeneratePrompt,
  buildTitlesRegeneratePrompt,
  buildCoverTitlesRegeneratePrompt,
  buildChaptersRegeneratePrompt,
  buildClipsRegeneratePrompt,
} from './regen-prompt'
import { callClaude, callClaudeStreaming, extractJSON, cached, plain } from './claude'
import { SHARED_SYSTEM } from './prompt'
import { applyPostFooter, stripFooterLines } from './parser'
import { lintAndFix, TITLE_HINT, COVER_HINT } from './lint-runner'
import { lintTitle, lintCover, lintPost, fixKnownNames } from './voice-lint'
import {
  DESCRIPTION_MAX_CHARS,
  PLAIN_TEXT_FORMATS,
  POST_MAX_CHARS,
  type RegeneratingField,
  type QuickCommand,
  type VersionedResult,
  type VersionedPost,
  type PostBody,
  type Chapter,
  type ClipSuggestion,
  addVersion,
  current,
  isPostField,
  postIdFromField,
  navigate,
} from '../types/podcast'

// Fields whose reply is JSON — these can't stream, we need the whole payload.
const JSON_FIELDS = new Set<string>(['titles', 'chapters', 'coverTitles', 'clips', 'guestPack'])

const REGEN_MAX_TOKENS = 2000
const LIST_MAX_TOKENS  = 4000

function findPost(result: VersionedResult, field: NonNullable<RegeneratingField>): VersionedPost | undefined {
  return result.posts.find((p) => p.id === postIdFromField(field))
}

// Pick the task text for a field. The transcript is NOT part of it — it rides
// along as its own cached block, shared with every other call for this episode.
function buildTask(
  fieldKey: NonNullable<RegeneratingField>,
  result: VersionedResult,
  command: QuickCommand,
  custom?: string,
): string {
  if (isPostField(fieldKey)) {
    const post = findPost(result, fieldKey)
    if (!post) throw new Error('Пост не знайдено')
    return buildPostRegeneratePrompt(
      { format: post.format, text: stripFooterLines(current(post.body).text) },
      command,
      custom,
    )
  }

  switch (fieldKey) {
    case 'description':
      return buildDescriptionRegeneratePrompt(current(result.description), command, custom)
    case 'titles':
      return buildTitlesRegeneratePrompt(current(result.titles), command, result.meta.guest?.name, custom)
    case 'coverTitles':
      return buildCoverTitlesRegeneratePrompt(current(result.coverTitles), command, custom)
    case 'chapters':
      return buildChaptersRegeneratePrompt(custom)
    case 'clips':
      return buildClipsRegeneratePrompt(current(result.clips), custom)
    default:
      throw new Error(`Невідоме поле: ${fieldKey}`)
  }
}

// Build the correct prompt for a field and run the API call.
// Every call carries the same cached system prompt and transcript block, so a
// regenerated field is held to the same rules as the original generation and
// costs a fraction of a fresh read.
export async function runFieldRegen(
  fieldKey: NonNullable<RegeneratingField>,
  result: VersionedResult,
  command: QuickCommand,
  transcript: string,
  onChunk?: (text: string) => void,
  custom?: string,
): Promise<string> {
  const content = [cached(transcript), plain(buildTask(fieldKey, result, command, custom))]
  const system = [cached(SHARED_SYSTEM)]
  const maxTokens = fieldKey === 'clips' || fieldKey === 'chapters' ? LIST_MAX_TOKENS : REGEN_MAX_TOKENS

  if (!JSON_FIELDS.has(fieldKey) && onChunk) {
    return callClaudeStreaming(content, system, maxTokens, onChunk)
  }
  return callClaude(content, system, maxTokens)
}

// A plain-text reply should never arrive fenced, but strip it if it does —
// a stray ``` must not reach something we publish.
function cleanText(raw: string): string {
  return fixKnownNames(raw.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim())
}

function cleanList(raw: string): string[] {
  const parsed = JSON.parse(extractJSON(raw)) as unknown
  if (!Array.isArray(parsed)) throw new Error('Очікувався список')
  return parsed.filter((x): x is string => typeof x === 'string').map((s) => fixKnownNames(s.trim()))
}

// Apply a raw Claude response to the correct field.
// Async because generated text goes through the stop-list before it lands: a
// regenerated field is held to the same bar as a generated one.
export async function applyFieldUpdate(
  result: VersionedResult,
  fieldKey: NonNullable<RegeneratingField>,
  raw: string,
): Promise<VersionedResult> {
  if (isPostField(fieldKey)) {
    const id = postIdFromField(fieldKey)
    const post = result.posts.find((p) => p.id === id)
    if (!post) return result

    const format = post.format
    const { text, lint } = await lintAndFix(cleanText(raw), (x) =>
      lintPost(x, { maxChars: POST_MAX_CHARS[format], plainText: PLAIN_TEXT_FORMATS.has(format) }),
    )
    const prev = current(post.body)
    const body: PostBody = {
      text: applyPostFooter(format, text),
      endings: prev.endings,
      firstComment: prev.firstComment,
      momentIds: prev.momentIds,
      lint,
    }

    return {
      ...result,
      posts: result.posts.map((p) => (p.id === id ? { ...p, body: addVersion(p.body, body) } : p)),
    }
  }

  switch (fieldKey) {
    case 'description': {
      const { text } = await lintAndFix(cleanText(raw), (x) =>
        lintPost(x, { maxChars: DESCRIPTION_MAX_CHARS }),
      )
      return { ...result, description: addVersion(result.description, stripFooterLines(text)) }
    }
    case 'titles': {
      const guest = result.meta.guest?.name
      const titles = await Promise.all(
        cleanList(raw).map((t) =>
          lintAndFix(t, (x) => lintTitle(x, { guest }), { hint: TITLE_HINT, maxLength: 100 }).then((r) => r.text),
        ),
      )
      return { ...result, titles: addVersion(result.titles, titles) }
    }
    case 'coverTitles': {
      const coverTitles = await Promise.all(
        cleanList(raw).map((t) =>
          lintAndFix(t, lintCover, { hint: COVER_HINT, maxLength: 60 }).then((r) => r.text),
        ),
      )
      return { ...result, coverTitles: addVersion(result.coverTitles, coverTitles) }
    }
    case 'chapters': {
      const chapters = (JSON.parse(extractJSON(raw)) as Chapter[]).map((c) => ({
        time: fixKnownNames(String(c.time ?? '').trim()),
        title: fixKnownNames(String(c.title ?? '').trim()),
      }))
      return { ...result, chapters: addVersion(result.chapters, chapters) }
    }
    case 'clips': {
      const clips = JSON.parse(extractJSON(raw)) as ClipSuggestion[]
      return { ...result, clips: addVersion(result.clips, clips) }
    }
    default:
      return result
  }
}

// Navigate a field's version history.
export function applyFieldNavigate(
  result: VersionedResult,
  fieldKey: NonNullable<RegeneratingField>,
  dir: 'prev' | 'next',
): VersionedResult {
  if (isPostField(fieldKey)) {
    const id = postIdFromField(fieldKey)
    return {
      ...result,
      posts: result.posts.map((p) => (p.id === id ? { ...p, body: navigate(p.body, dir) } : p)),
    }
  }

  switch (fieldKey) {
    case 'titles':      return { ...result, titles: navigate(result.titles, dir) }
    case 'description': return { ...result, description: navigate(result.description, dir) }
    case 'chapters':    return { ...result, chapters: navigate(result.chapters, dir) }
    case 'coverTitles': return { ...result, coverTitles: navigate(result.coverTitles, dir) }
    case 'clips':       return { ...result, clips: navigate(result.clips, dir) }
    default: return result
  }
}

// Update the "published" text a user pasted back in after posting.
export function applyPublishedText(
  result: VersionedResult,
  postId: string,
  publishedText: string,
): VersionedResult {
  return {
    ...result,
    posts: result.posts.map((p) => (p.id === postId ? { ...p, publishedText } : p)),
  }
}
