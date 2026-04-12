# Session 1 — Claude Code Instruction
# Paste this as your first message when you open Claude Code in the project folder.

---

## Context
This is the Knopka Post-Production Tool — a Vite + React + TypeScript single-page app.
Read .claude/CLAUDE.md before doing anything.
The types (src/types/podcast.ts), prompt (src/lib/prompt.ts), and parser (src/lib/parser.ts) are already written — do not overwrite them.

## Your task for this session

Set up the full project scaffold. Do all of this in one go:

### 1. Init Vite project (if package.json doesn't exist yet)
```
npm create vite@latest . -- --template react-ts
```

### 2. Install dependencies
```
npm install
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init
npx shadcn@latest add button textarea tabs card badge
```

### 3. Configure Tailwind
Set up tailwind.config.ts with:
- content: ['./index.html', './src/**/*.{ts,tsx}']
- fontFamily: { mono: ['Maple', 'monospace'], sans: ['Maple', 'sans-serif'] }

### 4. Set up index.css
- Import Tailwind directives
- @font-face for Maple font (assume woff2 files will be in /public/fonts/)
- @font-face for NerdFontsSymbolsOnly (same location)
- .nerd-icon { font-family: 'NerdFontsSymbolsOnly'; }
- Dark background as default: body { background: #0f0f0f; color: #f0f0f0; }

### 5. Set up .env.example
```
VITE_ANTHROPIC_API_KEY=your_key_here
```

### 6. Update .gitignore
Make sure .env is in .gitignore — this is critical.

### 7. Create placeholder files (just the export, no implementation yet)
- src/hooks/useTranscript.ts
- src/hooks/useAnalyze.ts
- src/components/TranscriptInput.tsx
- src/components/TranscriptViewer.tsx
- src/components/ResultsPanel.tsx
- src/components/OutputCard.tsx
- src/components/SocialTabs.tsx
- src/components/ClipCard.tsx
- src/components/LoadingState.tsx

### 8. App.tsx
Set up the state machine using AppState from src/types/podcast.ts.
Render different layouts based on status: empty | loaded | analyzing | done | error.
Just render the status name as text for now — no real components yet.

### 9. Verify it runs
```
npm run dev
```
Should open without errors. The page can show just the current state name.

## Do NOT do in this session
- Do not implement any component logic
- Do not make any API calls
- Do not touch src/lib/prompt.ts or src/lib/parser.ts or src/types/podcast.ts

## Done when
`npm run dev` runs without errors and the app renders something on screen.
