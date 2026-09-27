import type { EpisodeMeta } from '@/types/podcast'

interface EpisodeMetaBarProps {
  meta: EpisodeMeta
  youtubeUrl: string
  onYoutubeUrlChange: (url: string) => void
}

// What the tool worked out from the transcript on its own, plus the one field
// that comes after generation: paste the YouTube link and every [посилання]
// placeholder is filled in when you copy a text.
export function EpisodeMetaBar({ meta, youtubeUrl, onYoutubeUrlChange }: EpisodeMetaBarProps) {
  return (
    <div className="space-y-3 rounded border border-black/07 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-xs text-black/40">визначено з транскрипту</p>

      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        <span className="text-sm text-black">
          <span className="text-black/45">гість: </span>
          {meta.guest ? `${meta.guest.name} — ${meta.guest.role}` : 'немає'}
        </span>

        <span className="text-sm text-black">
          <span className="text-black/45">закрита частина: </span>
          {meta.hasClosedPart ? 'є' : 'немає'}
        </span>
      </div>

      {meta.rawTranscript && (
        <p className="rounded bg-amber-50 px-2 py-1.5 text-xs leading-snug text-amber-700">
          транскрипт схожий на сирий запис — таймкоди чаптерів і кліпів не збігатимуться зі змонтованим відео
        </p>
      )}

      <div className="space-y-1.5 border-t border-black/07 pt-3">
        <label htmlFor="yt-url" className="block text-xs text-black/40">
          посилання на youtube
        </label>
        <input
          id="yt-url"
          type="text"
          value={youtubeUrl}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
          placeholder="https://youtu.be/..."
          className="w-full rounded border border-black/20 px-2.5 py-1.5 text-sm placeholder-black/30 transition-all focus:border-black/40 focus:outline-none focus:ring-1 focus:ring-black/10"
        />
        <p className="text-xs text-black/35 leading-snug">
          {youtubeUrl.trim()
            ? 'підставляється в усі тексти при копіюванні, разом з таймкодами'
            : 'поки порожнє — в текстах лишається [посилання]'}
        </p>
      </div>
    </div>
  )
}
