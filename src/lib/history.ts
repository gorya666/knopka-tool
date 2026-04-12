// ─── Episode history — localStorage CRUD ─────────────────────────────────────
// Clean Architecture: Interface Adapter layer.
// Translates between our domain types and raw localStorage JSON.

import type { AnalysisResult } from '../types/podcast'

const STORAGE_KEY = 'knopka_episodes'
const MAX_SAVED = 20

export interface SavedEpisode {
  id: string
  fileName: string
  savedAt: string        // ISO date string
  title: string          // result.titles[0] — shown on the card
  result: AnalysisResult // flat (not versioned) — re-wrap on load
  transcript: string
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadEpisodes(): SavedEpisode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedEpisode[]
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
    result,
    transcript,
  }

  const existing = loadEpisodes()
  // Keep newest first, cap at MAX_SAVED
  const updated = [episode, ...existing].slice(0, MAX_SAVED)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return episode
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
