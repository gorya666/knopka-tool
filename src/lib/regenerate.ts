// Prompts for per-field regeneration.
// Each function takes the transcript + previous versions and returns
// a prompt asking Claude for a fresh alternative.
// All regeneration calls return a small focused JSON — not the full schema.

import type { RegenerableField } from '../types/podcast';

// How many new options to generate per field
const REGEN_COUNT: Record<RegenerableField, number> = {
  titles: 3,         // always 3 titles at once
  showNotes: 1,
  clips: 3,          // always 3 clips at once
  'social.telegram': 1,
  'social.linkedin': 1,
  'social.instagram': 1,
  'social.tiktok': 1,
};

export function getRegenCount(field: RegenerableField): number {
  return REGEN_COUNT[field];
}

export function buildRegenPrompt(
  field: RegenerableField,
  transcript: string,
  previousVersions: string[]
): string {
  const prevBlock = previousVersions
    .map((v, i) => `Варіант ${i + 1}:\n${v}`)
    .join('\n\n---\n\n');

  const fieldInstructions: Record<RegenerableField, string> = {
    titles: `Згенеруй 3 НОВІ варіанти назви епізоду.
Вони мають відрізнятися за кутом подачі та тоном від попередніх варіантів.
Поверни ТІЛЬКИ JSON: { "titles": ["string", "string", "string"] }`,

    showNotes: `Напиши НОВИЙ опис епізоду (show notes).
Він має відрізнятися від попередніх — інший хук, інший акцент, та сама структура.
Поверни ТІЛЬКИ JSON: { "showNotes": "string" }`,

    clips: `Запропонуй 3 НОВІ моменти для короткого відео (кліпи).
Вони мають бути іншими моментами з транскрипту — не повторюй попередні.
Поверни ТІЛЬКИ JSON з масивом з 3 об'єктів:
{ "clips": [{ "timeRange": "string", "excerpt": "string", "type": "hot_take|tip|quote", "whyItWorks": "string", "tiktokCaption": "string" }] }`,

    'social.telegram': `Напиши НОВИЙ пост для Telegram.
Інший кут, та сама розмовна українська тональність.
Поверни ТІЛЬКИ JSON: { "telegram": "string" }`,

    'social.linkedin': `Напиши НОВИЙ пост для LinkedIn.
Інший інсайт або початок, та сама тональність.
Поверни ТІЛЬКИ JSON: { "linkedin": "string" }`,

    'social.instagram': `Напиши НОВИЙ підпис для Instagram.
Інший хук, коротко, до 4 речень.
Поверни ТІЛЬКИ JSON: { "instagram": "string" }`,

    'social.tiktok': `Напиши НОВИЙ підпис для TikTok/Reels.
1-2 речення, інший хук.
Поверни ТІЛЬКИ JSON: { "tiktok": "string" }`,
  };

  return `Ти асистент пост-продакшену для подкасту Радіо Кнопка.
Мова: українська. Тон: розмовний, розумний, без корпоративщини.

## Транскрипт епізоду
${transcript.slice(0, 12000)}${transcript.length > 12000 ? '\n\n[транскрипт скорочено]' : ''}

## Попередні варіанти (не повторюй їх)
${prevBlock}

## Завдання
${fieldInstructions[field]}

Повертай ТІЛЬКИ JSON. Без преамбули, без markdown.`;
}

// Parse a regeneration response for a specific field
export function parseRegenResponse(field: RegenerableField, raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  // Validate the expected key exists
  const keyMap: Record<RegenerableField, string> = {
    titles: 'titles',
    showNotes: 'showNotes',
    clips: 'clips',
    'social.telegram': 'telegram',
    'social.linkedin': 'linkedin',
    'social.instagram': 'instagram',
    'social.tiktok': 'tiktok',
  };

  const key = keyMap[field];
  if (!(key in parsed)) {
    throw new Error(`Відповідь не містить поле "${key}"`);
  }

  return parsed[key];
}
