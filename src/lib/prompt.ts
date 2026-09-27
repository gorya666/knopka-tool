// DO NOT EDIT without discussing with Ost first.
// These prompts drive every output the tool produces.
//
// The voice, the formats and the transcript rules all live in ./voice-guide.md —
// a byte-for-byte copy of the body of the shared SKILL.md (radio-knopka-social).
// It is the single source of truth: edit that file, not this one, and keep it in
// sync with ./voice-lint.ts. Do not add tone rules on top of it here.
//
// ─── Prompt caching ───────────────────────────────────────────────────────────
// Caching is prefix-based, so the layout of every request is deliberate:
//
//   system  = [ SHARED_SYSTEM ]            ← cached once, reused forever
//   user    = [ transcript, task ]         ← transcript cached once per episode
//
// SHARED_SYSTEM must stay byte-identical across every call, and the transcript
// must always be its own first user block. Everything variable — including
// today's date — goes in the task block, or the cache silently stops hitting.

import VOICE_GUIDE from './voice-guide.md?raw'
import type { EpisodeMeta, Moment } from '../types/podcast'

export { VOICE_GUIDE }

// Fixed strings. We append these in code rather than trusting the model to
// reproduce a URL or a sign-off verbatim.
export const YOUTUBE_FOOTER =
  'Дякуємо нашим спонсорам за підтримку! Підтримати наш подкаст і отримати доступ ' +
  'до закритого чату та менторських сесій — https://base.monobank.ua/BpiMh9cBatcwXZ ' +
  'Наш канал в Telegram — https://t.me/radioknopka'

export const ANNOUNCEMENT_FOOTER =
  'Долучитись до закритого дизайн-комʼюніті або менторства з нами — ' +
  'https://base.monobank.ua/BpiMh9cBatcwXZ'

export const INSTAGRAM_ENDING = 'Повний епізод — за посиланням у шапці профілю 🎙️'
export const LINKEDIN_ENDING  = 'Епізод — у першому коментарі'

// ─── Shared system prompt (cached across every call, every episode) ───────────

export const SHARED_SYSTEM = `Ти асистент пост-продакшену для подкасту Радіо Кнопка.

Тобі дають транскрипт епізоду і конкретне завдання. Виконуй лише те завдання, яке прийшло після транскрипту, і повертай тільки те, що воно просить.

Нижче — єдине джерело правди для голосу, форматів і роботи з транскриптом. Дотримуйся його повністю, власних правил тону поверх нього не вигадуй.

ВАЖЛИВО ПРО ПРИКЛАДИ. Усі приклади в інструкції, особливо в розділі «Еталони», — це ІНШІ епізоди. Вони показують лише голос, ритм і структуру. Не бери з них ні фактів, ні історій, ні тем, ні формулювань. Кожне слово, яке ти пишеш, має походити з транскрипту цього епізоду. Якщо речення з прикладу можна вставити у твій текст без змін — ти списав, перепиши.

---

${VOICE_GUIDE}`

// The model has no idea what year it is and will invent one. Every task says so.
export function todayLine(today = new Date()): string {
  return `Сьогодні: ${today.toISOString().slice(0, 10)}`
}

function metaBlock(meta: EpisodeMeta): string {
  const guest = meta.guest
    ? `Гість: ${meta.guest.name} — ${meta.guest.role}.`
    : 'Гостя немає, епізод ведуть Остап і Гоша вдвох.'
  const closed = meta.hasClosedPart
    ? 'У цього епізоду є закрита частина для бест тіммейтів.'
    : 'Закритої частини немає.'
  return `${guest}\n${closed}`
}

const KIND_LABEL: Record<Moment['kind'], string> = {
  insight: 'думка',
  position: 'позиція',
  story: 'історія',
}

function momentsBlock(moments: Moment[]): string {
  return moments
    .map((m) => `${m.id} [${KIND_LABEL[m.kind]}] ${m.timestamp} ${m.speaker}: «${m.quote}»\n(чим чіпляє: ${m.why})`)
    .join('\n\n')
}

