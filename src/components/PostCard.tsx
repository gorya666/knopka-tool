import { useState } from 'react'
import {
  COMMANDS_BY_FIELD,
  POST_FORMAT_LABELS,
  current,
  type QuickCommand,
  type VersionedPost,
} from '@/types/podcast'
import { withLinks } from '@/lib/parser'
import { OutputCard, type CopyVariant } from './OutputCard'
import { ActionLabel } from './ActionLabel'

interface PostCardProps {
  post: VersionedPost
  // Numbered by the section when a format appears more than once
  label?: string
  youtubeUrl: string
  isRegenerating: boolean
  streamingText?: string
  onNavigate: (dir: 'prev' | 'next') => void
  onCommand: (cmd: QuickCommand) => void
  onCustomCommand?: (instruction: string) => void
  onPublishedChange: (text: string) => void
}

export function PostCard({
  post,
  label,
  youtubeUrl,
  isRegenerating,
  streamingText = '',
  onNavigate,
  onCommand,
  onCustomCommand,
  onPublishedChange,
}: PostCardProps) {
  const body = current(post.body)
  const [showPublished, setShowPublished] = useState(false)

  const hasPublished = post.publishedText.trim().length > 0
  const { blocks, warnings } = body.lint
  const { endings, firstComment } = body

  const fill = (text: string) => withLinks(text, youtubeUrl)

  // The top five goes to two platforms and carries a first comment for
  // LinkedIn, so it gets a button per destination.
  const copyVariants: CopyVariant[] | undefined = endings
    ? [
        { label: 'instagram', text: fill(`${body.text}\n\n${endings.instagram}`) },
        { label: 'linkedin', text: fill(`${body.text}\n\n${endings.linkedin}`) },
        ...(firstComment ? [{ label: 'перший коментар', text: fill(firstComment) }] : []),
      ]
    : undefined

  return (
    <OutputCard
      label={label ?? POST_FORMAT_LABELS[post.format]}
      copyText={fill(body.text)}
      copyVariants={copyVariants}
      badge={`день ${post.dayOffset}`}
      history={{ current: post.body.currentIndex + 1, total: post.body.versions.length }}
      onNavigate={onNavigate}
      commands={COMMANDS_BY_FIELD['post'] as QuickCommand[]}
      onCommand={onCommand}
      onCustomCommand={onCustomCommand}
      isRegenerating={isRegenerating}
      streamingText={streamingText}
    >
      <div className="space-y-3">
        <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">{fill(body.text)}</p>

        {endings && (
          <div className="space-y-1 border-l-2 border-black/08 pl-3">
            <p className="text-xs text-black/45 leading-snug">
              <span className="text-black/70">instagram</span> — {endings.instagram}
            </p>
            <p className="text-xs text-black/45 leading-snug">
              <span className="text-black/70">linkedin</span> — {endings.linkedin}
            </p>
          </div>
        )}

        {firstComment && (
          <div className="space-y-1.5 rounded bg-black/[0.02] px-3 py-2.5">
            <p className="text-xs text-black/70">перший коментар для linkedin</p>
            <p className="text-xs text-black/55 leading-relaxed whitespace-pre-wrap">
              {fill(firstComment)}
            </p>
          </div>
        )}

        {(blocks.length > 0 || warnings.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {blocks.map((issue, i) => (
              <span
                key={`b-${i}`}
                className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600"
                title="блокуюче правило стоп-листа"
              >
                {issue}
              </span>
            ))}
            {warnings.map((issue, i) => (
              <span
                key={`w-${i}`}
                className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"
                title="попередження — подумати ще раз"
              >
                {issue}
              </span>
            ))}
          </div>
        )}

        {/* Published text — filled in by hand after posting, so we can later
            compare generated against published and tune the prompt. */}
        <div className="pt-0.5">
          <ActionLabel
            icon={hasPublished ? '' : ''}
            size="sm"
            onClick={() => setShowPublished(!showPublished)}
            className="rounded px-2.5 py-1.5 text-black/50 hover:bg-black/06 hover:text-black transition-colors duration-150"
          >
            {hasPublished ? 'опубліковано' : 'додати опублікований текст'}
          </ActionLabel>

          {showPublished && (
            <textarea
              value={post.publishedText}
              onChange={(e) => onPublishedChange(e.target.value)}
              placeholder="встав сюди текст, який реально опублікували..."
              autoFocus
              rows={4}
              className="mt-2 w-full rounded border border-black/20 px-2.5 py-1.5 text-sm placeholder-black/40 transition-all focus:border-black/40 focus:outline-none focus:ring-1 focus:ring-black/10"
            />
          )}

          {hasPublished && !showPublished && (
            <p className="mt-2 text-xs text-black/45 leading-snug whitespace-pre-wrap line-clamp-3">
              {post.publishedText}
            </p>
          )}
        </div>
      </div>
    </OutputCard>
  )
}
