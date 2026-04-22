import { useState, type ReactNode } from 'react'
import { type QuickCommand, COMMAND_LABELS, COMMAND_ICONS } from '@/types/podcast'
import { ActionLabel } from './ActionLabel'

interface OutputCardProps {
  label: string
  copyText: string
  history: { current: number; total: number }
  onNavigate: (dir: 'prev' | 'next') => void
  commands: QuickCommand[]
  onCommand: (cmd: QuickCommand) => void
  onCustomCommand?: (instruction: string) => void
  isRegenerating: boolean
  streamingText?: string
  children: ReactNode
}

export function OutputCard({
  label,
  copyText,
  history,
  onNavigate,
  commands,
  onCommand,
  onCustomCommand,
  isRegenerating,
  streamingText = '',
  children,
}: OutputCardProps) {
  const [copied, setCopied] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
    } catch {
      const el = document.createElement('textarea')
      el.value = copyText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canPrev = history.current > 1
  const canNext = history.current < history.total

  const handleCustomRefine = () => {
    if (!customText.trim() || !onCustomCommand) return
    onCustomCommand(customText)
    setCustomText('')
    setShowCustomInput(false)
  }

  return (
    <div className="animate-fade-up">
      {/* Header — label + version nav (left) + copy button (right) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium text-black uppercase tracking-wider">{label}</h2>

          {history.total > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onNavigate('prev')}
                disabled={!canPrev || isRegenerating}
                className="flex items-center justify-center w-6 h-6 rounded text-black/60 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{'\uf053'}</span>
              </button>
              <span className="text-xs text-black/60 tabular-nums w-9 text-center">
                {history.current} / {history.total}
              </span>
              <button
                onClick={() => onNavigate('next')}
                disabled={!canNext || isRegenerating}
                className="flex items-center justify-center w-6 h-6 rounded text-black/60 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{'\uf054'}</span>
              </button>
            </div>
          )}
        </div>

        <ActionLabel
          icon={copied ? '\uf00c' : '\uf0c5'}
          onClick={handleCopy}
          disabled={isRegenerating}
          className="px-2.5 py-1.5 rounded hover:bg-black/06 transition-colors duration-150 shrink-0"
        >
          {copied ? 'скопійовано' : 'копіювати'}
        </ActionLabel>
      </div>

      {/* Content */}
      {isRegenerating ? (
        <div className="py-1 animate-fade-in">
          {streamingText ? (
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
              {streamingText}<span className="animate-cursor">▋</span>
            </p>
          ) : (
            <span className="text-sm text-black/40">cooking...</span>
          )}
        </div>
      ) : (
        <div key={history.current} className="animate-content-enter">
          {children}
        </div>
      )}

      {/* Refine buttons row + custom input below */}
      {(commands.length > 0 || onCustomCommand) && (
        <>
          {/* Action buttons row */}
          <div className="flex items-center gap-0.5 flex-wrap mt-3">
            {commands.map((cmd) => (
              <ActionLabel
                key={cmd}
                icon={COMMAND_ICONS[cmd]}
                onClick={() => onCommand(cmd)}
                disabled={isRegenerating}
                size="sm"
                className="px-2.5 py-1.5 rounded hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {COMMAND_LABELS[cmd]}
              </ActionLabel>
            ))}

            {/* Divider */}
            {onCustomCommand && commands.length > 0 && (
              <div className="w-px h-6 bg-black/24 mx-1" />
            )}

            {/* Custom input toggle button */}
            {onCustomCommand && (
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                disabled={isRegenerating}
                className="flex items-center justify-center w-6 h-6 rounded text-black hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <span className="nerd-icon text-[11px]">
                  {showCustomInput ? '\uf00d' : '\uf044'}
                </span>
              </button>
            )}
          </div>

          {/* Custom input field */}
          {showCustomInput && onCustomCommand && (
            <div className="flex items-end gap-2 mt-3">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="опишіть, як поліпшити цей варіант..."
                autoFocus
                disabled={isRegenerating}
                className="flex-1 px-2.5 py-1.5 text-sm rounded border border-black/20 placeholder-black/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-black/40 focus:ring-1 focus:ring-black/10 transition-all"
                rows={2}
              />
              <ActionLabel
                onClick={handleCustomRefine}
                disabled={!customText.trim() || isRegenerating}
                className="px-2.5 py-1.5 rounded hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 shrink-0"
              >
                послати
              </ActionLabel>
            </div>
          )}
        </>
      )}
    </div>
  )
}
