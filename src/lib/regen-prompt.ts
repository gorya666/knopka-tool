// Task blocks for per-field regeneration.
//
// These are appended AFTER the cached transcript block (see prompt.ts), so they
// never carry the transcript themselves — and the full transcript is always
// available, because it is a cache read rather than a fresh cost.
//
// The voice guide already rides along in the system prompt, so these blocks
// point at its sections instead of restating the rules.

import { todayLine } from './prompt';
import { POST_FORMAT_LABELS, type QuickCommand, type ClipSuggestion, type PostFormat } from '../types/podcast';

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

const COMMON_RULES = `- Спирайся ТІЛЬКИ на те, що є в транскрипті — нічого не вигадуй
- Транскрипт містить помилки розпізнавання — виправляй спотворені слова, імена і назви
- Дотримуйся голосу, форматів і стоп-листа з інструкції`;

const TEXT_ONLY = '- Повертай ТІЛЬКИ новий текст — без пояснень, без преамбули, без лапок навколо, без markdown-огорожі';

function instructionFor(command: QuickCommand, custom?: string): string {
  return custom ?? COMMAND_INSTRUCTIONS[command];
}

function head(): string {
  return `# ЗАВДАННЯ\n\n${todayLine()}\n`;
}

// ─── Plain-text fields ────────────────────────────────────────────────────────

export function buildDescriptionRegeneratePrompt(
  currentValue: string,
  command: QuickCommand,
  custom?: string,
): string {
  return `${head()}
Поточний опис для YouTube:
---
${currentValue}
---

Завдання: ${instructionFor(command, custom)}

Правила:
${COMMON_RULES}
- Структура — за розділом «YouTube: опис», пункти 1–4
- Чаптери і футер НЕ пиши — інструмент додає їх сам
${TEXT_ONLY}

Новий опис:`
}

export function buildPostRegeneratePrompt(
  post: { format: PostFormat; text: string },
  command: QuickCommand,
  custom?: string,
): string {
  const top5Note = post.format === 'top5_ig_linkedin'
    ? `\n- Формат — за розділом «Instagram і LinkedIn — топ-5 думок»: перший рядок про що розмова, далі пʼять пунктів 1.–5. з різних частин епізоду
- Закінчення НЕ пиши — інструмент підставляє його сам для кожної платформи
- ЖОДНОЇ розмітки: ніяких ** і _`
    : ''

  return `${head()}
Поточний пост (формат — ${POST_FORMAT_LABELS[post.format]}):
---
${post.text}
---

Завдання: ${instructionFor(command, custom)}

Правила:
${COMMON_RULES}
- Формат і призначення поста не міняй — це так само ${POST_FORMAT_LABELS[post.format]}
- Футер Monobase не пиши — його додає інструмент${top5Note}
${TEXT_ONLY}

Новий пост:`
}

// ─── JSON fields ──────────────────────────────────────────────────────────────

export function buildTitlesRegeneratePrompt(
  currentTitles: string[],
  command: QuickCommand,
  guest?: string,
  custom?: string,
): string {
  const guestRule = guest
    ? `- Гостьовий епізод: у кінці назви « | ${guest}»`
    : '- Епізод без гостя: НЕ додавай « | » з іменами, імена ведучих у назві не пишемо'

  return `${head()}
Поточні варіанти назви епізоду:
${currentTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Завдання: ${instructionFor(command, custom)}

Правила:
${COMMON_RULES}
- Рівно 5 варіантів, за розділом «YouTube: назва епізоду». Уважно прочитай приклади поганих назв
${guestRule}
- Назва каже, про що епізод. Історії, анекдоти й випадкові цифри з середини розмови — не для назви
- Жодних років і цифр, яких немає в транскрипті
- Повертай ТІЛЬКИ JSON-масив з 5 рядків, без markdown, без преамбули

Формат відповіді: ["назва 1", "назва 2", "назва 3", "назва 4", "назва 5"]`
}

export function buildCoverTitlesRegeneratePrompt(
  currentTitles: string[],
  command: QuickCommand,
  custom?: string,
): string {
  return `${head()}
Поточні заголовки на обкладинку:
${currentTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Завдання: ${instructionFor(command, custom)}

Правила:
${COMMON_RULES}
- Рівно 3 варіанти, за розділом «Заголовок на обкладинку»
- Обкладинка каже, про що епізод. Смішна історія чи факт із середини розмови — не заголовок
- Про ту саму тему, що й назва, але коротше і не дослівно
- Повертай ТІЛЬКИ JSON-масив з 3 рядків, без markdown, без преамбули

Формат відповіді: ["заголовок 1", "заголовок 2", "заголовок 3"]`
}

export function buildChaptersRegeneratePrompt(custom?: string): string {
  return `${head()}
${custom ?? 'Перескладі чаптери епізоду з нуля.'}

Правила:
${COMMON_RULES}
- За розділом «YouTube: чаптери». Перший — "00:00 Інтро", 8–12 на годину
- Кожен чаптер — окрема тема, без повторів. Назва 2–6 слів, конкретна
- Повертай ТІЛЬКИ JSON-масив, без markdown, без преамбули

Формат відповіді: [{ "time": "00:00", "title": "Інтро" }]`
}

export function buildClipsRegeneratePrompt(
  currentClips: ClipSuggestion[],
  custom?: string,
): string {
  const used = currentClips.map((c) => c.start).join(', ')

  return `${head()}
Зараз запропоновані кліпи на таймкодах: ${used}

${custom ?? 'Запропонуй 3 ІНШІ моменти для кліпів — не ті, що вже є.'}

Правила:
${COMMON_RULES}
- За розділом «Пропозиції кліпів»
- НЕ повторюй таймкоди, що вже є (${used})
- end — на 30–60 секунд пізніше за start
- Повертай ТІЛЬКИ JSON-масив з 3 обʼєктів, без markdown, без преамбули

Формат відповіді: [{ "start": "23:39", "end": "24:30", "about": "string", "why": "string" }]`
}

