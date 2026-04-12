import type { AnalysisResult } from '../types/podcast';

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

function isAnalysisResult(val: unknown): val is AnalysisResult {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;

  if (!Array.isArray(v.titles) || v.titles.length !== 3) return false;
  if (typeof v.showNotes !== 'string') return false;
  if (!Array.isArray(v.chapters)) return false;
  if (!Array.isArray(v.clips) || v.clips.length !== 3) return false;
  if (typeof v.social !== 'object' || v.social === null) return false;

  const social = v.social as Record<string, unknown>;
  if (typeof social.telegram !== 'string') return false;
  if (typeof social.linkedin !== 'string') return false;
  if (typeof social.instagram !== 'string') return false;
  if (typeof social.tiktok !== 'string') return false;

  return true;
}
