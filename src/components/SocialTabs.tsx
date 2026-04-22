import { useState } from 'react'
import { type FieldHistory, type QuickCommand, COMMANDS_BY_FIELD, COMMAND_LABELS, COMMAND_ICONS, current } from '@/types/podcast'
import { ActionLabel } from './ActionLabel'

interface SocialTabsProps {
  telegram: FieldHistory<string>
  linkedin: FieldHistory<string>
  instagram: FieldHistory<string>
  tiktok: FieldHistory<string>
  regeneratingField: string | null
  regenStreamText?: string
  onNavigate: (field: 'telegram' | 'linkedin' | 'instagram' | 'tiktok', dir: 'prev' | 'next') => void
  onCommand: (field: 'telegram' | 'linkedin' | 'instagram' | 'tiktok', cmd: QuickCommand) => void
  onCustomCommand?: (field: 'telegram' | 'linkedin' | 'instagram' | 'tiktok', instruction: string) => void
}

type Platform = 'telegram' | 'linkedin' | 'instagram' | 'tiktok'

const TABS: { id: Platform; label: string }[] = [
  { id: 'telegram',  label: 'telegram' },
  { id: 'linkedin',  label: 'linkedin' },
  { id: 'instagram', label: 'instagram' },
  { id: 'tiktok',    label: 'tiktok' },
]

export function SocialTabs({
  telegram, linkedin, instagram, tiktok,
  regeneratingField,
  regenStreamText = '',
  onNavigate,
  onCommand,
  onCustomCommand,
}: SocialTabsProps) {
  const [active, setActive] = useState<Platform>('telegram')
  const [copied, setCopied] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')

  const fields: Record<Platform, FieldHistory<string>> = { telegram, linkedin, instagram, tiktok }
  const activeField = fields[active]
  const isRegen = regeneratingField === active
  const copyText = current(activeField)
  const history = { current: activeField.currentIndex + 1, total: activeField.versions.length }
  const canPrev = history.current > 1
  const canNext = history.current < history.total
  const commands = COMMANDS_BY_FIELD[active] as QuickCommand[]

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

  return (
    <div className="animate-fade-up">
      {/* Header — tabs (left) + version nav + copy (right) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActive(tab.id); setCopied(false) }}
              className={[
                'px-2.5 py-1 text-sm font-medium transition-all duration-150 rounded',
                active === tab.id
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:text-black hover:bg-black/06',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {history.total > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onNavigate(active, 'prev')}
                disabled={!canPrev || isRegen}
                className="flex items-center justify-center w-6 h-6 rounded text-black/60 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{'\uf053'}</span>
              </button>
              <span className="text-xs text-black/60 tabular-nums w-9 text-center">
                {history.current} / {history.total}
              </span>
              <button
                onClick={() => onNavigate(active, 'next')}
                disabled={!canNext || isRegen}
                className="flex items-center justify-center w-6 h-6 rounded text-black/60 hover:text-black hover:bg-black/06 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-100"
              >
                <span className="nerd-icon text-[10px]">{'\uf054'}</span>
              </button>
            </div>
          )}

          <ActionLabel
            icon={copied ? '\uf00c' : '\uf0c5'}
            onClick={handleCopy}
            disabled={isRegen}
            className="px-2.5 py-1.5 rounded hover:bg-black/06 transition-colors duration-150"
          >
            {copied ? 'скопійовано' : 'копіювати'}
          </ActionLabel>
        </div>
      </div>

      {/* Content */}
      {isRegen ? (
        <div className="py-1 animate-fade-in">
          {regenStreamText ? (
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
              {regenStreamText}<span className="animate-cursor">▋</span>
            </p>
          ) : (
            <span className="text-sm text-black/40">cooking...</span>
          )}
        </div>
      ) : (
        <div key={history.current} className="animate-content-enter">
          <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
            {copyText}
          </p>
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
                onClick={() => onCommand(active, cmd)}
                disabled={isRegen}
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
                disabled={isRegen}
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
                disabled={isRegen}
                className="flex-1 px-2.5 py-1.5 text-sm rounded border border-black/20 placeholder-black/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-black/40 focus:ring-1 focus:ring-black/10 transition-all"
                rows={2}
              />
              <ActionLabel
                onClick={() => {
                  if (!customText.trim() || !onCustomCommand) return
                  onCustomCommand(active, customText)
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
        </>
      )}
    </div>
  )
}