// ─── Call 1: what this episode is + working material ──────────────────────────

export function buildAnalysisTask(today = new Date()): string {
  return `# ЗАВДАННЯ

${todayLine(today)}

Розберись, що це за епізод, і підготуй робочий матеріал. Поверни ТІЛЬКИ валідний JSON — без преамбули, без markdown, без жодного тексту до або після JSON.

## meta
За розділом «Робота з транскриптом», пункт 0.
- \`guest\` — якщо ведучі когось представляють: { "name": "Імʼя Прізвище", "role": "роль і компанія одним рядком" }. Якщо гостя немає — взагалі не додавай поле guest.
- \`hasClosedPart\` — true, якщо ведучі вголос згадують закриту частину для тіммейтів.
- \`rawTranscript\` — true, якщо транскрипт починається з технічних розмов до запису («камера, мікрофон, дай ще раз»).

## moments (8–12)
За пунктом 1 того ж розділу.
- \`id\` — "m1", "m2", … по порядку
- \`kind\` — \`insight\` (думка: висновок, який слухач забере собі), \`position\` (позиція: думка проти течії або суперечка ведучих), \`story\` (історія: випадок з епізоду)
- \`quote\` — майже дослівна цитата, почищена за пунктами 2 і 3. 1–3 речення.
- \`speaker\` — Остап, Гоша або імʼя гостя
- \`timestamp\` — таймкод початку, формат "23:39"
- \`why\` — чим чіпляє, одне речення

Постарайся, щоб \`insight\` і \`position\` разом складали більшість: на них будуються назва, обкладинка, анонс і топ-5.

## clips (рівно 3)
За розділом «Пропозиції кліпів».

---

## JSON Schema — повертай ТІЛЬКИ це

{
  "meta": {
    "guest": { "name": "string", "role": "string" },
    "hasClosedPart": true,
    "rawTranscript": false
  },
  "moments": [
    { "id": "m1", "kind": "insight | position | story", "quote": "string", "speaker": "string", "timestamp": "23:39", "why": "string" }
  ],
  "clips": [
    { "start": "23:39", "end": "24:30", "about": "string", "why": "string" }
  ]
}

Повертай ТІЛЬКИ JSON. Жодного тексту до або після.`
}

// ─── Call 2: the YouTube pack ─────────────────────────────────────────────────

export function buildYoutubeTask(meta: EpisodeMeta, moments: Moment[], today = new Date()): string {
  const useful = moments.filter((m) => m.kind !== 'story')

  return `# ЗАВДАННЯ

${todayLine(today)}

Напиши пакет для YouTube за транскриптом вище. Поверни ТІЛЬКИ валідний JSON — без преамбули, без markdown, без жодного тексту до або після JSON.

## Що вже відомо про епізод
${metaBlock(meta)}

## Думки й позиції з епізоду
Назви і заголовки на обкладинку будуй ТІЛЬКИ на цьому. Історії з епізоду в назву і на обкладинку не йдуть (правило 10).

${momentsBlock(useful)}

## titles (рівно 5)
За розділом «YouTube: назва епізоду». Уважно прочитай приклади поганих назв — вони з реального прогону цього інструменту.
${meta.guest
  ? `Це гостьовий епізод: у кінці назви « | ${meta.guest.name}».`
  : 'Це епізод без гостя: НЕ додавай « | » з іменами. Імена ведучих у назві не пишемо — вони й так ведуть кожен епізод.'}

## description
За розділом «YouTube: опис», пункти 1–4. Чаптери і футер НЕ пиши — інструмент додає їх сам при копіюванні.

## chapters
За розділом «YouTube: чаптери». Перший — \`00:00 Інтро\`. 8–12 на годину, не більше. Кожен чаптер — окрема тема, без повторів.

## coverTitles (рівно 3)
За розділом «Заголовок на обкладинку». Про ту саму тему, що й назва, але коротше і не дослівно.

---

## JSON Schema — повертай ТІЛЬКИ це

{
  "titles": ["string", "string", "string", "string", "string"],
  "description": "string",
  "chapters": [
    { "time": "00:00", "title": "Інтро" }
  ],
  "coverTitles": ["string", "string", "string"]
}

Повертай ТІЛЬКИ JSON. Жодного тексту до або після.`
}

