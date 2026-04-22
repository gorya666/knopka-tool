import { useState } from 'react'
import { ShimmerText } from './ui/shimmer-text'

const MESSAGES = [
  'ballin...',
  'cooking...',
  'dribblin...',
]

interface LoadingStateProps {
  streamingText?: string
}

export function LoadingState({ streamingText = '' }: LoadingStateProps) {
  const [message] = useState(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  )

  // Progress: streaming chars / estimated total, capped at 95%
  const progress = streamingText.length > 0
    ? Math.min((streamingText.length / 10000) * 100, 95)
    : 2

  return (
    <div className="flex flex-col items-center gap-6 pt-[260px]">
      <ShimmerText className="text-2xl text-black font-medium">
        {message}
      </ShimmerText>

      {/* Full-width 4px line loader */}
      <div className="w-full h-[4px] bg-black/08 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
