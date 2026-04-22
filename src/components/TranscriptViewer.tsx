import { useState } from 'react'

interface TranscriptViewerProps {
  transcript: string
  fileName: string
}

export function TranscriptViewer({ transcript, fileName }: TranscriptViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const lines = transcript.split('\n')
  const previewLines = lines.slice(0, 5).join('\n')
  const hasMore = lines.length > 5

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
    } catch {
      const el = document.createElement('textarea')
      el.value = transcript
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded border border-black/07 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-black/55">транскрипт</span>
          <span className="text-black/20">·</span>
          <span className="text-xs text-black/55 truncate max-w-[200px]">{fileName}</span>
        </div>

        <button
          onClick={handleCopy}
          className={[
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all duration-150',
            copied
              ? 'bg-black text-[#E1FD02] font-medium'
              : 'text-black/50 hover:text-black/70 hover:bg-black/04',
          ].join(' ')}
        >
          {copied
            ? <><span className="nerd-icon">{'\uf00c'}</span> скопійовано</>
            : <><span className="nerd-icon">{'\uf0c5'}</span> копіювати</>
          }
        </button>
      </div>

      {/* Content */}
      <div
        className={[
          'overflow-hidden transition-[max-height] duration-300 ease-in-out',
          expanded ? 'max-h-[60vh] overflow-y-auto' : 'max-h-28',
        ].join(' ')}
      >
        <pre className="text-xs leading-relaxed text-black/60 whitespace-pre-wrap px-5 pb-4 break-words">
          {expanded ? transcript : previewLines}
          {!expanded && hasMore && <span className="text-black/30">…</span>}
        </pre>
      </div>

      {/* Expand / collapse */}
      {hasMore && (
        <div className="border-t border-black/05">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-black/50 hover:text-black/70 hover:bg-black/[0.01] transition-all duration-150"
          >
            <span className="nerd-icon text-xs">{expanded ? '\uf077' : '\uf078'}</span>
            {expanded ? 'згорнути' : `показати повністю · ${lines.length} рядків`}
          </button>
        </div>
      )}
    </div>
  )
}
