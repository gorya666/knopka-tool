import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SYSTEM_PROMPT } from '../lib/prompt'
import { parseAnalysisResult } from '../lib/parser'
import { runFieldRegen, applyFieldUpdate } from '../lib/field-regen'
import {
  type AppState,
  type RegeneratingField,
  type QuickCommand,
  type VersionedResult,
  toVersionedResult,
  navigate,
} from '../types/podcast'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-20250514'

interface UseAnalyzeReturn {
  appState: AppState
  setAppState: Dispatch<SetStateAction<AppState>>
  regeneratingField: RegeneratingField
  regenStreamText: string
  regenError: string | null
  analyze: (transcript: string, fileName: string) => Promise<void>
  regenerateField: (fieldKey: NonNullable<RegeneratingField>, command: QuickCommand, customInstruction?: string) => Promise<void>
  navigateField: (fieldKey: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
}

export function useAnalyze(): UseAnalyzeReturn {
  const [appState, setAppState] = useState<AppState>({ status: 'empty' })
  const [regeneratingField, setRegeneratingField] = useState<RegeneratingField>(null)
  const [regenStreamText, setRegenStreamText] = useState<string>('')
  const [regenError, setRegenError] = useState<string | null>(null)

  const analyze = async (transcript: string, fileName: string): Promise<void> => {
    setAppState({ status: 'analyzing', transcript, fileName, streamingText: '' })
    try {
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
        return { status: 'done', transcript: prev.transcript, fileName: prev.fileName, result: versioned }
      })
    } catch (err) {
      setAppState({ status: 'error', message: err instanceof Error ? err.message : 'Невідома помилка' })
    }
  }

  const regenerateField = async (
    fieldKey: NonNullable<RegeneratingField>,
    command: QuickCommand,
    customInstruction?: string,
  ): Promise<void> => {
    if (appState.status !== 'done') return
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
      setAppState((prev) => {
        if (prev.status !== 'done') return prev
        return { ...prev, result: applyFieldUpdate(prev.result, fieldKey, raw) }
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
      if (prev.status !== 'done') return prev
      return { ...prev, result: applyFieldNavigate(prev.result, fieldKey, dir) }
    })
  }

  return { appState, setAppState, regeneratingField, regenStreamText, regenError, analyze, regenerateField, navigateField }
}

async function callClaudeStreaming(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL, max_tokens: maxTokens, messages, stream: true,
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
  if (!res.ok) throw new Error(`API помилка ${res.status}: ${await res.text()}`)
  if (!res.body) throw new Error('Порожній потік від API')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (jsonStr === '[DONE]') continue
      try {
        const ev = JSON.parse(jsonStr) as { type: string; delta?: { type: string; text: string } }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text
          onChunk(accumulated)
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }
  if (!accumulated) throw new Error('Порожня відповідь від API')
  return accumulated
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
  }
}
