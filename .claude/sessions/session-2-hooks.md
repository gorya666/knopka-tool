# Session 2 — Hooks
# Paste this as your first message in a fresh Claude Code session.

## Context
Knopka Post-Production Tool — React + TypeScript + Vite.
Vite scaffold is done. Read .claude/CLAUDE.md before starting.
Do NOT touch: src/lib/prompt.ts, src/lib/regen-prompt.ts, src/lib/parser.ts, src/types/podcast.ts

## Your task: implement two hooks

---

### Hook 1: src/hooks/useTranscript.ts

Handles file upload and paste input. Returns:
- transcript: string
- fileName: string
- error: string | null
- loadFile: (file: File) => Promise<void>  — supports .txt and .docx
- clear: () => void

For .txt: use FileReader.readAsText()
For .docx: use the mammoth library (npm install mammoth) — mammoth.extractRawText({ arrayBuffer })
Show error if file is not .txt or .docx, or if parsing fails.

---

### Hook 2: src/hooks/useAnalyze.ts

Two responsibilities:
1. Full analysis (entire transcript → all fields)
2. Field regeneration (current field value + command → new value for that field only)

#### Full analysis
```ts
analyze: (transcript: string) => Promise<void>
```
- POST to https://api.anthropic.com/v1/messages
- Headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
- Model: claude-sonnet-4-20250514
- Max tokens: 4000
- System: SYSTEM_PROMPT from src/lib/prompt.ts
- User message: the transcript text
- On success: parse with parseAnalysisResult() from src/lib/parser.ts, then wrap with toVersionedResult()
- State transitions: analyzing → done | error

#### Field regeneration
```ts
regenerateField: (
  fieldKey: RegeneratingField,
  currentValue: string,
  command: QuickCommand
) => Promise<void>
```
- Uses buildFieldPrompt() or buildTitlesRegeneratePrompt() from src/lib/regen-prompt.ts
- NO system prompt — just a user message (cheaper)
- Max tokens: 800
- On success: parse response, call addVersion() on the correct field in VersionedResult
- Set regeneratingField state while running so UI can show per-card loading

#### State this hook manages
```ts
{
  appState: AppState,           // from src/types/podcast.ts
  regeneratingField: RegeneratingField,  // which card is loading
  setAppState: ...
}
```

---

## Done when
Both hooks compile without TypeScript errors.
npm run dev still works.
No runtime calls yet (we test in Session 3 when UI exists).
