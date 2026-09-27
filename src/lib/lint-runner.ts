// The post-generation checks, in the order the brief sets out:
//   1. fixKnownNames — done in the parser, on every string
//   2. lint with the right checker per kind of text
//   3. rewrite whatever a blocking rule catches, at most twice
//   4. make sure two posts never retell the same moment
//
// Warnings are never auto-fixed — they go to the UI as badges for a human.
// Fixed footers are stripped before linting and re-applied after, so the model
// never gets a chance to reword a URL and the footer does not eat the budget.

import {
  lintPost,
  lintTitle,
  lintCover,
  buildFixPrompt,
  type Issue,
  type LintResult,
} from './voice-lint'
import { callClaude, cached, plain } from './claude'
import { describeLeaks, type LeakDetector } from './guide-leak'
import { SHARED_SYSTEM } from './prompt'
import { applyPostFooter, stripFooterLines } from './parser'
import {
  DESCRIPTION_MAX_CHARS,
  PLAIN_TEXT_FORMATS,
  POST_MAX_CHARS,
  SHARED_MOMENT_FORMATS,
  type AnalysisCore,
  type EpisodeMeta,
  type LintReport,
  type Moment,
  type SocialPack,
  type SocialPost,
  type YouTubePack,
} from '../types/podcast'

const MAX_FIX_ATTEMPTS = 2
const FIX_MAX_TOKENS = 2000

function describe(issue: Issue): string {
  const match = issue.match.trim()
  return match ? `${issue.rule}: «${match}»` : issue.rule
}

export function toLintReport(result: LintResult): LintReport {
  return {
    blocks: result.blocks.map(describe),
    warnings: result.warnings.map(describe),
  }
}

type Checker = (text: string) => LintResult

const LEAK_RULE = 'скопійовано з прикладу в інструкції'

// Fold the guide-leak check into an ordinary checker, so a copied example
// blocks and gets rewritten exactly like any stop-list hit.
function withLeakCheck(check: Checker, leak?: LeakDetector): Checker {
  if (!leak) return check
  return (text) => {
    const base = check(text)
    const leaks = leak(text)
    if (leaks.length === 0) return base
    return {
      blocks: [...base.blocks, { rule: LEAK_RULE, match: leaks.join(', ') }],
      warnings: base.warnings,
    }
  }
}

// Some rules are mechanical, and the generic fix prompt keeps missing them —
// a long list post naturally grows subject–predicate dashes, and the model
// rewrites the wording without ever counting them. Spell those out.
function extraGuidance(result: LintResult): string | undefined {
  const leak = result.blocks.find((b) => b.rule === LEAK_RULE)
  if (leak) return describeLeaks(leak.match.split(', '))

  if (result.blocks.some((b) => b.rule.startsWith('тире:'))) {
    return 'НАЙВАЖЛИВІШЕ: у тексті забагато тире «—». Залиш максимум одне на весь текст. ' +
      'Решту перепиши: кома, двокрапка або два окремі речення. Перерахуй тире перед тим, як віддати.'
  }
  return undefined
}

async function rewrite(text: string, result: LintResult, hint?: string): Promise<string> {
  const notes = [hint, extraGuidance(result)].filter(Boolean)
  const prompt = [buildFixPrompt(text, result), ...notes].join('\n\n')
  return callClaude([plain(prompt)], [cached(SHARED_SYSTEM)], FIX_MAX_TOKENS)
}

export interface LintedText {
  text: string
  lint: LintReport
}

export interface FixOptions {
  // buildFixPrompt is written for posts ("перепиши пост"), so a title sent
  // through it comes back as a post. Say what is actually being rewritten.
  hint?: string
  // Titles and cover headings are one line. A rewrite that grows paragraphs
  // has drifted, and we keep the original instead.
  maxLength?: number
}

const isOneLine = (text: string, max: number) => !text.includes('\n') && text.length <= max

