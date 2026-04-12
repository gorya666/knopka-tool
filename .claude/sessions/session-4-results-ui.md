# Session 4 — Results UI
# Paste this as your first message in a fresh Claude Code session.

## Context
Knopka Post-Production Tool. Transcript UI works. Read .claude/CLAUDE.md.
Read .claude/skills/component-patterns.md carefully — OutputCard pattern is defined there.

## Your task: full results panel with history nav + quick commands

---

### Component: src/components/OutputCard.tsx

The core reusable wrapper for every output section.

Props:
```ts
interface OutputCardProps {
  label: string;           // section title e.g. "Назви епізоду"
  copyText: string;        // what gets copied
  history: { current: number; total: number };  // e.g. { current: 2, total: 3 }
  onNavigate: (dir: 'prev' | 'next') => void;
  commands: QuickCommand[];
  onCommand: (cmd: QuickCommand) => void;
  isRegenerating: boolean;
  children: ReactNode;
}
```

Card anatomy (top to bottom):
1. Header row: label (left) + history nav (right)
   - History nav: "← 2 / 3 →" — arrows disabled at boundaries
   - Only show nav if total > 1
2. Content area: children
3. Footer row: quick command buttons (left) + copy button (right)
   - Quick commands: small ghost buttons, wrap on overflow
   - Copy button: "Копіювати" → "Скопійовано!" for 2s

When isRegenerating: overlay content with subtle pulse animation, disable all buttons.

---

### Component: src/components/SocialTabs.tsx

Tab switcher for the 4 social platforms.
- Tabs: Telegram | LinkedIn | Instagram | TikTok
- Each tab = one OutputCard with platform-specific commands
- Active tab indicator uses accent color #d6f230

---

### Component: src/components/ClipCard.tsx

One short clip recommendation. Shows:
- Type badge: "🔥 Гостра думка" | "💡 Порада" | "💬 Цитата"
- Time range: e.g. "17:52 – 21:00"
- Excerpt quote (italic, muted)
- "Чому це працює:" explanation
- TikTok caption in a separate box with its own copy button

---

### Component: src/components/ResultsPanel.tsx

Assembles all output cards. Layout:
- Top: TranscriptViewer (collapsed) + "Новий епізод" button
- Section 1: Titles (3 options shown as a numbered list inside one OutputCard)
- Section 2: Show Notes
- Section 3: Timestamps (chapters as plain list, copy copies YouTube-ready format)
- Section 4: Short Clips (3 ClipCard components, wrapped in one OutputCard for history nav)
- Section 5: Social Posts (SocialTabs)

All sections visible at once — no accordion, no tabs between sections.

---

## Done when
Full results render correctly from a real API call.
History nav works — generate, hit a command, navigate back to original.
Copy buttons work on all fields.
