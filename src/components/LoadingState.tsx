import { PHASE_LABELS, type AnalyzePhase } from '@/types/podcast'

interface LoadingStateProps {
  streamingText?: string
  phase?: AnalyzePhase
}

// Rough payload size per streaming pass, used to fill the bar. The lint pass
// makes many small parallel calls and streams nothing, so it runs indeterminate.
const ESTIMATED_CHARS: Record<AnalyzePhase, number> = {
  analysis: 5000,
  youtube:  3000,
  social:   6000,
  lint:     0,
}

// Each pass owns a slice of the bar, so it always moves forward overall.
const PHASE_RANGE: Record<AnalyzePhase, [number, number]> = {
  analysis: [0, 35],
  youtube:  [35, 60],
  social:   [60, 90],
  lint:     [90, 97],
}

export function LoadingState({ streamingText = '', phase = 'analysis' }: LoadingStateProps) {
  const [from, to] = PHASE_RANGE[phase]
  const estimated = ESTIMATED_CHARS[phase]

  const within = estimated > 0 ? Math.min(streamingText.length / estimated, 1) : 0.5
  const progress = from + (to - from) * within

  return (
    <div className="flex flex-col items-center gap-7 pt-[200px]">

      {/* Wave dots */}
      <div className="flex items-center gap-[7px]">
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-1" />
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-2" />
        <div className="w-[7px] h-[7px] rounded-full bg-black animate-wave-3" />
      </div>

      {/* Phase label */}
      <p className="text-sm text-black/50">{PHASE_LABELS[phase]}...</p>

      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-xs text-black/30 tabular-nums">
          <span>{Math.round(progress)}%</span>
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
