import { useEffect, useState, useCallback } from 'react'
import './index.css'
import { Agentation } from 'agentation'
import { useAnalyze } from './hooks/useAnalyze'
import { useTranscript } from './hooks/useTranscript'
import { TranscriptInput } from './components/TranscriptInput'
import { LoadingState } from './components/LoadingState'
import { EpisodeCard } from './components/EpisodeCard'
import { ResultsPanel } from './components/ResultsPanel'
import { loadEpisodes, saveEpisode, type SavedEpisode } from './lib/history'
import { runFieldRegen, applyFieldUpdate } from './lib/field-regen'
import {
  toVersionedResult,
  navigate,
  type VersionedResult,
  type QuickCommand,
  type RegeneratingField,
} from './types/podcast'
import { deleteEpisode } from './lib/history'
import { ActionLabel } from './components/ActionLabel'

// ─── View mode ────────────────────────────────────────────────────────────────
type ViewMode = { mode: 'home' } | { mode: 'episode'; episode: SavedEpisode }

export default function App() {
  const { appState, setAppState, regeneratingField, regenStreamText, regenError, analyze, regenerateField, navigateField } = useAnalyze()
  const { transcript, fileName, error, loadFile, clear } = useTranscript()

  const [view, setView] = useState<ViewMode>({ mode: 'home' })
  const [episodes, setEpisodes] = useState<SavedEpisode[]>(() => loadEpisodes())

  const refreshEpisodes = useCallback(() => {
    setEpisodes(loadEpisodes())
  }, [])

  // ── Auto-analyze when transcript is loaded ────────────────────────────────
  const MIN_LENGTH = 500
  useEffect(() => {
    if (transcript.length >= MIN_LENGTH && appState.status === 'empty') {
      void analyze(transcript, fileName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, fileName])

  // ── Auto-save when analysis completes ────────────────────────────────────
  const [lastSavedFileName, setLastSavedFileName] = useState<string | null>(null)
  useEffect(() => {
    if (appState.status !== 'done') return

    const doneState = appState as Extract<typeof appState, { status: 'done' }>
    if (doneState.fileName === lastSavedFileName) return

    const r = doneState.result
    const flat = {
      titles: [
        r.titles.versions[r.titles.currentIndex][0],
        r.titles.versions[r.titles.currentIndex][1],
        r.titles.versions[r.titles.currentIndex][2],
      ] as [string, string, string],
      showNotes: r.showNotes.versions[r.showNotes.currentIndex],
      chapters: r.chapters.versions[r.chapters.currentIndex],
      clips: r.clips.versions[r.clips.currentIndex],
      social: {
        telegram: r.social.telegram.versions[r.social.telegram.currentIndex],
        linkedin: r.social.linkedin.versions[r.social.linkedin.currentIndex],
        instagram: r.social.instagram.versions[r.social.instagram.currentIndex],
        tiktok: r.social.tiktok.versions[r.social.tiktok.currentIndex],
      },
    }
    saveEpisode(doneState.fileName, flat, doneState.transcript)
    setLastSavedFileName(doneState.fileName)
    refreshEpisodes()
  }, [appState.status, lastSavedFileName])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClear = () => {
    clear()
    setAppState({ status: 'empty' })
    setView({ mode: 'home' })
  }

  const handleRetry = () => {
    setAppState({ status: 'empty' })
    clear()
  }

  const handleNewEpisode = () => {
    clear()
    setAppState({ status: 'empty' })
  }

  const handleViewEpisode = (episode: SavedEpisode) => {
    setView({ mode: 'episode', episode })
  }

  const handleBackHome = () => {
    setView({ mode: 'home' })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at 0% 0%, rgba(225, 253, 2, 0.07) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 100% 100%, rgba(0, 0, 0, 0.025) 0%, transparent 60%),
          #FFFFFF
        `,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[680px] mx-auto px-6 py-3">
          <button onClick={handleBackHome} className="focus:outline-none">
            <img
              src="/logo.png"
              alt="Radio Knopka"
              className={[
                'h-9 w-auto transition-opacity duration-150 hover:opacity-80',
              ].join(' ')}
            />
          </button>
        </div>
      </header>

      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-[680px] mx-auto px-6 py-10 space-y-10">

        {/* ── EPISODE VIEW ───────────────────────────────────────────────── */}
        {view.mode === 'episode' && (
          <EpisodeView
            episode={view.episode}
            onBack={handleBackHome}
            onDeleted={refreshEpisodes}
          />
        )}

        {/* ── HOME VIEW ──────────────────────────────────────────────────── */}
        {view.mode === 'home' && (
          <>
            {/* EMPTY */}
            {(appState.status === 'empty' || appState.status === 'loaded') && (
              <div className="space-y-10">
                <TranscriptInput
                  transcript={transcript}
                  fileName={fileName}
                  error={error}
                  isLoading={false}
                  onFileLoad={loadFile}
                  onAnalyze={() => {}}
                  onClear={handleClear}
                />
                <EpisodeHistory
                  episodes={episodes}
                  onSelect={handleViewEpisode}
                />
              </div>
            )}

            {/* ANALYZING */}
            {appState.status === 'analyzing' && (
              <LoadingState streamingText={appState.streamingText} />
            )}

            {/* DONE */}
            {appState.status === 'done' && (
              <div className="space-y-6 animate-fade-up">
                <ActionLabel icon={'\uf053'} onClick={handleNewEpisode}>назад</ActionLabel>
                {regenError && (
                  <p className="text-xs text-red-500 font-mono break-all">{regenError}</p>
                )}
                <ResultsPanel
                  result={appState.result}
                  regeneratingField={regeneratingField}
                  regenStreamText={regenStreamText}
                  onNavigate={navigateField}
                  onCommand={(field, cmd) => void regenerateField(field, cmd)}
                  onCustomCommand={(field, instruction) => void regenerateField(field, 'regenerate', instruction)}
                />
              </div>
            )}

            {/* ERROR */}
            {appState.status === 'error' && (
              <div className="space-y-4 animate-fade-up">
                <div className="rounded border border-red-100 bg-red-50 p-6 space-y-4">
                  <p className="text-xs text-red-400 font-medium">помилка</p>
                  <p className="text-sm text-red-600 font-mono leading-relaxed">
                    {appState.message}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="px-5 py-2 rounded text-sm font-medium bg-black text-[#E1FD02] hover:bg-[#111] transition-all duration-150"
                  >
                    спробувати ще раз
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Episode detail view (loaded from history, local nav state) ───────────────

function EpisodeView({
  episode,
  onBack,
  onDeleted,
}: {
  episode: SavedEpisode
  onBack: () => void
  onDeleted: () => void
}) {
  const [result, setResult] = useState<VersionedResult>(() =>
    toVersionedResult(episode.result)
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [regenField, setRegenField] = useState<RegeneratingField>(null)
  const [regenStreamText, setRegenStreamText] = useState<string>('')
  const [regenError, setRegenError] = useState<string | null>(null)

  const handleNavigate = (field: NonNullable<RegeneratingField>, dir: 'prev' | 'next') => {
    setResult((prev) => {
      switch (field) {
        case 'titles':    return { ...prev, titles: navigate(prev.titles, dir) }
        case 'showNotes': return { ...prev, showNotes: navigate(prev.showNotes, dir) }
        case 'chapters':  return { ...prev, chapters: navigate(prev.chapters, dir) }
        case 'clips':     return { ...prev, clips: navigate(prev.clips, dir) }
        case 'telegram':  return { ...prev, social: { ...prev.social, telegram: navigate(prev.social.telegram, dir) } }
        case 'linkedin':  return { ...prev, social: { ...prev.social, linkedin: navigate(prev.social.linkedin, dir) } }
        case 'instagram': return { ...prev, social: { ...prev.social, instagram: navigate(prev.social.instagram, dir) } }
        case 'tiktok':    return { ...prev, social: { ...prev.social, tiktok: navigate(prev.social.tiktok, dir) } }
      }
    })
  }

  const handleCommand = async (field: NonNullable<RegeneratingField>, cmd: QuickCommand) => {
    setRegenField(field)
    setRegenStreamText('')
    setRegenError(null)
    try {
      const raw = await runFieldRegen(field, result, cmd, episode.transcript, setRegenStreamText)
      setResult((prev) => applyFieldUpdate(prev, field, raw))
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegenField(null)
      setRegenStreamText('')
    }
  }

  const handleDelete = () => {
    deleteEpisode(episode.id)
    onDeleted()
    onBack()
  }

  return (
    <>
      <div className="space-y-6 animate-fade-up">
        <ActionLabel icon={'\uf053'} onClick={onBack}>назад</ActionLabel>

        {/* Episode title */}
        <h1 className="text-xl font-bold text-black leading-snug">{episode.title}</h1>

        {regenError && (
          <p className="text-xs text-red-500 font-mono break-all">{regenError}</p>
        )}

        <ResultsPanel
          result={result}
          regeneratingField={regenField}
          regenStreamText={regenStreamText}
          onNavigate={handleNavigate}
          onCommand={handleCommand}
          onCustomCommand={(field, instruction) => {
            const handler = async () => {
              setRegenField(field)
              setRegenStreamText('')
              setRegenError(null)
              try {
                const raw = await runFieldRegen(field, result, 'regenerate', episode.transcript, setRegenStreamText, instruction)
                setResult((prev) => applyFieldUpdate(prev, field, raw))
              } catch (err) {
                setRegenError(err instanceof Error ? err.message : String(err))
              } finally {
                setRegenField(null)
                setRegenStreamText('')
              }
            }
            void handler()
          }}
        />

        {/* Delete section */}
        <div className="pt-4 pb-2">
          <ActionLabel
            icon={'\uf1f8'}
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            видалити епізод
          </ActionLabel>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded bg-white card-shadow p-6 space-y-5 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-black">видалити епізод?</p>
              <p className="text-xs text-black/50 leading-relaxed line-clamp-2">{episode.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-150"
              >
                видалити
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded text-sm font-medium bg-black/06 text-black/70 hover:bg-black/10 hover:text-black transition-colors duration-150"
              >
                скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Episode history section ──────────────────────────────────────────────────

function EpisodeHistory({
  episodes,
  onSelect,
}: {
  episodes: SavedEpisode[]
  onSelect: (e: SavedEpisode) => void
}) {
  if (episodes.length === 0) return null

  return (
    <div className="space-y-3 animate-fade-up-delay-2">
      <h2 className="text-xs font-medium text-black uppercase tracking-wider">попередні епізоди</h2>
      <div className="space-y-2">
        {episodes.map((episode, i) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            index={i}
            onClick={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

