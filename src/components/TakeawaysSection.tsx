import { useState } from 'react'
import {
  type FieldHistory,
  type QuickCommand,
  type RegeneratingField,
  type Takeaway,
  type TakeawayView,
  COMMANDS_BY_FIELD,
  COMMAND_ICONS,
  current,
} from '@/types/podcast'
import { ActionLabel } from './ActionLabel'

interface TakeawaysSectionProps {
  takeaways: [
    FieldHistory<Takeaway>,
    FieldHistory<Takeaway>,
    FieldHistory<Takeaway>,
    FieldHistory<Takeaway>,
    FieldHistory<Takeaway>,
  ]
  regeneratingField: RegeneratingField
  onNavigate: (index: number, dir: 'prev' | 'next') => void
  onCommand: (index: number, cmd: QuickCommand) => void
  onCustomCommand?: (index: number, instruction: string) => void
}

const commands = COMMANDS_BY_FIELD['takeaway'] as QuickCommand[]

// Nerd Font icons (Font Awesome range)
const ICON_PREV = ''
const ICON_NEXT = ''
const ICON_COPY = ''
const ICON_CHECK = ''
const ICON_PENCIL = ''
const ICON_CLOSE = ''

function TakeawayRow({
  index,
  history,
  view,
  isRegen,
  onNavigate,
  onCommand,
  onCustomCommand,
}: {
  index: number
  history: FieldHistory<Takeaway>
  view: TakeawayView
  isRegen: boolean
  onNavigate: (dir: 'prev' | 'next') => void
  onCommand: (cmd: QuickCommand) => void
  onCustomCommand?: (instruction: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')

  const takeaway = current(history)
  const text = view === 'linkedin' ? takeaway.linkedin : takeaway.instagram

  const canPrev = history.currentIndex > 0
  const canNext = history.currentIndex < history.versions.length - 1

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group">
      <div className="flex items-start gap-3 py-2.5">
        {/* Number */}
        <span className="text-xs text-black/30 tabular-nums mt-1 w-4 shrink-0">{index + 1}</span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isRegen ? (
            <span className="text-sm text-black/40">cooking...</span>
          ) : (
            <p
              key={`${view}-${history.currentIndex}`}
              className="text-sm text-black leading-relaxed animate-content-enter whitespace-pre-wrap"
            >
              {text}
            </p>
          )}
        </div>

        {/* Actions — visible on hover or when custom input open */}
        <div className={[
          'flex items-center gap-0.5 shrink-0 transition-opacity duration-150',
          showCustomInput ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}>
          {/* Version nav */}
          {history.versions.length > 1 && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                disabled={!canPrev || isRegen}
                className="flex items-center justify-center w-6 h-6 rounded text-black/50 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{ICON_PREV}</span>
              </button>
              <span className="text-[10px] text-black/40 tabular-nums w-6 text-center">
                {history.currentIndex + 1}/{history.versions.length}
              </span>
              <button
                onClick={() => onNavigate('next')}
                disabled={!canNext || isRegen}
                className="flex items-center justify-center w-6 h-6 rounded text-black/50 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{ICON_NEXT}</span>
              </button>
            </>
          )}

          {/* Copy */}
          <ActionLabel
            icon={copied ? ICON_CHECK : ICON_COPY}
            onClick={handleCopy}
            disabled={isRegen}
            className="px-1.5 py-1 rounded hover:bg-black/06 transition-colors duration-150"
          />

          {/* Refine commands */}
          {commands.map((cmd) => (
            <ActionLabel
              key={cmd}
              icon={COMMAND_ICONS[cmd]}
              onClick={() => onCommand(cmd)}
              disabled={isRegen}
              size="sm"
              className="px-1.5 py-1 rounded hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
            />
          ))}

          {/* Custom input toggle */}
          {onCustomCommand && (
            <>
              <div className="w-px h-4 bg-black/20 mx-0.5" />
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                disabled={isRegen}
                className="flex items-center justify-center w-6 h-6 rounded text-black hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <span className="nerd-icon text-[10px]">
                  {showCustomInput ? ICON_CLOSE : ICON_PENCIL}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom input */}
      {showCustomInput && onCustomCommand && (
        <div className="flex items-end gap-2 pl-7 pb-2 animate-fade-in">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="опишіть, як поліпшити цей висновок..."
            autoFocus
            disabled={isRegen}
            className="flex-1 px-2.5 py-1.5 text-sm rounded border border-black/20 placeholder-black/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-black/40 focus:ring-1 focus:ring-black/10 transition-all"
            rows={2}
          />
          <ActionLabel
            onClick={() => {
              if (!customText.trim()) return
              onCustomCommand(customText)
              setCustomText('')
              setShowCustomInput(false)
            }}
            disabled={!customText.trim() || isRegen}
            className="px-2.5 py-1.5 rounded hover:bg-black/06 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 shrink-0"
          >
            послати
          </ActionLabel>
        </div>
      )}

      <div className="h-px bg-black/06 ml-7" />
    </div>
  )
}

export function TakeawaysSection({
  takeaways,
  regeneratingField,
  onNavigate,
  onCommand,
  onCustomCommand,
}: TakeawaysSectionProps) {
  const [view, setView] = useState<TakeawayView>('linkedin')
  const [copiedAll, setCopiedAll] = useState(false)

  // Assemble the full post for the active view — numbered for LinkedIn (Lenny-style),
  // newline-separated for Instagram carousel slides.
  const copyAll = async () => {
    const lines = takeaways.map((h, i) => {
      const t = current(h)
      const text = view === 'linkedin' ? t.linkedin : t.instagram
      return view === 'linkedin' ? `${i + 1}. ${text}` : text
    })
    const joined = lines.join('\n\n')
    try {
      await navigator.clipboard.writeText(joined)
    } catch {
      const el = document.createElement('textarea')
      el.value = joined
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="animate-fade-up">
      {/* Header: title + view toggle + copy all */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-base font-medium text-black">ключові висновки</h2>

        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex items-center rounded bg-black/04 p-0.5">
            <button
              onClick={() => setView('linkedin')}
              className={[
                'px-2.5 py-1 rounded text-xs transition-colors duration-150',
                view === 'linkedin' ? 'bg-white text-black card-shadow' : 'text-black/50 hover:text-black',
              ].join(' ')}
            >
              linkedin
            </button>
            <button
              onClick={() => setView('instagram')}
              className={[
                'px-2.5 py-1 rounded text-xs transition-colors duration-150',
                view === 'instagram' ? 'bg-white text-black card-shadow' : 'text-black/50 hover:text-black',
              ].join(' ')}
            >
              instagram
            </button>
          </div>

          {/* Copy all */}
          <ActionLabel
            icon={copiedAll ? ICON_CHECK : ICON_COPY}
            onClick={copyAll}
            className="px-2.5 py-1.5 rounded hover:bg-black/06 transition-colors duration-150 shrink-0"
          >
            {copiedAll ? 'скопійовано' : 'копіювати все'}
          </ActionLabel>
        </div>
      </div>

      <div>
        {takeaways.map((history, i) => {
          const fieldKey = `takeaway_${i}` as RegeneratingField
          return (
            <TakeawayRow
              key={i}
              index={i}
              history={history}
              view={view}
              isRegen={regeneratingField === fieldKey}
              onNavigate={(dir) => onNavigate(i, dir)}
              onCommand={(cmd) => onCommand(i, cmd)}
              onCustomCommand={onCustomCommand ? (instr) => onCustomCommand(i, instr) : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
