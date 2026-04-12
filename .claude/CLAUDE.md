# Knopka Post-Production Tool

## What this is
A single-page web app for Radio Knopka podcast post-production.
Upload a Riverside transcript → preview it → click Analyze → get all post-production content in one shot via Claude API.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Claude API (fetch, no SDK) — model: claude-sonnet-4-20250514
- Maple Font (webfont, loaded via @font-face in index.css)
- Nerd Font icons (unicode characters, not icon components)
- No backend, no auth, no database

## Env
VITE_ANTHROPIC_API_KEY in .env — never commit this file.
Access in code: import.meta.env.VITE_ANTHROPIC_API_KEY

## Folder structure
```
src/
  components/
    TranscriptInput.tsx   # file upload + paste textarea
    TranscriptViewer.tsx  # read-only preview of loaded transcript
    ResultsPanel.tsx      # all output sections
    OutputCard.tsx        # reusable: label + content + copy button
    SocialTabs.tsx        # tab switcher: Telegram/LinkedIn/Instagram/TikTok
    ClipCard.tsx          # short clip recommendation card
    LoadingState.tsx      # skeleton / progress while API call runs
  hooks/
    useAnalyze.ts         # Claude API call, streaming, state machine
    useTranscript.ts      # file upload logic, txt/docx parsing
  lib/
    prompt.ts             # system prompt — DO NOT EDIT without discussing
    parser.ts             # parse + validate Claude JSON response
  types/
    podcast.ts            # all TypeScript interfaces
  App.tsx
```

## App states
1. **empty** — initial, show upload area + paste option
2. **loaded** — transcript loaded, show TranscriptViewer + Analyze button
3. **analyzing** — API call in progress, show LoadingState
4. **done** — show ResultsPanel with all outputs

## Coding conventions
- Named exports everywhere (no default exports except App.tsx)
- TypeScript strict mode — no `any`
- All text strings in Ukrainian (UI labels, placeholders)
- Tailwind for all styling — no inline styles, no CSS modules
- shadcn/ui for: Button, Textarea, Tabs, Card, Badge
- Nerd Font icons: use unicode directly in JSX, e.g. `<span>󰉒</span>`
- Every output field must have a copy-to-clipboard button
- Copy feedback: button text changes to "Скопійовано!" for 2 seconds

## What NOT to do
- Do not edit src/lib/prompt.ts without explicitly asking first
- Do not add npm dependencies without flagging it first
- Do not add a backend, API routes, or any server-side code
- Do not use `any` type
- Do not use inline styles
- Do not create separate CSS files — use Tailwind classes only

## Current status
[ ] Project scaffolded
[ ] Types defined
[ ] Prompt written
[ ] useTranscript hook
[ ] TranscriptInput component
[ ] TranscriptViewer component
[ ] useAnalyze hook
[ ] ResultsPanel + child components
[ ] LoadingState
[ ] Polish + copy feedback
