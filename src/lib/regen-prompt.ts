// Prompts for per-field regeneration.
// These are MUCH cheaper than full analysis — no transcript needed,
// just the current output + a modifier instruction.
// Estimated cost: ~200-500 tokens per call vs ~15,000 for full analysis.

import type { QuickCommand, Takeaway } from '../types/podcast';

const COMMAND_INSTRUCTIONS: Record<QuickCommand, string> = {
  more_provocative: 'Зроби більш провокативним та сміливим. Додай гостроти, не бійся сильних тверджень.',
  shorter:          'Скороти суттєво. Прибери воду, залиш тільки найважливіше.',
  more_specific:    'Зроби конкретнішим. Менше загальних слів, більше точних деталей з контексту.',
  expand:           'Розшир. Додай деталей, розкрий теми глибше, але не додавай воду.',
  more_casual:      'Зроби більш розмовним і живим. Менш офіційно, більше як говорить реальна людина.',
  stronger_hook:    'Перепиши з сильнішим хуком на початку. Перше речення має зачепити одразу.',
  different_angle:  'Подивись на це з іншого кута. Інша точка входу, інший акцент.',
  regenerate:       'Повністю перепиши з нуля. Інший підхід, інші формулювання.',
};

const TRANSCRIPT_LIMIT = 8000

function transcriptBlock(transcript: string): string {
  const trimmed = transcript.slice(0, TRANSCRIPT_LIMIT)
  const suffix = transcript.length > TRANSCRIPT_LIMIT ? '\n\n[транскрипт скорочено]' : ''
  return `## Транскрипт епізоду\n${trimmed}${suffix}`
}

export function buildCustomFieldPrompt(
  fieldName: string,
  currentValue: string,
  customInstruction: string,
  transcript: string,
): string {
  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

${transcriptBlock(transcript)}

Поточний варіант поля "${fieldName}":
---
${currentValue}
---

Завдання від користувача: ${customInstruction}

Правила:
- Спирайся ТІЛЬКИ на те, що є в транскрипті — нічого не вигадуй
- Транскрипт записаний автоматично і містить помилки — виправляй спотворені дієслова, назви, терміни (напр. "дизайнев" → "дизайнив")
- Зберігай стиль Радіо Кнопки: розмовний, розумний, без корпоративщини
- Мова: українська (можна міксувати з англійськими термінами як у дизайн-середовищі)
- Повертай ТІЛЬКИ новий текст для цього поля — без пояснень, без преамбули, без лапок навколо

Новий варіант:`
}

export function buildFieldPrompt(
  fieldName: string,
  currentValue: string,
  command: QuickCommand,
  transcript: string,
): string {
  const instruction = COMMAND_INSTRUCTIONS[command];

  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

${transcriptBlock(transcript)}

Поточний варіант поля "${fieldName}":
---
${currentValue}
---

Завдання: ${instruction}

Правила:
- Спирайся ТІЛЬКИ на те, що є в транскрипті — нічого не вигадуй
- Транскрипт записаний автоматично і містить помилки — виправляй спотворені дієслова, назви, терміни (напр. "дизайнев" → "дизайнив")
- Зберігай стиль Радіо Кнопки: розмовний, розумний, без корпоративщини
- Мова: українська (можна міксувати з англійськими термінами як у дизайн-середовищі)
- Повертай ТІЛЬКИ новий текст для цього поля — без пояснень, без преамбули, без лапок навколо

Новий варіант:`;
}

export function buildTitlesRegeneratePrompt(
  currentTitles: string[],
  command: QuickCommand,
  transcript: string,
): string {
  const instruction = COMMAND_INSTRUCTIONS[command];
  const titlesText = currentTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');

  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

${transcriptBlock(transcript)}

Поточні варіанти назв:
${titlesText}

Завдання: ${instruction}

Правила:
- Спирайся ТІЛЬКИ на те, що є в транскрипті — нічого не вигадуй
- Стиль: або провокативне твердження/питання, або "Тема · Ім'я Гостя" для гостьових епізодів
- До 65 символів
- Без clickbait — назва відображає реальний зміст
- Повертай ТІЛЬКИ JSON масив з 3 рядками, без пояснень

Формат відповіді: ["назва 1", "назва 2", "назва 3"]`;
}

export function buildTakeawayRegeneratePrompt(
  current: Takeaway,
  command: QuickCommand,
  transcript: string,
  customInstruction?: string,
): string {
  const instruction = customInstruction ?? COMMAND_INSTRUCTIONS[command];

  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

${transcriptBlock(transcript)}

Поточний ключовий висновок:
- linkedin: ${current.linkedin}
- instagram: ${current.instagram}

Завдання: ${instruction}

Перепиши цей висновок у ДВОХ форматах:
- linkedin — розгорнутий абзац (2-4 речення) у стилі "my biggest takeaways": інсайт → конкретний приклад/деталь з розмови → чому це важливо. Без "висновок:", без зайвих вступів.
- instagram — той самий висновок одним коротким реченням (максимум два), суть без деталей.

Правила:
- Спирайся ТІЛЬКИ на те, що є в транскрипті — нічого не вигадуй
- Виправляй помилки транскрипції (напр. "дизайнев" → "дизайнив")
- Стиль Радіо Кнопки: прямо, розумно, без корпоративщини
- Англійські терміни лишай англійською (UX, design system, AI, Figma)
- Повертай ТІЛЬКИ JSON, без markdown, без преамбули

Формат відповіді: { "linkedin": "string", "instagram": "string" }`;
}
