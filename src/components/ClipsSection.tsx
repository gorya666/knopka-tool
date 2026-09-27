import type { ClipSuggestion } from '@/types/podcast'

interface ClipsSectionProps {
  clips: ClipSuggestion[]
}

export function ClipsSection({ clips }: ClipsSectionProps) {
  if (clips.length === 0) {
    return <p className="text-sm text-black/40">пропозицій немає</p>
  }

  return (
    <div className="divide-y divide-black/[0.06]">
      {clips.map((clip, i) => (
        <div key={`${clip.start}-${i}`} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
          <span className="w-24 shrink-0 pt-0.5 text-sm text-black/60 tabular-nums">
            {clip.start}–{clip.end}
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-black leading-snug">{clip.about}</p>
            <p className="text-xs text-black/45 leading-snug">{clip.why}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
