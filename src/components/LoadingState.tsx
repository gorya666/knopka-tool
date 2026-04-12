import { useEffect, useState } from 'react'

// ─── Fun cycling messages (from design-direction.md) ─────────────────────────

const MESSAGES = [
  'слухаю уважно...',
  'виловлюю найкращі моменти...',
  'придумую три варіанти назви...',
  'шукаю найсильніший хук...',
  'пишу нотатки шоу...',
  'розставляю розділи по часу...',
  'знаходжу кліп для tiktok...',
  'готую пост для telegram...',
  'думаю як редактор...',
  'майже готово...',
]

export function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  // Cycle messages with crossfade every 2.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Progress bar — thin lime line at top of this section */}
      <div className="relative h-0.5 rounded-full bg-black/06 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#E1FD02] animate-progress-bar" />
      </div>

      {/* Cycling message */}
      <div className="flex flex-col items-center gap-3 py-4">
        <img
          src="/logo.png"
          alt="Radio Knopka"
          className="h-9 w-auto animate-pulse"
        />
        <p
          className="text-sm text-black/40 text-center transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {MESSAGES[msgIndex]}
        </p>
      </div>

      {/* Skeleton cards — match the shape of what's loading */}
      <div className="space-y-3">
        {/* Titles skeleton */}
        <SkeletonCard>
          <div className="space-y-2">
            <SkeletonBar width="w-1/3" height="h-3" />
            <SkeletonBar width="w-full" height="h-4" />
            <SkeletonBar width="w-4/5" height="h-4" />
            <SkeletonBar width="w-11/12" height="h-4" />
          </div>
        </SkeletonCard>

        {/* Show notes skeleton */}
        <SkeletonCard>
          <div className="space-y-2">
            <SkeletonBar width="w-1/4" height="h-3" />
            <SkeletonBar width="w-full" height="h-3.5" />
            <SkeletonBar width="w-full" height="h-3.5" />
            <SkeletonBar width="w-3/4" height="h-3.5" />
          </div>
        </SkeletonCard>

        {/* Chapters skeleton */}
        <SkeletonCard>
          <div className="space-y-2">
            <SkeletonBar width="w-1/4" height="h-3" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBar width="w-12" height="h-3" />
                <SkeletonBar width="w-48" height="h-3" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Social + clips skeleton — side by side feel */}
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard>
            <SkeletonBar width="w-1/2" height="h-3" />
            <div className="mt-2 space-y-1.5">
              <SkeletonBar width="w-full" height="h-3" />
              <SkeletonBar width="w-4/5" height="h-3" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBar width="w-1/2" height="h-3" />
            <div className="mt-2 space-y-1.5">
              <SkeletonBar width="w-full" height="h-3" />
              <SkeletonBar width="w-3/5" height="h-3" />
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton sub-components ──────────────────────────────────────────────────

function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/07 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  )
}

function SkeletonBar({ width, height }: { width: string; height: string }) {
  return (
    <div
      className={`${width} ${height} rounded-lg bg-[#F3F4F6] animate-pulse`}
    />
  )
}
