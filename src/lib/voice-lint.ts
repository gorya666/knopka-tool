// voice-lint.ts — перевірка поста на стоп-лист Радіо Кнопки.
//
// Як підключити в knopka-tool (після генерації кожного поста):
//
//   let post = await generate(...);
//   for (let i = 0; i < 2; i++) {
//     const r = lintPost(post);
//     if (r.blocks.length === 0) break;
//     post = await callClaude(buildFixPrompt(post, r)); // той самий виклик API, що й для генерації
//   }
//   const { warnings } = lintPost(post); // показати як бейджі біля поста, не перегенеровувати
//
// Стоп-лист має збігатися з розділом «Стоп-лист» у SKILL.md.
// Змінюєш одне — змінюй і друге.

export type Issue = { rule: string; match: string };
export type LintResult = { blocks: Issue[]; warnings: Issue[] };

const L = "\\p{L}";
// ціле слово або фраза (кирилиця не працює з \b, тому lookaround по \p{L})
const words = (alts: string) => new RegExp(`(?<!${L})(?:${alts})(?!${L})`, "giu");
// слово, що починається з основи
const stems = (alts: string) => new RegExp(`(?<!${L})(?:${alts})${L}*`, "giu");

const BLOCK: { rule: string; re: RegExp }[] = [
  { rule: "рамка «не X, а Y»", re: new RegExp(`(?<!${L})не\\s+(?:просто\\s+)?[^.!?\\n]{1,60}?,\\s*а\\s`, "giu") },
  { rule: "рамка «це не про X, це про Y»", re: /це не про[^.!?\n]{1,60}?[,—–-]\s*(?:це|а)\s+про/giu },
  { rule: "рамка «не просто X — це Y»", re: /не просто[^.!?\n]{1,40}?\s[—–-]\s*це/giu },
  { rule: "рамка «не X — це Y»", re: new RegExp(`(?<!${L})не\\s[^.!?\\n]{1,60}?\\s[—–-]\\s*(?:це|а)\\s`, "giu") },
  { rule: "рамка «Це не X. Це Y»", re: new RegExp(`(?<!${L})це\\s+не\\s[^.!?\\n]{1,60}?[.!]\\s+Це\\s`, "giu") },
  { rule: "риторичне питання з відповіддю", re: /\?\s+(?:Бо|Тому що|Відповідь|Все просто|Просто)(?!\p{L})/gu },
  { rule: "риторичне питання з відповіддю", re: /(?<!\p{L})(?:Результат|Висновок|Секрет|Проблема)\?/gu },
  {
    rule: "штамп",
    re: words(
      "давайте розберемося|давайте розберемось|зануримося|зануримось|у сучасному світі|в сучасному світі|" +
        "важливо розуміти|варто зазначити|гра змінилась|гра змінилася|game changer",
    ),
  },
  {
    rule: "канцелярит / реклама",
    re: words(
      "ми раді|не пропустіть|обов'язково послухайте|обовʼязково послухайте|обов’язково послухайте|" +
        "слухайте та діліться|слухайте і діліться",
    ),
  },
  { rule: "калька", re: stems("являєт|являют|слідуюч") },
  {
    rule: "калька",
    re: words("приймати участь|прийняти участь|приймає участь|приймали участь|на протязі|в якості|робить різницю|в кінці дня"),
  },
  { rule: "калька «самий кращий»", re: new RegExp(`(?<!${L})сам(?:ий|а|е|і)\\s+(?:кращ|гірш|більш|менш)${L}*`, "giu") },
  { rule: "суржик", re: words("да|вообще|вобще|конечно|вот|ше") },
  {
    rule: "мат",
    re: new RegExp(
      `(?<!${L})(?:хуй|хуйн|хуєв|пизд|пізд|бляд|блят|ахуєн|охуєн|заєб|наєб|їба|єба)${L}*|(?<!${L})бля(?!${L})`,
      "giu",
    ),
  },
  { rule: "хештег", re: /(?:^|\s)#[\p{L}\d_]+/gu },
  { rule: "заборонене емодзі", re: /🔥|💡|✨|🚀|👇/gu },
];

const WARN: { rule: string; re: RegExp }[] = [
  { rule: "загальний заклик у коментарі", re: /(?:пишіть|діліться)\s+(?:у|в)\s+комент/giu },
  { rule: "слово-маркер нейронки", re: stems("ключов|справжн|неймовірн") },
  { rule: "драматизація", re: /може\s+вбити|вбива\p{L}*\s+(?:партнерств|бізнес|продукт)|один\s+неправильн\p{L}*\s+\p{L}+\s+[—–-]\s+і/giu },
  {
    rule: "мета-конструкція «хто що сказав»",
    re: /(?:згада(?:в|ла|ли)|сказа(?:в|ла|ли))\s+(?:у|в)\s+(?:закритому\s+)?епізоді|одразу про це сказа\p{L}*|версія\s+(?:Гоші|Остапа)/giu,
  },
];

const isLinkLine = (line: string) => /https?:\/\/|\[посилання(?:@[^\]]+)?\]/iu.test(line);