// Lint one piece of text, rewriting it while it still trips a blocking rule.
// Always resolves — a failed fix call just means the text keeps its blocks and
// the UI shows them.
export async function lintAndFix(
  input: string,
  check: Checker,
  opts: FixOptions = {},
): Promise<LintedText> {
  let text = input
  let result = check(text)

  for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS && result.blocks.length > 0; attempt++) {
    let next: string
    try {
      next = (await rewrite(text, result, opts.hint)).trim()
    } catch {
      break
    }
    if (!next) break
    // A one-liner that came back as prose is worse than the original.
    if (opts.maxLength && !isOneLine(next, opts.maxLength)) break

    text = next
    result = check(text)
  }

  return { text, lint: toLintReport(result) }
}

export const TITLE_HINT =
  'УВАГА: це НАЗВА епізоду для YouTube, не пост. Поверни рівно один рядок, 40–70 знаків, ' +
  'без переносів рядків і без пояснень.'

export const COVER_HINT =
  'УВАГА: це ЗАГОЛОВОК НА ОБКЛАДИНКУ, не пост. Поверни рівно один рядок з 3–7 слів, ' +
  'без переносів рядків і без пояснень.'

export function lintPostOnly(format: SocialPost['format'], text: string): LintReport {
  return toLintReport(postChecker(format)(stripFooterLines(text)))
}

function postChecker(format: SocialPost['format']): Checker {
  const opts = { maxChars: POST_MAX_CHARS[format], plainText: PLAIN_TEXT_FORMATS.has(format) }
  return (text) => lintPost(text, opts)
}

// ─── Analysis core ────────────────────────────────────────────────────────────
// Moments and clips skip the post pipeline, so nothing else would catch a
// swear word left in a quote. Moments feed every later call, and clip
// descriptions are on screen, so both get cleaned before anything uses them.

export async function lintAnalysisCore(core: AnalysisCore, leak?: LeakDetector): Promise<AnalysisCore> {
  // Quotes are lifted from the transcript, so only the clip write-ups can
  // drift; the leak check rides along on both for free.
  const check: Checker = withLeakCheck((x) => lintPost(x), leak)

  const [moments, clips] = await Promise.all([
    Promise.all(
      core.moments.map(async (m) => ({
        ...m,
        quote: (await lintAndFix(m.quote, check)).text,
      })),
    ),
    Promise.all(
      core.clips.map(async (c) => ({
        ...c,
        about: (await lintAndFix(c.about, check)).text,
        why: (await lintAndFix(c.why, check)).text,
      })),
    ),
  ])

  return { ...core, moments, clips }
}

// ─── YouTube pack ─────────────────────────────────────────────────────────────

export async function lintYouTubePack(
  pack: YouTubePack,
  meta: EpisodeMeta,
  leak?: LeakDetector,
): Promise<YouTubePack> {
  const guest = meta.guest?.name
  const titleCheck = withLeakCheck((x) => lintTitle(x, { guest }), leak)
  const coverCheck = withLeakCheck(lintCover, leak)
  const descCheck = withLeakCheck((x) => lintPost(x, { maxChars: DESCRIPTION_MAX_CHARS }), leak)

  const [titles, description, coverTitles] = await Promise.all([
    Promise.all(pack.titles.map((t) =>
      lintAndFix(t, titleCheck, { hint: TITLE_HINT, maxLength: 100 }).then((r) => r.text),
    )),
    lintAndFix(pack.description, descCheck).then((r) => r.text),
    Promise.all(pack.coverTitles.map((t) =>
      lintAndFix(t, coverCheck, { hint: COVER_HINT, maxLength: 60 }).then((r) => r.text),
    )),
  ])

  return { ...pack, titles, description: stripFooterLines(description), coverTitles }
}

// ─── Posts ────────────────────────────────────────────────────────────────────

async function lintOnePost(post: SocialPost, leak?: LeakDetector): Promise<SocialPost> {
  const check = withLeakCheck(postChecker(post.format), leak)
  const body = await lintAndFix(stripFooterLines(post.text), check)

  // The first comment goes out on LinkedIn too, so it gets the same plain-text
  // treatment. It is mostly links, so we only label it, never rewrite it.
  const firstComment = post.firstComment
  const commentIssues = firstComment
    ? toLintReport(lintPost(firstComment, { plainText: true }))
    : undefined

  const lint: LintReport = commentIssues
    ? {
        blocks: [...body.lint.blocks, ...commentIssues.blocks.map((b) => `перший коментар — ${b}`)],
        warnings: [...body.lint.warnings, ...commentIssues.warnings.map((w) => `перший коментар — ${w}`)],
      }
    : body.lint

  return { ...post, text: applyPostFooter(post.format, body.text), lint }
}

