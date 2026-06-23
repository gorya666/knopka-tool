// Short mode results panel — thumbnail title + social caption
// Used when the transcript is under SHORT_THRESHOLD characters.

import { useState } from 'react'
import type { VersionedShortResult, ShortResult } from '../types/podcast'
import { current } from '../types/podcast'

interface ShortResultPanelProps {
  shortResult: VersionedShortResult
  regeneratingField: 'thumbnailTitle' | 'socialCaption' | null
  regenStreamText: string
  onRegenerate: (field: keyof ShortResult) => void
  onNavigate: (field: keyof ShortResult, dir: 'prev' | 'next') => void
}

export function ShortResultPanel({
  shortResult,
  regeneratingField,
  regenStreamText,
  onRegenerate,
  onNavigate,
}: ShortResultPanelProps) {
  return (
    <div className="space-y-4">
      <ShortField
        label="назва для обкладинки"
        value={current(shortResult.thumbnailTitle)}
        history={shortResult.thumbnailTitle}
        fieldKey="thumbnailTitle"
        isRegenerating={regeneratingField === 'thumbnailTitle'}
        regenStreamText={regenStreamText}
        onRegenerate={onRegenerate}
        onNavigate={onNavigate}
        large
      />
      <ShortField
        label="підпис для соцмереж"
        value={current(shortResult.socialCaption)}
        history={shortResult.socialCaption}
        fieldKey="socialCaption"
        isRegenerating={regeneratingField === 'socialCaption'}
        regenStreamText={regenStreamText}
        onRegenerate={onRegenerate}
        onNavigate={onNavigate}
      />
    </div>
  )
}

// ─── Individual field card ────────────────────────────────────────────────────

interface FieldHistory {
  versions: string[]
  currentIndex: number
}

interface ShortFieldProps {
  label: string
  value: string
  history: FieldHistory
  fieldKey: keyof ShortResult
  isRegenerating: boolean
  regenStreamText: string
  onRegenerate: (field: keyof ShortResult) => void
  onNavigate: (field: keyof ShortResult, dir: 'prev' | 'next') => void
  large?: boolean
}

function ShortField({
  label,
  value,
  history,
  fieldKey,
  isRegenerating,
  regenStreamText,
  onRegenerate,
  onNavigate,
  large,
}: ShortFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasPrev = history.currentIndex > 0
  const hasNext = history.currentIndex < history.versions.length - 1
  const showNav = history.versions.length > 1

  const displayValue = isRegenerating && regenStreamText ? regenStreamText : value

  return (
    <div className="rounded bg-white card-shadow p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-black/40 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1.5">
          {/* History nav */}
          {showNav && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onNavigate(fieldKey, 'prev')}
                disabled={!hasPrev}
                className="w-6 h-6 flex items-center justify-center rounded text-black/30 hover:text-black/60 hover:bg-black/05 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                title="попередній варіант"
              >
                <span className="nerd-icon text-xs">{''}</span>
              </button>
              <span className="text-xs text-black/30 tabular-nums min-w-[28px] text-center">
                {history.currentIndex + 1}/{history.versions.length}
              </span>
              <button
                onClick={() => onNavigate(fieldKey, 'next')}
                disabled={!hasNext}
                className="w-6 h-6 flex items-center justify-center rounded text-black/30 hover:text-black/60 hover:bg-black/05 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
                title="наступний варіант"
              >
                <span className="nerd-icon text-xs">{''}</span>
              </button>
            </div>
          )}

          {/* Regen button */}
          <button
            onClick={() => onRegenerate(fieldKey)}
            disabled={isRegenerating}
            className="w-7 h-7 flex items-center justify-center rounded text-black/30 hover:text-black hover:bg-black/05 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            title="переписати"
          >
            <span className={`nerd-icon text-xs ${isRegenerating ? 'animate-spin' : ''}`}>{''}</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded text-xs font-medium bg-black/04 text-black/50 hover:bg-black hover:text-[#E1FD02] transition-all duration-150"
          >
            {copied ? (
              'Скопійовано!'
            ) : (
              <>
                <span className="nerd-icon text-xs">{''}</span>
                копіювати
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <p className={`text-black leading-snug whitespace-pre-wrap ${large ? 'text-2xl font-bold' : 'text-sm'} ${isRegenerating ? 'opacity-50' : ''}`}>
        {displayValue || <span className="text-black/20 italic">генерується...</span>}
      </p>
    </div>
  )
}
