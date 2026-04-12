// Prompts for per-field regeneration.
// These are MUCH cheaper than full analysis — no transcript needed,
// just the current output + a modifier instruction.
// Estimated cost: ~200-500 tokens per call vs ~15,000 for full analysis.

import type { QuickCommand } from '../types/podcast';

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

export function buildFieldPrompt(
  fieldName: string,
  currentValue: string,
  command: QuickCommand,
): string {
  const instruction = COMMAND_INSTRUCTIONS[command];

  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

Поточний варіант поля "${fieldName}":
---
${currentValue}
---

Завдання: ${instruction}

Правила:
- Зберігай стиль Радіо Кнопки: розмовний, розумний, без корпоративщини
- Мова: українська (можна міксувати з англійськими термінами як у дизайн-середовищі)
- Повертай ТІЛЬКИ новий текст для цього поля — без пояснень, без преамбули, без лапок навколо

Новий варіант:`;
}

export function buildTitlesRegeneratePrompt(
  currentTitles: string[],
  command: QuickCommand,
): string {
  const instruction = COMMAND_INSTRUCTIONS[command];
  const titlesText = currentTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');

  return `Ти редактор контенту для подкасту Радіо Кнопка (українськомовний UI/UX подкаст).

Поточні варіанти назв:
${titlesText}

Завдання: ${instruction}

Правила:
- Стиль: або провокативне твердження/питання, або "Тема · Ім'я Гостя" для гостьових епізодів
- До 65 символів
- Без clickbait — назва відображає реальний зміст
- Повертай ТІЛЬКИ JSON масив з 3 рядками, без пояснень

Формат відповіді: ["назва 1", "назва 2", "назва 3"]`;
}
