import { type SavedEpisode, formatSavedAt } from '@/lib/history'

interface EpisodeCardProps {
  episode: SavedEpisode
  index: number
  onClick: (episode: SavedEpisode) => void
}

export function EpisodeCard({ episode, index, onClick }: EpisodeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(episode)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(episode)}
      className="group flex items-start justify-between gap-3 rounded bg-white px-5 py-4 cursor-pointer
        card-shadow card-shadow-hover
        hover:-translate-y-0.5
        transition-all duration-200 ease-out text-left animate-fade-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black leading-snug line-clamp-2">
          {episode.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm text-black/60 truncate max-w-[200px]">{episode.fileName}</span>
          <span className="text-black/20 text-sm">·</span>
          <span className="text-sm text-black/60 shrink-0">{formatSavedAt(episode.savedAt)}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded bg-black/04 group-hover:bg-black/08 transition-colors duration-150 mt-0.5">
        <span className="nerd-icon text-xs text-black/40">{'\uf061'}</span>
      </div>
    </div>
  )
}
