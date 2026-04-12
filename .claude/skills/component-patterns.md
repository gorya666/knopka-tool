# Skill: Component Patterns

## OutputCard
The core reusable component. Every output section uses it.

```tsx
// Pattern — always follow this shape
<OutputCard label="Назва епізоду" nerdIcon="󰉒">
  <p>{content}</p>
  {/* copy button is built into OutputCard, pass `copyText` prop */}
</OutputCard>
```

Props:
- label: string — section title in Ukrainian
- nerdIcon: string — nerd font unicode character
- copyText: string — what gets copied on click
- children: ReactNode — rendered content

## Copy button behavior
- Default state: icon + "Копіювати"
- After click: "Скопійовано!" for 2000ms, then revert
- Use navigator.clipboard.writeText()
- Wrap in try/catch, fallback to document.execCommand for older browsers

## Loading state
- Show skeleton cards matching the real output layout
- Animate with Tailwind: animate-pulse
- Don't show a spinner — show the shape of what's coming

## App state transitions
empty → loaded: when transcript file is parsed or pasted text is non-empty
loaded → analyzing: when user clicks "Аналізувати епізод" button
analyzing → done: when API call resolves successfully
analyzing → error: when API call fails or JSON parse fails
done → loaded: when user clicks "Новий епізод" (resets results, keeps transcript)
any → empty: when user clicks "Очистити"

## Font setup (Maple Font)
Add to index.css:
```css
@font-face {
  font-family: 'Maple';
  src: url('/fonts/MapleMono-Regular.woff2') format('woff2');
  font-weight: 400;
}
/* repeat for Bold, Italic variants */
```
Then in tailwind.config: fontFamily: { mono: ['Maple', 'monospace'] }
Use font-mono class for code-like elements and labels.

## Nerd Font icons
Download NerdFontsSymbolsOnly from nerdfonts.com and put in /public/fonts/
Add @font-face for it in index.css.
Usage: <span className="nerd-icon">󰉒</span>
Add .nerd-icon { font-family: 'NerdFontsSymbolsOnly' } in index.css.
