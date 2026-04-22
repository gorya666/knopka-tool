import {
  type VersionedResult,
  type QuickCommand,
  type RegeneratingField,
  COMMANDS_BY_FIELD,
  current,
} from '@/types/podcast'
import { OutputCard } from './OutputCard'
import { ClipCard } from './ClipCard'
import { SocialTabs } from './SocialTabs'

interface ResultsPanelProps {
  result: VersionedResult
  regeneratingField: RegeneratingField
  regenStreamText?: string
  onNavigate: (field: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
  onCommand: (field: NonNullable<RegeneratingField>, cmd: QuickCommand) => void
  onCustomCommand?: (field: NonNullable<RegeneratingField>, instruction: string) => void
}

export function ResultsPanel({
  result,
  regeneratingField,
  regenStreamText = '',
  onNavigate,
  onCommand,
  onCustomCommand,
}: ResultsPanelProps) {
  const titles    = current(result.titles)
  const showNotes = current(result.showNotes)
  const chapters  = current(result.chapters)
  const clips     = current(result.clips)

  const chaptersCopyText = chapters.map((c) => `${c.time} ${c.title}`).join('\n')
  const titlesCopyText   = titles.map((t, i) => `${i + 1}. ${t}`).join('\n')

  return (
    <div className="divide-y divide-black/[0.08]">

      {/* ── Titles ──────────────────────────────────────────────────────────── */}
      <div className="py-6">
        <OutputCard
          label="назви епізоду"
          copyText={titlesCopyText}
          history={{ current: result.titles.currentIndex + 1, total: result.titles.versions.length }}
          onNavigate={(dir) => onNavigate('titles', dir)}
          commands={COMMANDS_BY_FIELD['titles'] as QuickCommand[]}
          onCommand={(cmd) => onCommand('titles', cmd)}
          onCustomCommand={onCustomCommand ? (instr) => onCustomCommand('titles', instr) : undefined}
          isRegenerating={regeneratingField === 'titles'}
          streamingText={regeneratingField === 'titles' ? regenStreamText : ''}
        >
          <ol className="space-y-3">
            {titles.map((title, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-sm text-black/40 tabular-nums pt-0.5 shrink-0 w-4">{i + 1}.</span>
                <p className="text-sm text-black leading-snug">{title}</p>
              </li>
            ))}
          </ol>
        </OutputCard>
      </div>

      {/* ── Show Notes ──────────────────────────────────────────────────────── */}
      <div className="py-6">
        <OutputCard
          label="нотатки шоу"
          copyText={showNotes}
          history={{ current: result.showNotes.currentIndex + 1, total: result.showNotes.versions.length }}
          onNavigate={(dir) => onNavigate('showNotes', dir)}
          commands={COMMANDS_BY_FIELD['showNotes'] as QuickCommand[]}
          onCommand={(cmd) => onCommand('showNotes', cmd)}
          onCustomCommand={onCustomCommand ? (instr) => onCustomCommand('showNotes', instr) : undefined}
          isRegenerating={regeneratingField === 'showNotes'}
          streamingText={regeneratingField === 'showNotes' ? regenStreamText : ''}
        >
          <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">{showNotes}</p>
        </OutputCard>
      </div>

      {/* ── Chapters ────────────────────────────────────────────────────────── */}
      <div className="py-6">
        <OutputCard
          label="розділи"
          copyText={chaptersCopyText}
          history={{ current: result.chapters.currentIndex + 1, total: result.chapters.versions.length }}
          onNavigate={(dir) => onNavigate('chapters', dir)}
          commands={[]}
          onCommand={() => {}}
          isRegenerating={regeneratingField === 'chapters'}
        >
          <ol className="space-y-2">
            {chapters.map((ch, i) => (
              <li key={i} className="flex items-baseline gap-6">
                <span className="text-sm text-black/60 tabular-nums shrink-0 w-14">{ch.time}</span>
                <span className="text-sm text-black">{ch.title}</span>
              </li>
            ))}
          </ol>
        </OutputCard>
      </div>

      {/* ── Clips ───────────────────────────────────────────────────────────── */}
      <div className="py-6">
        <OutputCard
          label="кліпи"
          copyText={clips.map((c) =>
            `[${c.timeRange}] ${c.excerpt}\n\ntiktok: ${c.tiktokCaption}`
          ).join('\n\n---\n\n')}
          history={{ current: result.clips.currentIndex + 1, total: result.clips.versions.length }}
          onNavigate={(dir) => onNavigate('clips', dir)}
          commands={COMMANDS_BY_FIELD['clips'] as QuickCommand[]}
          onCommand={(cmd) => onCommand('clips', cmd)}
          onCustomCommand={onCustomCommand ? (instr) => onCustomCommand('clips', instr) : undefined}
          isRegenerating={regeneratingField === 'clips'}
          streamingText={regeneratingField === 'clips' ? regenStreamText : ''}
        >
          {clips.map((clip, i) => (
            <ClipCard key={i} clip={clip} index={i} isLast={i === clips.length - 1} />
          ))}
        </OutputCard>
      </div>

      {/* ── Social Posts ────────────────────────────────────────────────────── */}
      <div className="py-6">
        <SocialTabs
          telegram={result.social.telegram}
          linkedin={result.social.linkedin}
          instagram={result.social.instagram}
          tiktok={result.social.tiktok}
          regeneratingField={regeneratingField}
          regenStreamText={regenStreamText}
          onNavigate={(field, dir) => onNavigate(field, dir)}
          onCommand={(field, cmd) => onCommand(field, cmd)}
          onCustomCommand={onCustomCommand}
        />
      </div>

    </div>
  )
}
