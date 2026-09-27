import {
  POST_FORMAT_LABELS,
  type QuickCommand,
  type RegeneratingField,
  type VersionedPost,
} from '@/types/podcast'
import { PostCard } from './PostCard'

interface PostsSectionProps {
  posts: VersionedPost[]
  youtubeUrl: string
  regeneratingField: RegeneratingField
  regenStreamText?: string
  onNavigate: (field: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => void
  onCommand: (field: NonNullable<RegeneratingField>, cmd: QuickCommand) => void
  onCustomCommand?: (field: NonNullable<RegeneratingField>, instruction: string) => void
  onPublishedChange: (postId: string, text: string) => void
}

// Cards run in publishing order, so the section reads like the calendar it is.
function inCalendarOrder(posts: VersionedPost[]): Array<{ post: VersionedPost; label: string }> {
  const counts = new Map<string, number>()
  for (const p of posts) counts.set(p.format, (counts.get(p.format) ?? 0) + 1)

  const seen = new Map<string, number>()
  return [...posts]
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map((post) => {
      const n = (seen.get(post.format) ?? 0) + 1
      seen.set(post.format, n)
      const base = POST_FORMAT_LABELS[post.format]
      return { post, label: (counts.get(post.format) ?? 0) > 1 ? `${base} ${n}` : base }
    })
}

export function PostsSection({
  posts,
  youtubeUrl,
  regeneratingField,
  regenStreamText = '',
  onNavigate,
  onCommand,
  onCustomCommand,
  onPublishedChange,
}: PostsSectionProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-black/40">постів немає</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-medium text-black/40">пости</h2>

      <div className="divide-y divide-black/[0.08]">
        {inCalendarOrder(posts).map(({ post, label }) => {
          const field = `post_${post.id}` as NonNullable<RegeneratingField>
          return (
            <div key={post.id} className="py-6 first:pt-0 last:pb-0">
              <PostCard
                post={post}
                label={label}
                youtubeUrl={youtubeUrl}
                isRegenerating={regeneratingField === field}
                streamingText={regeneratingField === field ? regenStreamText : ''}
                onNavigate={(dir) => onNavigate(field, dir)}
                onCommand={(cmd) => onCommand(field, cmd)}
                onCustomCommand={onCustomCommand ? (instr) => onCustomCommand(field, instr) : undefined}
                onPublishedChange={(text) => onPublishedChange(post.id, text)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
