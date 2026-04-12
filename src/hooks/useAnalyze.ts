import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SYSTEM_PROMPT } from '../lib/prompt'
import { parseAnalysisResult } from '../lib/parser'
import { buildFieldPrompt, buildTitlesRegeneratePrompt } from '../lib/regen-prompt'
import {
  type AppState,
  type RegeneratingField,
  type QuickCommand,
  type VersionedResult,
  type Chapter,
  type Clip,
  toVersionedResult,
  addVersion,
} from '../types/podcast'

// ─── Clean Architecture note ──────────────────────────────────────────────────
// This is a Use Case layer hook. It owns the AppState machine and all Claude
// API calls. Components only call analyze() / regenerateField() and read state.
// No component imports here — just browser APIs + inner-layer imports.

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAnalyzeReturn {
  appState: AppState
  setAppState: Dispatch<SetStateAction<AppState>>
  regeneratingField: RegeneratingField
  analyze: (transcript: string) => Promise<void>
  regenerateField: (
    fieldKey: RegeneratingField,
    currentValue: string,
    command: QuickCommand
  ) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalyze(): UseAnalyzeReturn {
  const [appState, setAppState] = useState<AppState>({ status: 'empty' })
  const [regeneratingField, setRegeneratingField] = useState<RegeneratingField>(null)

  // Full analysis: transcript → all output fields in one API call
  const analyze = async (transcript: string): Promise<void> => {
    setAppState((prev) => {
      if (prev.status !== 'loaded') return prev
      return { status: 'analyzing', transcript: prev.transcript, fileName: prev.fileName }
    })

    try {
      const raw = await callClaude(
        [{ role: 'user', content: transcript }],
        SYSTEM_PROMPT,
        4000,
      )
      const result = parseAnalysisResult(raw)
      const versioned = toVersionedResult(result)

      setAppState((prev) => {
        if (prev.status !== 'analyzing') return prev
        return {
          status: 'done',
          transcript: prev.transcript,
          fileName: prev.fileName,
          result: versioned,
        }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Невідома помилка'
      setAppState({ status: 'error', message })
    }
  }

  // Field regeneration: cheap single-field re-write with a modifier command
  const regenerateField = async (
    fieldKey: RegeneratingField,
    currentValue: string,
    command: QuickCommand,
  ): Promise<void> => {
    if (fieldKey === null) return
    setRegeneratingField(fieldKey)

    try {
      const prompt =
        fieldKey === 'titles'
          ? buildTitlesRegeneratePrompt(JSON.parse(currentValue) as string[], command)
          : buildFieldPrompt(fieldKey, currentValue, command)

      const raw = await callClaude([{ role: 'user', content: prompt }], undefined, 800)

      setAppState((prev) => {
        if (prev.status !== 'done') return prev
        return { ...prev, result: applyFieldUpdate(prev.result, fieldKey, raw) }
      })
    } catch (err) {
      // Non-fatal: log and leave previous value intact
      console.error('Помилка при регенерації поля:', err instanceof Error ? err.message : err)
    } finally {
      setRegeneratingField(null)
    }
  }

  return { appState, setAppState, regeneratingField, analyze, regenerateField }
}

// ─── Claude API helper ────────────────────────────────────────────────────────

async function callClaude(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  }
  if (systemPrompt) body.system = systemPrompt

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API помилка ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>
  }
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('Порожня відповідь від API')
  return textBlock.text
}

// ─── Field update logic ───────────────────────────────────────────────────────

function applyFieldUpdate(
  result: VersionedResult,
  fieldKey: NonNullable<RegeneratingField>,
  raw: string,
): VersionedResult {
  switch (fieldKey) {
    case 'titles': {
      const newTitles = JSON.parse(raw.trim()) as [string, string, string]
      return { ...result, titles: addVersion(result.titles, newTitles) }
    }
    case 'showNotes':
      return { ...result, showNotes: addVersion(result.showNotes, raw.trim()) }
    case 'chapters': {
      const chapters = JSON.parse(raw.trim()) as Chapter[]
      return { ...result, chapters: addVersion(result.chapters, chapters) }
    }
    case 'clips': {
      const clips = JSON.parse(raw.trim()) as [Clip, Clip, Clip]
      return { ...result, clips: addVersion(result.clips, clips) }
    }
    case 'telegram':
      return {
        ...result,
        social: { ...result.social, telegram: addVersion(result.social.telegram, raw.trim()) },
      }
    case 'linkedin':
      return {
        ...result,
        social: { ...result.social, linkedin: addVersion(result.social.linkedin, raw.trim()) },
      }
    case 'instagram':
      return {
        ...result,
        social: { ...result.social, instagram: addVersion(result.social.instagram, raw.trim()) },
      }
    case 'tiktok':
      return {
        ...result,
        social: { ...result.social, tiktok: addVersion(result.social.tiktok, raw.trim()) },
      }
  }
}
