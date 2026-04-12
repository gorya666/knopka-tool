# Design Direction — Knopka Tool

## Personality
Fun, editorial, breathable. Inspired by Luma.events.
NOT a dark developer terminal. NOT dense or corporate.
Think: a well-designed editorial tool that happens to be for podcast production.

---

## Brand Colors
- **Lime** (primary accent): `#E1FD02`
- **Black** (primary text + CTA bg): `#000000`
- **White** (page + card bg): `#FFFFFF`
- **Grey text**: `#6B7280` (secondary), `#9CA3AF` (muted/placeholder)
- **Border**: `rgba(0, 0, 0, 0.07)` — always very subtle
- **Surface**: `#FFFFFF` for cards, `#F9F9F9` for nested/inset areas

## Background
Page background is white with two very subtle radial gradient blobs:
```css
background:
  radial-gradient(ellipse 60% 40% at 0% 0%, rgba(225, 253, 2, 0.07) 0%, transparent 60%),
  radial-gradient(ellipse 50% 40% at 100% 100%, rgba(0, 0, 0, 0.03) 0%, transparent 60%),
  #FFFFFF;
```
The lime blob sits top-left, very faint. The rest is clean white.
This mimics Luma's soft pastel blobs but uses brand colors.

---

## Typography (Maple Mono)
All text uses Maple Mono — embrace the monospace personality.

**Global rules — no exceptions:**
- All UI text is lowercase. No uppercase. No title case. No sentence case.
  - ✓ `попередні епізоди` — UI label
  - ✓ `аналізувати епізод` — button label
  - ✗ `Аналізувати Епізод` — never
  - Exception: the actual content produced by Claude (titles, show notes, social posts) keeps normal capitalisation — that's the user's output, not our UI.
- No italic. Ever. `font-style: normal !important` is set globally in CSS.

**Type scale (5 steps, 1.25× ratio, fixed rem — app UI):**

| step | size | tailwind | role |
|------|------|----------|------|
| 1 | 0.6875rem / 11px | custom | captions, timestamps, tags |
| 2 | 0.75rem / 12px | `text-xs` | metadata, secondary info |
| 3 | 0.875rem / 14px | `text-sm` | primary body (default) |
| 4 | 1rem / 16px | `text-base` | subheadings, strong labels |
| 5 | 1.25rem / 20px | `text-xl` | main headings |

**Roles:**
- **headings**: `text-xl font-bold text-balance` — #000
- **subheadings / card labels**: `text-base font-semibold` — #000
- **labels / ui chrome**: `text-xs font-medium` — `text-black/30` (no uppercase, no tracking)
- **body / content**: `text-sm leading-relaxed text-pretty` — `#374151`
- **captions / timestamps**: `text-[11px]` — `text-black/25`

**Gradient text** (for key highlights only — episode title, logo accent):
  ```css
  background: linear-gradient(135deg, #000000 0%, #6B7280 60%, #E1FD02 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  ```
  Use sparingly — one or two moments per screen max.

---

## Buttons

### Primary CTA (e.g. "Аналізувати епізод")
```
bg-black text-[#E1FD02] font-medium text-sm
px-4 py-2 rounded-xl
hover: bg-[#111] scale-[1.02] shadow-md
transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1)
```
Compact — NOT full width, NOT tall. Fits content.

### Secondary / Ghost (e.g. "Очистити", "Скасувати")
```
bg-[#F3F4F6] text-[#374151] font-medium text-sm
px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.07)]
hover: bg-[#EBEBEB]
transition: all 150ms ease-out
```

### Copy button (inside OutputCard)
```
bg-transparent text-[#9CA3AF] text-xs
hover: text-black
Copied state: text-[#E1FD02] bg-black px-2 py-0.5 rounded-md
```

---

## Cards (OutputCard, ClipCard, TranscriptViewer)
```
bg-white
rounded-2xl (= border-radius: 16px)
border border-[rgba(0,0,0,0.07)]
shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)
p-5 or p-6
```