function collect(text: string, rules: { rule: string; re: RegExp }[]): Issue[] {
  const out: Issue[] = [];
  for (const { rule, re } of rules) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) out.push({ rule, match: m[0] });
  }
  return out;
}

// plainText: true — для Instagram і LinkedIn, де розмітка не рендериться
export function lintPost(text: string, opts: { maxChars?: number; plainText?: boolean } = {}): LintResult {
  const blocks = collect(text, BLOCK);
  const warnings = collect(text, WARN);
  if (opts.plainText && /\*\*|__|(?<!\S)_[^_\s][^_]*_(?!\S)/u.test(text)) {
    blocks.push({ rule: "розмітка (** або _) в тексті для Instagram/LinkedIn — вона не рендериться", match: "**" });
  }

  // тире: більше одного в тексті поста (рядки з посиланнями не рахуємо)
  const body = text.split("\n").filter((l) => !isLinkLine(l)).join("\n");
  const dashes = (body.match(/\s—\s/gu) ?? []).length;
  if (dashes > 2) blocks.push({ rule: `тире: ${dashes} (норма — 1, максимум 2)`, match: "—" });
  else if (dashes === 2) warnings.push({ rule: `тире: ${dashes} (норма — 1)`, match: "—" });

  // «реально», «супер», «мега» більше одного разу кожне
  for (const w of ["реально", "супер", "мега"]) {
    const n = (text.match(stems(w)) ?? []).length;
    if (n > 1) warnings.push({ rule: `«${w}» ${n} рази`, match: w });
  }

  // емодзі: 🔘 (маркер списку в анонсах) і 🎙️ (біля посилання) не рахуємо, інших — максимум одне
  const emoji = (text.replace(/🔘|🎙️?/gu, "").match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emoji > 1) warnings.push({ rule: `емодзі: ${emoji} (норма — 1, не рахуючи 🔘 і 🎙️)`, match: "" });

  // довгі речення
  for (const s of body.split(/(?<=[.!?…])\s+|\n+/u)) {
    const n = s.trim().split(/\s+/u).filter(Boolean).length;
    if (n > 25) warnings.push({ rule: `довге речення: ${n} слів`, match: s.trim().slice(0, 60) + "…" });
  }

  // довжина
  if (opts.maxChars && text.length > opts.maxChars) {
    warnings.push({ rule: `довжина ${text.length} знаків (ліміт ${opts.maxChars})`, match: "" });
  }

  return { blocks, warnings };
}

export function buildFixPrompt(text: string, r: LintResult): string {
  const list = [...r.blocks, ...r.warnings]
    .map((i) => `- ${i.rule}${i.match ? `: «${i.match.trim()}»` : ""}`)
    .join("\n");
  return [
    "Перепиши пост для Радіо Кнопки. Збережи думку, факти, посилання і приблизну довжину.",
    "Прибери ці проблеми зі стоп-листа:",
    list,
    "",
    "Нічого нового не додавай. Поверни тільки текст поста.",
    "",
    "Пост:",
    text,
  ].join("\n");
}

// ── Назви YouTube ────────────────────────────────────────────────
// Використання: для кожного з 5 варіантів lintTitle(title, { guest }).
// blocks → перегенерувати цей варіант; warnings → бейдж.

