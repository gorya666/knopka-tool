import {
  type VersionedResult,
  type QuickCommand,
  type RegeneratingField,
  COMMANDS_BY_FIELD,
  current,
} from '@/types/podcast'
import { buildFullDescription, withLinks } from '@/lib/parser'
import { OutputCard } from './OutputCard'
import { EpisodeMetaBar } from './EpisodeMetaBar'
import { ClipsSection } from './ClipsSection'
import { PostsSection } from './PostsSection'

interface ResultsPanelProps {
  result: VersionedResult
  regeneratingField: RegeneratingField
  regenStreamText?: string
  onNavigate: (field: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
  onCommand: (field: NonNullable<RegeneratingField>, cmd: QuickCommand) => void
  onCustomCommand?: (field: NonNullable<RegeneratingField>, instruction: string) => void
  onPublishedChange: (postId: string, text: string) => void
  onYoutubeUrlChange: (url: string) => void
}

function numbered(items: string[]): string {
  return items.map((t, i) => `${i + 1}. ${t}`).join('\n')
}

export function ResultsPanel({
  result,
  regeneratingField,
  regenStreamText = '',
  onNavigate,
  onCommand,
  onCustomCommand,
  onPublishedChange,
  onYoutubeUrlChange,
}: ResultsPanelProps) {
  const titles      = current(result.titles)
  const description = current(result.description)
  const chapters    = current(result.chapters)
  const coverTitles = current(result.coverTitles)
  const clips       = current(result.clips)
  const url         = result.youtubeUrl

  const custom = (field: NonNullable<RegeneratingField>) =>
    onCustomCommand ? (instr: string) => onCustomCommand(field, instr) : undefined

  return (
    <div className="space-y-8">

      <EpisodeMetaBar
        meta={result.meta}
        youtubeUrl={url}
        onYoutubeUrlChange={onYoutubeUrlChange}
      />

      <div className="divide-y divide-black/[0.08]">

        {/* ── YouTube ─────────────────────────────────────────────────────── */}
        <div className="space-y-6 pb-8">
          <h2 className="text-xs font-medium text-black/40">youtube</h2>

          <OutputCard
            label="назви епізоду"
            copyText={numbered(titles)}
            history={{ current: result.titles.currentIndex + 1, total: result.titles.versions.length }}
            onNavigate={(dir) => onNavigate('titles', dir)}
            commands={COMMANDS_BY_FIELD['titles'] as QuickCommand[]}
            onCommand={(cmd) => onCommand('titles', cmd)}
            onCustomCommand={custom('titles')}
            isRegenerating={regeneratingField === 'titles'}
            streamingText={regeneratingField === 'titles' ? regenStreamText : ''}
          >
            <ol className="space-y-3">
              {titles.map((title, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-4 shrink-0 pt-0.5 text-sm text-black/40 tabular-nums">{i + 1}.</span>
                  <p className="text-sm text-black leading-snug">{title}</p>
                </li>
              ))}
            </ol>
          </OutputCard>

          {/* YouTube reads chapters from the description, so copying hands over
              description + chapters + footer as one block. */}
          <OutputCard
            label="опис"
            copyText={withLinks(buildFullDescription(description, chapters), url)}
            history={{ current: result.description.currentIndex + 1, total: result.description.versions.length }}
            onNavigate={(dir) => onNavigate('description', dir)}
            commands={COMMANDS_BY_FIELD['description'] as QuickCommand[]}
            onCommand={(cmd) => onCommand('description', cmd)}
            onCustomCommand={custom('description')}
            isRegenerating={regeneratingField === 'description'}
            streamingText={regeneratingField === 'description' ? regenStreamText : ''}
          >
            <div className="space-y-3">
              <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
                {withLinks(description, url)}
              </p>
              <p className="text-xs text-black/35 leading-snug">
                копіюється разом з чаптерами і футером — YouTube бере чаптери з опису
              </p>
            </div>
          </OutputCard>

          <OutputCard
            label="чаптери"
            copyText={chapters.map((c) => `${c.time} ${c.title}`).join('\n')}
            history={{ current: result.chapters.currentIndex + 1, total: result.chapters.versions.length }}
            onNavigate={(dir) => onNavigate('chapters', dir)}
            commands={COMMANDS_BY_FIELD['chapters'] as QuickCommand[]}
            onCommand={(cmd) => onCommand('chapters', cmd)}
            onCustomCommand={custom('chapters')}
            isRegenerating={regeneratingField === 'chapters'}
          >
            <ol className="space-y-2">
              {chapters.map((ch, i) => (
                <li key={i} className="flex items-baseline gap-6">
                  <span className="w-14 shrink-0 text-sm text-black/60 tabular-nums">{ch.time}</span>
                  <span className="text-sm text-black">{ch.title}</span>
                </li>
              ))}
            </ol>
          </OutputCard>

          <OutputCard
            label="заголовки на обкладинку"
            copyText={numbered(coverTitles)}
            history={{ current: result.coverTitles.currentIndex + 1, total: result.coverTitles.versions.length }}
            onNavigate={(dir) => onNavigate('coverTitles', dir)}
            commands={COMMANDS_BY_FIELD['coverTitles'] as QuickCommand[]}
            onCommand={(cmd) => onCommand('coverTitles', cmd)}
            onCustomCommand={custom('coverTitles')}
            isRegenerating={regeneratingField === 'coverTitles'}
            streamingText={regeneratingField === 'coverTitles' ? regenStreamText : ''}
          >
            <ol className="space-y-2">
              {coverTitles.map((title, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-4 shrink-0 pt-0.5 text-sm text-black/40 tabular-nums">{i + 1}.</span>
                  <p className="text-sm text-black leading-snug">{title}</p>
                </li>
              ))}
            </ol>
          </OutputCard>
        </div>

        {/* ── Posts ───────────────────────────────────────────────────────── */}
        <div className="py-8">
          <PostsSection
            posts={result.posts}
            youtubeUrl={url}
            regeneratingField={regeneratingField}
            regenStreamText={regenStreamText}
            onNavigate={onNavigate}
            onCommand={onCommand}
            onCustomCommand={onCustomCommand}
            onPublishedChange={onPublishedChange}
          />
        </div>

        {/* ── Clips ───────────────────────────────────────────────────────── */}
        <div className="pt-8">
          <OutputCard
            label="пропозиції кліпів"
            copyText={clips.map((c) => `${c.start}–${c.end} ${c.about}\n${c.why}`).join('\n\n')}
            history={{ current: result.clips.currentIndex + 1, total: result.clips.versions.length }}
            onNavigate={(dir) => onNavigate('clips', dir)}
            commands={COMMANDS_BY_FIELD['clips'] as QuickCommand[]}
            onCommand={(cmd) => onCommand('clips', cmd)}
            onCustomCommand={custom('clips')}
            isRegenerating={regeneratingField === 'clips'}
          >
            <ClipsSection clips={clips} />
          </OutputCard>
        </div>

      </div>
    </div>
  )
}