**Hover state** (where cards are interactive):
```
hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]
hover:-translate-y-0.5
transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Never** use heavy shadows. If it looks dramatic, halve the opacity.

---

## Inputs / Textarea
```
bg-white
rounded-xl border border-[rgba(0,0,0,0.10)]
shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]
focus: border-[#E1FD02] ring-2 ring-[rgba(225,253,2,0.20)] outline-none
text-sm text-[#111] placeholder:text-[#9CA3AF]
transition: border 150ms ease-out, box-shadow 150ms ease-out
```

---

## Layout
- **Max width**: `max-w-[800px] mx-auto`
- **Page padding**: `px-6 py-12` (desktop), `px-4 py-8` (mobile)
- **Between major sections**: `gap-8` or `space-y-8`
- **Inside cards**: `gap-4` or `space-y-4`
- Content is centered. Nothing is full-bleed except the page background.

---

## Logo (top-left header)
The logo is at `/public/logo.png` — a black speech bubble shape with bold "PK" in lime (#E1FD02).

```tsx
<img src="/logo.png" alt="Radio Knopka" className="h-9 w-auto" />
```

Display at `h-9` (36px tall). No text next to it — the logo is self-contained.
Header is minimal: logo left, nothing else (this is a single-user tool).
During analyzing state: add `animate-pulse` to the logo image.

---

## Tabs (SocialTabs)
```
Underline-style tabs, NOT pill/box tabs.
Active tab: border-b-2 border-black text-black font-medium
Inactive tab: text-[#9CA3AF] hover:text-[#374151]
Tab bar has a bottom border: border-b border-[rgba(0,0,0,0.07)]
```

---

## Badges / Labels
```
Inline labels for clip types (hot_take, tip, quote):
text-xs font-medium px-2 py-0.5 rounded-full
hot_take: bg-[#E1FD02] text-black
tip: bg-[#F3F4F6] text-[#374151]
quote: bg-black text-[#E1FD02]
```

---

## Animation (Emil Kowalski principles)
Apply these ONLY — no other animation without explicit discussion.

### Entry animations (page load / state transition)
Use staggered fade-in for card lists:
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Apply with increasing delay: 0ms, 60ms, 120ms, 180ms... */
animation: fadeUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
```

### Hover states
- Cards: `hover:-translate-y-0.5 hover:shadow-md` — 200ms spring
- Buttons: `hover:scale-[1.02]` — 150ms spring
- Copy button text swap: crossfade via `transition: opacity 100ms`

### Analyzing state
Pulse the logo dot: `animate-pulse` on the lime dot in the header.
Show skeleton cards (not spinner) with `animate-pulse bg-[#F3F4F6]`.

### DO NOT use:
- rotate, skew, 3D transforms
- bounce or elastic on anything the user didn't initiate
- transitions > 300ms
- animations on page load that delay content by more than 400ms total

---

## Upload area (TranscriptInput — empty state)
Large, centered drop zone with dashed border:
```
border-2 border-dashed border-[rgba(0,0,0,0.12)]
rounded-2xl p-12
hover: border-[#E1FD02] bg-[rgba(225,253,2,0.03)]
transition: all 200ms ease-out
```
On drag-over: lime border + very faint lime tint background.
Center text: `text-[#9CA3AF] text-sm` — short, friendly Ukrainian copy.

---

## Fun copy — analyzing state
While Claude is working, cycle through these messages every 2.5 seconds.
They appear below the logo, centered, in `text-sm text-black/40`.
All messages lowercase. No italic.
Fade out the old one, fade in the next — `transition: opacity 400ms ease`.

```ts
export const ANALYZING_MESSAGES = [
  "Слухаю уважно...",
  "Виловлюю найкращі моменти...",
  "Придумую три варіанти назви...",
  "Шукаю найсильніший хук...",
  "Пишу нотатки шоу...",
  "Розставляю розділи по часу...",
  "Знаходжу кліп для TikTok...",
  "Готую пост для Telegram...",
  "Думаю як редактор...",
  "Майже готово...",
]
```

Implementation: `useState` with index, `useEffect` with `setInterval(2500ms)`.
Clear interval when analyzing ends.
Show the cycling message + a thin animated progress line at the top of the page
(like a browser loading bar — `h-0.5 bg-[#E1FD02]` that grows from 0→85% over ~20s, snaps to 100% on done).

## Loading skeleton shape
Match the actual output layout:
- One wide skeleton bar = title placeholder
- Three shorter bars = show notes paragraphs
- Small pill skeletons = chapter timestamps
All: `rounded-lg bg-[#F3F4F6] animate-pulse`

---

## What NOT to do
- No dark mode. White only.
- No gradients on buttons (only on occasional text).
- No heavy drop shadows (nothing above 12px blur, nothing above 0.08 opacity).
- No border-radius below 8px for any interactive element.
- No full-width buttons unless on mobile.
- No emoji in UI text — use Nerd Font icons or nothing.
- No color other than lime, black, white, and greys.
- No decorative illustrations or icons — pure typography + structure.
