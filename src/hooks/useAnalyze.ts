import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SHARED_SYSTEM, buildAnalysisTask, buildYoutubeTask, buildSocialTask } from '../lib/prompt'
import { SHORT_PROMPT } from '../lib/short-prompt'
import { callClaudeStreaming, cached, plain } from '../lib/claude'
import { parseAnalysisCore, parseYouTubePack, parseSocialPack, parseShortResult } from '../lib/parser'
import { lintAnalysisCore, lintYouTubePack, lintSocialPack } from '../lib/lint-runner'
import { buildLeakDetector } from '../lib/guide-leak'
import {
  runFieldRegen,
  applyFieldUpdate,
  applyFieldNavigate,
  applyPublishedText,
} from '../lib/field-regen'
import {
  type AppState,
  type AnalyzePhase,
  type RegeneratingField,
  type QuickCommand,
  type VersionedShortResult,
  type ShortResult,
  SHORT_THRESHOLD,
  toVersionedResult,
  toVersionedShortResult,
  navigate,
  addVersion,
  current,
} from '../types/podcast'

// Generous ceilings — a truncated JSON payload fails the whole run, and unused
// headroom costs nothing.
const ANALYSIS_MAX_TOKENS = 8000
const YOUTUBE_MAX_TOKENS  = 4000
const SOCIAL_MAX_TOKENS   = 8000