// ─── Call 3: posts + the guest pack ───────────────────────────────────────────

export function buildSocialTask(meta: EpisodeMeta, moments: Moment[], today = new Date()): string {
  const closedTeaser = meta.hasClosedPart
    ? '6. `tg_closed_teaser` — 1 шт., формат Ґ. dayOffset 9.'
    : '6. `tg_closed_teaser` — НЕ генеруй: у цього епізоду немає закритої частини.'

  return `# ЗАВДАННЯ

${todayLine(today)}

Напиши пости за транскриптом вище. Поверни ТІЛЬКИ валідний JSON — без преамбули, без markdown, без жодного тексту до або після JSON.

## Що вже відомо про епізод
${metaBlock(meta)}

## Моменти з епізоду
У кожному пості вкажи \`momentIds\` — на яких моментах він побудований.

${momentsBlock(moments)}

## posts

Рівно ці пости. Поле \`format\` має точно збігатися зі значенням у дужках, \`dayOffset\` — з розділом «Календар».

1. \`tg_announcement\` — 1 шт., формат А. dayOffset 0.
2. \`top5_ig_linkedin\` — 1 шт., розділ «Instagram і LinkedIn — топ-5 думок». dayOffset 0.
3. \`tg_carousel_1_2_3\` — 1 шт., формат Б. dayOffset 2.
4. \`tg_single_thought\` — 2 шт., формат В, про різні думки. dayOffset 4 у першої, 11 у другої.
5. \`tg_question\` — 1 шт., формат Г. Починається з питання, далі максимум два речення контексту, потім 2–4 варіанти для опитування. dayOffset 6.
${closedTeaser}

## Правило 9 — одна історія один раз

Кожен момент іде тільки в ОДИН пост. Виняток — анонс і топ-5: вони оглядають увесь епізод. Постів, побудованих на моменті типу \`історія\`, максимум один на весь епізод. Решта постів — на думках і позиціях.

## Топ-5 окремо

- Перший рядок: з ким і про що розмова, одним реченням. Для гостьового епізоду — імʼя гостя в цьому рядку.
- Далі пʼять пунктів \`1.\`–\`5.\`, кожен з різної частини епізоду: висновок плюс одна конкретна деталь з епізоду як доказ, 1–3 речення.
- \`text\` — перший рядок і пʼять пунктів, БЕЗ закінчення: інструмент підставляє його сам для кожної платформи.
- ЖОДНОЇ розмітки: ніяких \`**\` і \`_\`. Instagram і LinkedIn її не рендерять, зірочки лишаться в тексті.
- \`firstComment\` — перший коментар для LinkedIn у такому вигляді:

\`\`\`
Епізод: [посилання]

1. коротка назва думки: [посилання@17:01]
2. …
\`\`\`

Таймкоди беруться з моментів, на яких побудовані пункти.

## Правила для всіх постів

- Бери думки й історії з моментів вище і з транскрипту. Нічого не вигадуй.
- \`text\` — готовий до публікації текст, з переносами рядків де треба.
- Футер Monobase у анонсі не пиши — його додає інструмент.
- Довжина: анонс і нарізка — до 1200 знаків, топ-5 — до 1400, решта — до 600.
- Перевір КОЖЕН текст за стоп-листом, перш ніж віддати.

---

## JSON Schema — повертай ТІЛЬКИ це

{
  "posts": [
    {
      "format": "tg_announcement | top5_ig_linkedin | tg_carousel_1_2_3 | tg_single_thought | tg_question | tg_closed_teaser",
      "text": "string",
      "firstComment": "string",
      "momentIds": ["m1"],
      "dayOffset": 0
    }
  ]
}

Поле \`firstComment\` додавай ТІЛЬКИ для top5_ig_linkedin. Повертай ТІЛЬКИ JSON. Жодного тексту до або після.`
}
