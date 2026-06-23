interface LoadingStateProps {
  streamingText?: string
}

const ESTIMATED_CHARS   = 7000   // ~avg full JSON response length
const ESTIMATED_SECONDS = 22     // ~avg time for Claude to complete

const PHASES = [
  { threshold: 0,  label: 'зчитую транскрипт...' },
  { threshold: 12, label: 'генерую назви та розділи...' },
  { threshold: 32, label: 'пишу нотатки шоу...' },
  { threshold: 58, label: 'готую пости для соцмереж...' },
  { threshold: 78, label: 'добираю ключові ідеї...' },
  { threshold: 90, label: 'майже готово...' },
]

export function LoadingState({ streamingText = '' }: LoadingStateProps) {
  const progress = streamingText.length > 0
    ? Math.min((streamingText.length / ESTIMATED_CHARS) * 100, 95)
    : 2

  const elapsed   = streamingText.length / (ESTIMATED_CHARS / ESTIMATED_SECONDS)
  const remaining = Math.max(0, Math.ceil(ESTIMATED_SECONDS - elapsed))

  const phase = [...PHASES].reverse().find(p => progress >= p.threshold)?.label ?? PHASES[0].label

  return (
    <div className="flex flex-col items-center gap-7 pt-[200px]">

      {/* Wave dots */}
      <div className="flex items-center gap-[7px]">
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-1" />
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-2" />
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-3" />
      </div>

      {/* Phase label */}
      <p className="text-sm text-black/50">{phase}</p>

      {/* Progress bar + time */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-xs text-black/30 tabular-nums">
          <span>{Math.round(progress)}%</span>
          {remaining > 1 && <span>~{remaining}с</span>}
        </div>
        <div className="w-full h-[3px] bg-black/08 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

    </div>
  )
}
