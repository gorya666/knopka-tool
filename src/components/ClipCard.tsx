import { type Clip, type ClipType } from '@/types/podcast'

interface ClipCardProps {
  clip: Clip
  index: number
  isLast: boolean
}

const TYPE_LABEL: Record<ClipType, string> = {
  hot_take: 'гостра думка',
  tip:      'порада',
  quote:    'цитата',
}

export function ClipCard({ clip, index, isLast }: ClipCardProps) {
  return (
    <div
      className={`space-y-3 py-4 ${!isLast ? 'border-b border-black/06' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Timestamp + type label */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/60 tabular-nums">{clip.timeRange}</span>
        <span className="text-black/30">·</span>
        <span className="text-sm text-black/60">{TYPE_LABEL[clip.type]}</span>
      </div>

      {/* Excerpt — left border quote style */}
      <p className="text-sm text-black leading-relaxed border-l-2 border-black/20 pl-3">
        {clip.excerpt}
      </p>

      {/* Why it works */}
      <p className="text-sm text-black/60 leading-relaxed">
        <span className="font-medium text-black">чому це працює — </span>
        {clip.whyItWorks}
      </p>
    </div>
  )
}
