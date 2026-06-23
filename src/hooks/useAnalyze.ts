import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SYSTEM_PROMPT } from '../lib/prompt'
import { SHORT_PROMPT } from '../lib/short-prompt'
import { callClaudeStreaming } from '../lib/claude'
import { parseAnalysisResult, parseShortResult } from '../lib/parser'
import { runFieldRegen, applyFieldUpdate } from '../lib/field-regen'
import {
  type AppState,
  type RegeneratingField,
  type QuickCommand,
  type VersionedResult,
  type VersionedShortResult,
  type ShortResult,
  SHORT_THRESHOLD,
  toVersionedResult,
  toVersionedShortResult,
  navigate,
  addVersion,
  current,
} from '../types/podcast'

interface UseAnalyzeReturn {
  appState: AppState
  setAppState: Dispatch<SetStateAction<AppState>>
  regeneratingField: RegeneratingField
  regenStreamText: string
  regenError: string | null
  analyze: (transcript: string, fileName: string) => Promise<void>
  regenerateField: (fieldKey: NonNullable<RegeneratingField>, command: QuickCommand, customInstruction?: string) => Promise<void>
  navigateField: (fieldKey: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
  regenerateShortField: (field: keyof ShortResult) => Promise<void>
  navigateShortField: (field: keyof ShortResult, dir: 'prev' | 'next') => void
}

export function useAnalyze(): UseAnalyzeReturn {
  const [appState, setAppState] = useState<AppState>({ status: 'empty' })
  const [regeneratingField, setRegeneratingField] = useState<RegeneratingField>(null)
  const [regenStreamText, setRegenStreamText] = useState<string>('')
  const [regenError, setRegenError] = useState<string | null>(null)

  const analyze = async (transcript: string, fileName: string): Promise<void> => {
    const mode = transcript.length < SHORT_THRESHOLD ? 'short' : 'podcast'
    setAppState({ status: 'analyzing', transcript, fileName, mode, streamingText: '' })

    try {
      if (mode === 'short') {
        const raw = await callClaudeStreaming(
          [{ role: 'user', content: transcript }],
          SHORT_PROMPT,
          500,
          (text) => {
            setAppState((prev) =>
              prev.status === 'analyzing' ? { ...prev, streamingText: text } : prev,
            )
          },
        )
        const result = parseShortResult(raw)
        const versioned = toVersionedShortResult(result)
        setAppState((prev) => {
          if (prev.status !== 'analyzing') return prev
          return { status: 'done', transcript: prev.transcript, fileName: prev.fileName, mode: 'short', shortResult: versioned }
        })
      } else {
        const raw = await callClaudeStreaming(
          [{ role: 'user', content: transcript }],
          SYSTEM_PROMPT,
          4000,
          (text) => {
            setAppState((prev) =>
              prev.status === 'analyzing' ? { ...prev, streamingText: text } : prev,
            )
          },
        )
        const result = parseAnalysisResult(raw)
        const versioned = toVersionedResult(result)
        setAppState((prev) => {
          if (prev.status !== 'analyzing') return prev
          return { status: 'done', transcript: prev.transcript, fileName: prev.fileName, mode: 'podcast', result: versioned }
        })
      }
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
      const raw = await runFieldRegen(
        fieldKey,
        snapshot,
        command,
        transcript,
        setRegenStreamText,
        customInstruction,
      )
      // Compute the update here (inside try/catch) — NOT inside the setState
      // updater, because React runs updaters during render and a parse error
      // there would escape this try/catch and crash the whole app.
      const updated = applyFieldUpdate(snapshot, fieldKey, raw)
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
        [{ role: 'user', content: transcript }],
        SHORT_PROMPT,
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
    regenerateField, navigateField,
    regenerateShortField, navigateShortField,
  }
}

function applyFieldNavigate(
  result: VersionedResult,
  fieldKey: NonNullable<RegeneratingField>,
  dir: 'prev' | 'next',
): VersionedResult {
  switch (fieldKey) {
    case 'titles':    return { ...result, titles: navigate(result.titles, dir) }
    case 'showNotes': return { ...result, showNotes: navigate(result.showNotes, dir) }
    case 'chapters':  return { ...result, chapters: navigate(result.chapters, dir) }
    case 'clips':     return { ...result, clips: navigate(result.clips, dir) }
    case 'telegram':  return { ...result, social: { ...result.social, telegram: navigate(result.social.telegram, dir) } }
    case 'linkedin':  return { ...result, social: { ...result.social, linkedin: navigate(result.social.linkedin, dir) } }
    case 'instagram': return { ...result, social: { ...result.social, instagram: navigate(result.social.instagram, dir) } }
    case 'tiktok':    return { ...result, social: { ...result.social, tiktok: navigate(result.social.tiktok, dir) } }
    default: {
      if ((fieldKey as string).startsWith('takeaway_')) {
        const idx = parseInt((fieldKey as string).split('_')[1], 10)
        const next = [...result.takeaways] as typeof result.takeaways
        next[idx] = navigate(result.takeaways[idx], dir)
        return { ...result, takeaways: next }
      }
      return result
    }
  }
}

// Re-export for convenience — callers that only need current value of a short field
export { current }