export function lintTitle(title: string, opts: { guest?: string } = {}): LintResult {
  const base = lintPost(title);
  const blocks = [...base.blocks];
  const warnings = [...base.warnings];
  const t = title.trim();

  if (/:/u.test(t)) blocks.push({ rule: "двокрапка в назві", match: ":" });
  if (/!/u.test(t)) blocks.push({ rule: "«!» в назві", match: "!" });
  if (new RegExp(`(?<!${L})від\\s[^|]{1,40}?\\sдо\\s`, "iu").test(t)) blocks.push({ rule: "«від X до Y» в назві", match: "від … до …" });
  if (/(?<!\d)(?:19|20)\d{2}(?!\d)/u.test(t)) warnings.push({ rule: "рік у назві: перевір, чи він є в транскрипті", match: t.match(/(?:19|20)\d{2}/u)![0] });
  if (t.length < 30 || t.length > 75) warnings.push({ rule: `довжина ${t.length} знаків (норма 40–70)`, match: "" });
  if (opts.guest && !t.includes(opts.guest)) warnings.push({ rule: `гостьовий епізод без « | ${opts.guest}»`, match: "" });

  return { blocks, warnings };
}

// ── Заголовок на обкладинку ──────────────────────────────────────
// Семантику («це тема, а не випадкова історія») лінтер не перевіряє — це правило 10 у SKILL.md.

export function lintCover(cover: string): LintResult {
  const base = lintPost(cover);
  const blocks = [...base.blocks];
  const warnings = [...base.warnings];
  const t = cover.trim();
  const words = t.split(/\s+/u).filter(Boolean).length;
  if (words < 2 || words > 7) blocks.push({ rule: `${words} слів (норма 3–7)`, match: "" });
  if (/:/u.test(t)) blocks.push({ rule: "двокрапка на обкладинці", match: ":" });
  if (/!/u.test(t)) blocks.push({ rule: "«!» на обкладинці", match: "!" });
  if (new RegExp(`(?<!${L})від\\s.{1,30}?\\sдо\\s`, "iu").test(t)) blocks.push({ rule: "«від X до Y» на обкладинці", match: "від … до …" });
  if (/^\d+\s+(?:причин|порад|способ|помилок|кроків)/iu.test(t)) blocks.push({ rule: "лістикл на обкладинці", match: t });
  return { blocks, warnings };
}

// ── Посилання на момент в епізоді ────────────────────────────────
// ytAt("https://youtu.be/abc", "23:39") → "https://youtu.be/abc?t=1419"
// Без посилання повертає плейсхолдер "[посилання@23:39]".

export function ytAt(url: string | undefined, time: string): string {
  if (!url) return `[посилання@${time}]`;
  const secs = time.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
  return `${url}${url.includes("?") ? "&" : "?"}t=${secs}`;
}

// Замінює всі [посилання] і [посилання@ММ:СС] у тексті, коли посилання вже відоме.
export function fillLinks(text: string, url: string): string {
  return text
    .replace(/\[посилання@(\d{1,2}:\d{2}(?::\d{2})?)\]/gu, (_, t) => ytAt(url, t))
    .replace(/\[посилання\]/gu, url);
}

// ── Відомі помилки розпізнавання ────────────────────────────────
// Виправляє автоматично, без перегенерації. Словник доповнюй, коли помічаєш нові.

const KNOWN_FIXES: [RegExp, string][] = [
  [/(?<!\p{L})Уман(?![ьіюн\p{L}])/gu, "Умань"],
  [/(?<!\p{L})[Дд]езаріум/gu, "Дизаріум"],
  [/(?<!\p{L})[Дд]изервін/gu, "Дизаріум"],
  [/(?<!\p{L})Федерів/gu, "Федорів"],
  [/(?<!\p{L})Преплі(?!\p{L})/gu, "Preply"],
  [/(?<!\p{L})Маннабаз\p{L}*|(?<!\p{L})Монобаз\p{L}*/gu, "Monobase"],
];

export function fixKnownNames(text: string): string {
  return KNOWN_FIXES.reduce((acc, [re, to]) => acc.replace(re, to), text);
}
