// ─── Episode history — localStorage CRUD ─────────────────────────────────────
// Clean Architecture: Interface Adapter layer.
// Translates between our domain types and raw localStorage JSON.

import type { AnalysisResult, ShortResult } from '../types/podcast'

const STORAGE_KEY = 'knopka_episodes'
const MAX_SAVED = 20

// Discriminated union — podcast episodes carry `result`, shorts carry `shortResult`
export type SavedEpisode =
  | {
      id: string
      fileName: string
      savedAt: string
      title: string
      transcript: string
      mode: 'podcast'
      result: AnalysisResult
    }
  | {
      id: string
      fileName: string
      savedAt: string
      title: string
      transcript: string
      mode: 'short'
      shortResult: ShortResult
    }

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadEpisodes(): SavedEpisode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    // Backwards compat: old records have no `mode` field — treat as podcast
    return parsed.map((ep) => {
      if (ep['mode'] == null) {
        return { ...ep, mode: 'podcast' } as unknown as SavedEpisode
      }
      return ep as unknown as SavedEpisode
    })
  } catch {
    return []
  }
}

export function loadEpisode(id: string): SavedEpisode | null {
  return loadEpisodes().find((e) => e.id === id) ?? null
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveEpisode(
  fileName: string,
  result: AnalysisResult,
  transcript: string,
): SavedEpisode {
  const episode: SavedEpisode = {
    id: `ep_${Date.now()}`,
    fileName,
    savedAt: new Date().toISOString(),
    title: result.titles[0],
    transcript,
    mode: 'podcast',
    result,
  }
  _persist(episode)
  return episode
}

export function saveShort(
  fileName: string,
  shortResult: ShortResult,
  transcript: string,
): SavedEpisode {
  const episode: SavedEpisode = {
    id: `ep_${Date.now()}`,
    fileName,
    savedAt: new Date().toISOString(),
    title: shortResult.thumbnailTitle,
    transcript,
    mode: 'short',
    shortResult,
  }
  _persist(episode)
  return episode
}

// Overwrite the stored result of an already-saved episode, keeping its place in
// the list. Used when the user edits a post's published text after the fact.
export function updateEpisode(id: string, result: AnalysisResult): void {
  const updated = loadEpisodes().map((ep) =>
    ep.id === id && ep.mode === 'podcast' ? { ...ep, result } : ep,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

function _persist(episode: SavedEpisode): void {
  const existing = loadEpisodes()
  const updated = [episode, ...existing].slice(0, MAX_SAVED)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function deleteEpisode(id: string): void {
  const updated = loadEpisodes().filter((e) => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
