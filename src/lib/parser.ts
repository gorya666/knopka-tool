import type { AnalysisResult, ShortResult } from '../types/podcast';

export function parseAnalysisResult(raw: string): AnalysisResult {
  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Claude повернув невалідний JSON. Спробуй ще раз.');
  }

  if (!isAnalysisResult(parsed)) {
    throw new Error('Структура відповіді не відповідає очікуваній. Спробуй ще раз.');
  }

  return parsed;
}

// ─── Short mode parser ────────────────────────────────────────────────────────

export function parseShortResult(raw: string): ShortResult {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Claude повернув невалідний JSON. Спробуй ще раз.')
  }

  if (!isShortResult(parsed)) {
    throw new Error('Структура відповіді не відповідає очікуваній. Спробуй ще раз.')
  }

  return parsed
}

function isShortResult(val: unknown): val is ShortResult {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  if (typeof v.thumbnailTitle !== 'string') return false
  if (typeof v.socialCaption !== 'string') return false
  return true
}

// ─── Podcast mode parser ──────────────────────────────────────────────────────

function isAnalysisResult(val: unknown): val is AnalysisResult {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;

  if (!Array.isArray(v.titles) || v.titles.length !== 3) return false;
  if (typeof v.showNotes !== 'string') return false;
  if (!Array.isArray(v.chapters)) return false;
  if (!Array.isArray(v.clips) || v.clips.length !== 3) return false;
  if (typeof v.social !== 'object' || v.social === null) return false;
  // takeaways is optional — older saved episodes and partial responses still pass
  if (v.takeaways !== undefined) {
    if (!Array.isArray(v.takeaways) || v.takeaways.length !== 5) return false;
    const ok = v.takeaways.every((t: unknown) => {
      if (typeof t !== 'object' || t === null) return false;
      const tk = t as Record<string, unknown>;
      return typeof tk.linkedin === 'string' && typeof tk.instagram === 'string';
    });
    if (!ok) return false;
  }

  const social = v.social as Record<string, unknown>;
  if (typeof social.telegram !== 'string') return false;
  if (typeof social.linkedin !== 'string') return false;
  if (typeof social.instagram !== 'string') return false;
  if (typeof social.tiktok !== 'string') return false;

  return true;
}
