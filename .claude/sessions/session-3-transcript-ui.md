# Session 3 — Transcript UI
# Paste this as your first message in a fresh Claude Code session.

## Context
Knopka Post-Production Tool. Hooks are done. Read .claude/CLAUDE.md.
Read .claude/skills/component-patterns.md for font and icon setup.

## Your task: two components + wire up App.tsx

---

### Component 1: src/components/TranscriptInput.tsx

The empty state screen. Two ways to load a transcript:

**Upload zone:**
- Drag & drop area or click to browse
- Accepts .txt and .docx only
- Shows file name + character count after load
- Uses useTranscript hook

**Paste fallback:**
- Shadcn Textarea below the upload zone
- Placeholder: "Або встав текст транскрипту сюди..."
- Character counter bottom-right

**After transcript loads (either way):**
- Show transcript preview (first 300 chars + "...") in a muted box
- Big primary button: "Аналізувати епізод →"
- Small secondary button: "Очистити"
- Disable Analyze button if transcript < 500 chars

---

### Component 2: src/components/TranscriptViewer.tsx

A collapsible panel showing the full transcript text.
- Collapsed by default — shows first 5 lines + "Показати повністю ↓"
- Expanded: full scrollable text, max-height: 60vh with overflow-y: auto
- Monospace font (font-mono = Maple)
- Muted text color, slightly smaller font size
- Toggle button at bottom: "Згорнути ↑"
- Copy full transcript button in header

---

### Wire up App.tsx

Connect real state machine using useAnalyze hook:
- status === 'empty': render TranscriptInput
- status === 'loaded': render TranscriptViewer + Analyze button
- status === 'analyzing': render LoadingState (placeholder div for now)
- status === 'done': render placeholder "Results coming in Session 4"
- status === 'error': render error message + retry button

---

## Visual requirements
- Dark background: bg-[#0f0f0f]
- Cards: bg-[#1a1a1a] with border border-[#2a2a2a]
- Accent color: text-[#d6f230] (Radio Knopka yellow)
- All UI text in Ukrainian
- Maple font loaded and working

## Done when
You can drag a .txt file onto the page, see it load, read the transcript, and click Analyze (even if results aren't real yet).