interface UseAnalyzeReturn {
  appState: AppState
  setAppState: Dispatch<SetStateAction<AppState>>
  regeneratingField: RegeneratingField
  regenStreamText: string
  regenError: string | null
  analyze: (transcript: string, fileName: string) => Promise<void>
  regenerateField: (fieldKey: NonNullable<RegeneratingField>, command: QuickCommand, customInstruction?: string) => Promise<void>
  navigateField: (fieldKey: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
  setPublishedText: (postId: string, text: string) => void
  setYoutubeUrl: (url: string) => void
  regenerateShortField: (field: keyof ShortResult) => Promise<void>
  navigateShortField: (field: keyof ShortResult, dir: 'prev' | 'next') => void
}

export function useAnalyze(): UseAnalyzeReturn {
  const [appState, setAppState] = useState<AppState>({ status: 'empty' })
  const [regeneratingField, setRegeneratingField] = useState<RegeneratingField>(null)
  const [regenStreamText, setRegenStreamText] = useState<string>('')
  const [regenError, setRegenError] = useState<string | null>(null)

  const streamInto = (text: string) => {
    setAppState((prev) => (prev.status === 'analyzing' ? { ...prev, streamingText: text } : prev))
  }

  const enterPhase = (phase: AnalyzePhase) => {
    setAppState((prev) => (prev.status === 'analyzing' ? { ...prev, phase, streamingText: '' } : prev))
  }

  const analyze = async (transcript: string, fileName: string): Promise<void> => {
    const mode = transcript.length < SHORT_THRESHOLD ? 'short' : 'podcast'
    setAppState({ status: 'analyzing', transcript, fileName, mode, streamingText: '', phase: 'analysis' })

    try {
      if (mode === 'short') {
        const raw = await callClaudeStreaming([plain(transcript)], [plain(SHORT_PROMPT)], 500, streamInto)
        const versioned = toVersionedShortResult(parseShortResult(raw))
        setAppState((prev) => {
          if (prev.status !== 'analyzing') return prev
          return { status: 'done', transcript: prev.transcript, fileName: prev.fileName, mode: 'short', shortResult: versioned }
        })
        return
      }

      // Every pass shares one cached system prompt and one cached transcript
      // block, so only the task text is billed at full price after pass 1.
      const system = [cached(SHARED_SYSTEM)]
      const body = (task: string) => [cached(transcript), plain(task)]
      // Anything from the guide's worked examples that this episode never
      // mentions is treated as a copy and rewritten.
      const leak = buildLeakDetector(transcript)

      // Pass 1 — what this episode is, plus the working material. Cleaned
      // straight away: every later call builds on these quotes.
      const core = await lintAnalysisCore(
        parseAnalysisCore(
          await callClaudeStreaming(body(buildAnalysisTask()), system, ANALYSIS_MAX_TOKENS, streamInto),
        ),
        leak,
      )

      // Passes 2 and 3 both build on the moments: titles and covers only on
      // insights and positions, posts on all of them.
      enterPhase('youtube')
      const youtube = parseYouTubePack(
        await callClaudeStreaming(
          body(buildYoutubeTask(core.meta, core.moments)),
          system, YOUTUBE_MAX_TOKENS, streamInto,
        ),
      )

      enterPhase('social')
      const social = parseSocialPack(
        await callClaudeStreaming(
          body(buildSocialTask(core.meta, core.moments)),
          system, SOCIAL_MAX_TOKENS, streamInto,
        ),
      )

      // Pass 4 — stop-list over everything written, then separate the stories.
      enterPhase('lint')
      const [lintedYoutube, lintedSocial] = await Promise.all([
        lintYouTubePack(youtube, core.meta, leak),
        lintSocialPack(social, core.moments, leak),
      ])

      const versioned = toVersionedResult({
        meta: core.meta,
        moments: core.moments,
        clips: core.clips,
        ...lintedYoutube,
        ...lintedSocial,
      })

      setAppState((prev) => {
        if (prev.status !== 'analyzing') return prev
        return { status: 'done', transcript: prev.transcript, fileName: prev.fileName, mode: 'podcast', result: versioned }
      })
    } catch (err) {
      setAppState({ status: 'error', message: err instanceof Error ? err.message : 'Невідома помилка' })
    }
  }

  // ── Podcast field regeneration ────────────────────────────────────────────

  const regenerateField = async (
    fieldKey: NonNullable<RegeneratingField>,
    command: QuickCommand,
    customInstruction?: string,
  ): Promise<void> => {
    if (appState.status !== 'done' || appState.mode !== 'podcast') return
    const snapshot = appState.result
    const transcript = appState.transcript
    setRegeneratingField(fieldKey)
    setRegenStreamText('')
    setRegenError(null)
    try {
      const raw = await runFieldRegen(fieldKey, snapshot, command, transcript, setRegenStreamText, customInstruction)
      // Compute the update here (inside try/catch) — NOT inside the setState
      // updater, because React runs updaters during render and a parse error
      // there would escape this try/catch and crash the whole app.
      const updated = await applyFieldUpdate(snapshot, fieldKey, raw)
      setAppState((prev) => {
        if (prev.status !== 'done' || prev.mode !== 'podcast') return prev
        return { ...prev, result: updated }
      })
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegeneratingField(null)
      setRegenStreamText('')
    }
  }

  const navigateField = (fieldKey: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => {
    setAppState((prev) => {
      if (prev.status !== 'done' || prev.mode !== 'podcast') return prev
      return { ...prev, result: applyFieldNavigate(prev.result, fieldKey, dir) }
    })
  }

  const setPublishedText = (postId: string, text: string) => {
    setAppState((prev) => {
      if (prev.status !== 'done' || prev.mode !== 'podcast') return prev
      return { ...prev, result: applyPublishedText(prev.result, postId, text) }
    })
  }

  // Stored on the result rather than applied to the texts: placeholders stay in
  // place, and every copy button fills them in on the way out.
  const setYoutubeUrl = (url: string) => {
    setAppState((prev) => {
      if (prev.status !== 'done' || prev.mode !== 'podcast') return prev
      return { ...prev, result: { ...prev.result, youtubeUrl: url } }
    })
  }

  // ── Short mode field regeneration ─────────────────────────────────────────

  const regenerateShortField = async (field: keyof ShortResult): Promise<void> => {
    if (appState.status !== 'done' || appState.mode !== 'short') return
    const transcript = appState.transcript

    setRegeneratingField(field)
    setRegenStreamText('')
    setRegenError(null)

    try {
      // Re-run the full short prompt — cheap (500 tokens) and gets fresh results
      const raw = await callClaudeStreaming(
        [plain(transcript)],
        [plain(SHORT_PROMPT)],
        500,
        (text) => setRegenStreamText(text),
      )
      const fresh = parseShortResult(raw)

      setAppState((prev) => {
        if (prev.status !== 'done' || prev.mode !== 'short') return prev
        const updated: VersionedShortResult = {
          thumbnailTitle: field === 'thumbnailTitle'
            ? addVersion(prev.shortResult.thumbnailTitle, fresh.thumbnailTitle)
            : prev.shortResult.thumbnailTitle,
          socialCaption: field === 'socialCaption'
            ? addVersion(prev.shortResult.socialCaption, fresh.socialCaption)
            : prev.shortResult.socialCaption,
        }
        return { ...prev, shortResult: updated }
      })
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegeneratingField(null)
      setRegenStreamText('')
    }
  }

  const navigateShortField = (field: keyof ShortResult, dir: 'prev' | 'next') => {
    setAppState((prev) => {
      if (prev.status !== 'done' || prev.mode !== 'short') return prev
      const updated: VersionedShortResult = {
        ...prev.shortResult,
        [field]: navigate(prev.shortResult[field], dir),
      }
      return { ...prev, shortResult: updated }
    })
  }

  return {
    appState, setAppState,
    regeneratingField, regenStreamText, regenError,
    analyze,
    regenerateField, navigateField, setPublishedText, setYoutubeUrl,
    regenerateShortField, navigateShortField,
  }
}

// Re-export for convenience — callers that only need current value of a short field
export { current }
