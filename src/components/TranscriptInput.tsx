import { useRef, useState } from 'react'

interface TranscriptInputProps {
  transcript: string
  fileName: string
  error: string | null
  isLoading: boolean
  onFileLoad: (file: File) => Promise<void>
  onAnalyze: () => void
  onClear: () => void
}

const MIN_LENGTH = 500

// One hint picked randomly on mount — no animation, no cycling
const DROP_HINTS = [
  'дропай транскрибцію',
  'кидай сюди',
  'що там, як епізод?',
]

export function TranscriptInput({
  transcript,
  fileName,
  error,
  isLoading,
  onFileLoad,
  onAnalyze,
  onClear,
}: TranscriptInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hint] = useState(() => DROP_HINTS[Math.floor(Math.random() * DROP_HINTS.length)])
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoaded = transcript.length > 0
  const canAnalyze = transcript.length >= MIN_LENGTH


  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void onFileLoad(file)
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void onFileLoad(file)
    e.target.value = ''
  }

  // Two-step clear: first click asks, second confirms
  const handleClear = () => {
    if (confirmClear) {
      onClear()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  // ── Empty: drop zone ───────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="space-y-3 animate-fade-up">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="завантажити транскрипт"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className={[
            'group flex flex-col items-center justify-center gap-4',
            'rounded border-2 border-dashed px-8 py-12',
            'cursor-pointer select-none transition-all duration-200',
            isDragging
              ? 'border-black/30 bg-black/[0.02] scale-[1.01]'
              : 'border-black/10 hover:border-black/20',
          ].join(' ')}
        >
          {/* Upload icon */}
          <div className={[
            'flex items-center justify-center w-11 h-11 rounded',
            'border border-black/08 bg-white',
            'shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
            'transition-all duration-200 ease-out',
            'group-hover:scale-125 group-hover:rotate-[15deg]',
            isDragging ? 'scale-110 rotate-[15deg]' : '',
          ].join(' ')}>
            <span className="nerd-icon text-base text-black/35 select-none">{'\uf093'}</span>
          </div>

          <p className="text-sm text-black">
            {isDragging ? 'відпускай!' : hint}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 text-center animate-fade-in">{error}</p>
        )}
      </div>
    )
  }

  // ── Loaded: file info + actions ────────────────────────────────────────────
  return (
    <div className="space-y-3 animate-fade-up">
      {/* File row */}
      <div className="flex items-center justify-between px-4 py-3 rounded border border-black/07 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-[#E1FD02] shrink-0">
            <span className="text-[11px] leading-none text-black select-none">▪</span>
          </div>
          <span className="text-sm text-black truncate">{fileName}</span>
          <span className="text-sm text-black/60 shrink-0 tabular-nums">
            {transcript.length.toLocaleString('uk')} симв.
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-black hover:opacity-70 transition-opacity duration-150 shrink-0 ml-3"
        >
          змінити
        </button>
      </div>

      {!canAnalyze && (
        <p className="text-sm text-black/60 text-center">
          потрібно щонайменше {MIN_LENGTH} символів — зараз {transcript.length}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center animate-fade-in">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze || isLoading}
          className={[
            'px-5 py-2 rounded text-sm font-medium transition-all duration-150',
            canAnalyze && !isLoading
              ? 'bg-black text-[#E1FD02] hover:bg-[#111] hover:scale-[1.02] active:scale-[0.99] shadow-[0_1px_3px_rgba(0,0,0,0.15)]'
              : 'bg-black/08 text-black/25 cursor-not-allowed',
          ].join(' ')}
        >
          {isLoading ? 'аналізую...' : 'аналізувати епізод'}
        </button>

        <button
          onClick={handleClear}
          className={[
            'px-4 py-2 rounded text-sm transition-all duration-150',
            confirmClear
              ? 'bg-red-500 text-white font-medium'
              : 'text-black/40 bg-[#F3F4F6] hover:bg-[#EBEBEB] border border-black/07',
          ].join(' ')}
        >
          {confirmClear ? 'точно видалити?' : 'очистити'}
        </button>
      </div>
    </div>
  )
}
