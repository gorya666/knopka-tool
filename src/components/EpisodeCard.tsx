import { useState } from 'react'
import { type SavedEpisode, deleteEpisode, formatSavedAt } from '@/lib/history'

interface EpisodeCardProps {
  episode: SavedEpisode
  index: number
  onClick: (episode: SavedEpisode) => void
  onDeleted: () => void
}

export function EpisodeCard({ episode, index, onClick, onDeleted }: EpisodeCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      deleteEpisode(episode.id)
      onDeleted()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(episode)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(episode)}
      className="group relative rounded-2xl border border-black/07 bg-white px-5 py-4 cursor-pointer
        shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]
        hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)] hover:-translate-y-0.5
        transition-all duration-200 ease-out text-left animate-fade-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex items-start justify-between gap-3 pr-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black leading-snug line-clamp-2">
            {episode.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-black/25 truncate max-w-[160px]">{episode.fileName}</span>
            <span className="text-black/15 text-xs">·</span>
            <span className="text-xs text-black/25 shrink-0">{formatSavedAt(episode.savedAt)}</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-black/04 group-hover:bg-black/08 transition-colors duration-150 mt-0.5">
          <span className="nerd-icon text-xs text-black/30">{'\uf061'}</span>
        </div>
      </div>

      {/* Delete — appears on hover */}
      <button
        onClick={handleDelete}
        className={[
          'absolute top-3.5 right-3 text-xs px-1.5 py-0.5 rounded-md transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          confirmDelete
            ? 'bg-red-500 text-white'
            : 'text-black/20 hover:text-red-400 hover:bg-red-50',
        ].join(' ')}
      >
        {confirmDelete ? 'видалити?' : <span className="nerd-icon">{'\uf00d'}</span>}
      </button>
    </div>
  )
}
