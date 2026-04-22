// Shared field regeneration logic — used by useAnalyze and EpisodeView.

import { buildFieldPrompt, buildTitlesRegeneratePrompt, buildCustomFieldPrompt } from './regen-prompt'
import { callClaude, callClaudeStreaming, extractJSON } from './claude-api'
import {
  type RegeneratingField,
  type QuickCommand,
  type VersionedResult,
  type Chapter,
  type Clip,
  addVersion,
  current,
} from '../types/podcast'

// JSON fields — can't stream because we need the full payload to parse
const JSON_FIELDS = new Set<NonNullable<RegeneratingField>>(['titles', 'chapters', 'clips'])

// Build the correct prompt for a field and run the API call
export async function runFieldRegen(
  fieldKey: NonNullable<RegeneratingField>,
  result: VersionedResult,
  command: QuickCommand,
  transcript: string,
  onChunk?: (text: string) => void,
  customInstruction?: string,
): Promise<string> {
  const currentValue = getFieldValue(result, fieldKey)

  let prompt: string
  if (customInstruction) {
    // Use custom instruction directly
    prompt = buildCustomFieldPrompt(fieldKey, currentValue, customInstruction, transcript)
  } else {
    prompt =
      fieldKey === 'titles'
        ? buildTitlesRegeneratePrompt(JSON.parse(currentValue) as string[], command, transcript)
        : buildFieldPrompt(fieldKey, currentValue, command, transcript)
  }

  const messages = [{ role: 'user', content: prompt }]

  if (!JSON_FIELDS.has(fieldKey) && onChunk) {
    return callClaudeStreaming(messages, undefined, 2000, onChunk)
  }
  return callClaude(messages, undefined, 2000)
}

// Apply a raw Claude response to the correct field in result
export function applyFieldUpdate(
  result: VersionedResult,
  fieldKey: NonNullable<RegeneratingField>,
  raw: string,
): VersionedResult {
  switch (fieldKey) {
    case 'titles': {
      const newTitles = JSON.parse(extractJSON(raw)) as [string, string, string]
      return { ...result, titles: addVersion(result.titles, newTitles) }
    }
    case 'showNotes':
      return { ...result, showNotes: addVersion(result.showNotes, raw.trim()) }
    case 'chapters': {
      const chapters = JSON.parse(extractJSON(raw)) as Chapter[]
      return { ...result, chapters: addVersion(result.chapters, chapters) }
    }
    case 'clips': {
      const clips = JSON.parse(extractJSON(raw)) as [Clip, Clip, Clip]
      return { ...result, clips: addVersion(result.clips, clips) }
    }
    case 'telegram':
      return { ...result, social: { ...result.social, telegram: addVersion(result.social.telegram, raw.trim()) } }
    case 'linkedin':
      return { ...result, social: { ...result.social, linkedin: addVersion(result.social.linkedin, raw.trim()) } }
    case 'instagram':
      return { ...result, social: { ...result.social, instagram: addVersion(result.social.instagram, raw.trim()) } }
    case 'tiktok':
      return { ...result, social: { ...result.social, tiktok: addVersion(result.social.tiktok, raw.trim()) } }
  }
}

// Serialize the current value of a field for use in prompts
export function getFieldValue(result: VersionedResult, field: NonNullable<RegeneratingField>): string {
  switch (field) {
    case 'titles':    return JSON.stringify(current(result.titles))
    case 'showNotes': return current(result.showNotes)
    case 'chapters':  return JSON.stringify(current(result.chapters))
    case 'clips':     return JSON.stringify(current(result.clips))
    case 'telegram':  return current(result.social.telegram)
    case 'linkedin':  return current(result.social.linkedin)
    case 'instagram': return current(result.social.instagram)
    case 'tiktok':    return current(result.social.tiktok)
  }
}