// Rule 9: a moment belongs to one post. The announcement and the top five
// survey the whole episode, so they are exempt; everyone else gets rewritten
// onto a moment nobody has taken.
async function separateStories(
  posts: SocialPost[],
  moments: Moment[],
  leak?: LeakDetector,
): Promise<SocialPost[]> {
  const byId = new Map(moments.map((m) => [m.id, m]))
  const taken = new Set<string>()
  let storyPostUsed = false
  const out: SocialPost[] = []

  for (const post of posts) {
    if (SHARED_MOMENT_FORMATS.has(post.format)) {
      out.push(post)
      continue
    }

    const usesTaken = post.momentIds.some((id) => taken.has(id))
    const usesStory = post.momentIds.some((id) => byId.get(id)?.kind === 'story')
    const tooManyStories = usesStory && storyPostUsed

    if (usesTaken || tooManyStories) {
      const free = moments.filter(
        (m) => !taken.has(m.id) && (m.kind !== 'story' || !storyPostUsed),
      )
      const rewritten = await retargetPost(post, free, leak)
      if (rewritten) {
        out.push(rewritten)
        rewritten.momentIds.forEach((id) => taken.add(id))
        if (rewritten.momentIds.some((id) => byId.get(id)?.kind === 'story')) storyPostUsed = true
        continue
      }
    }

    post.momentIds.forEach((id) => taken.add(id))
    if (usesStory) storyPostUsed = true
    out.push(post)
  }

  return out
}

async function retargetPost(
  post: SocialPost,
  free: Moment[],
  leak?: LeakDetector,
): Promise<SocialPost | null> {
  if (free.length === 0) return null

  const options = free
    .map((m) => `${m.id} [${m.kind}] ${m.timestamp} ${m.speaker}: «${m.quote}»`)
    .join('\n\n')

  const prompt = `Перепиши цей пост для Радіо Кнопки так, щоб він спирався на ІНШИЙ момент епізоду.
Той момент, на якому він побудований зараз, уже зайнятий іншим постом — правило 9 у гайді.

Формат і призначення поста не міняй.

Вільні моменти, бери один з них:
${options}

Поточний пост:
${post.text}

Поверни ТІЛЬКИ JSON: { "text": "новий текст поста", "momentIds": ["id обраного моменту"] }`

  let raw: string
  try {
    raw = await callClaude([plain(prompt)], [cached(SHARED_SYSTEM)], FIX_MAX_TOKENS)
  } catch {
    return null
  }

  // Prefer the JSON, but a bare-prose reply is still a usable rewrite — better
  // than leaving two posts telling the same story.
  let text = ''
  let momentIds: string[] = [free[0].id]
  const start = raw.search(/[{[]/)
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'))

  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { text?: string; momentIds?: string[] }
      text = parsed.text?.trim() ?? ''
      if (Array.isArray(parsed.momentIds) && parsed.momentIds.length > 0) momentIds = parsed.momentIds
    } catch { /* fall through to the prose path */ }
  }
  if (!text) text = raw.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()
  if (!text) return null

  const relinted = await lintAndFix(
    stripFooterLines(text),
    withLeakCheck(postChecker(post.format), leak),
  )

  return {
    ...post,
    text: applyPostFooter(post.format, relinted.text),
    momentIds,
    lint: relinted.lint,
  }
}

export async function lintSocialPack(
  pack: SocialPack,
  moments: Moment[],
  leak?: LeakDetector,
): Promise<SocialPack> {
  const posts = await Promise.all(pack.posts.map((p) => lintOnePost(p, leak)))
  return { posts: await separateStories(posts, moments, leak) }
}
