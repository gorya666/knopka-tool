import { useEffect, useState, useCallback } from 'react'
import './index.css'
import { useAnalyze } from './hooks/useAnalyze'
import { useTranscript } from './hooks/useTranscript'
import { TranscriptInput } from './components/TranscriptInput'
import { TranscriptViewer } from './components/TranscriptViewer'
import { LoadingState } from './components/LoadingState'
import { EpisodeCard } from './components/EpisodeCard'
import { loadEpisodes, saveEpisode, type SavedEpisode } from './lib/history'
import { toVersionedResult } from './types/podcast'

// ─── View mode (separate from AppState — lives only in App) ───────────────────
type ViewMode = { mode: 'home' } | { mode: 'episode'; episode: SavedEpisode }

export default function App() {
  const { appState, setAppState, analyze } = useAnalyze()
  const { transcript, fileName, error, loadFile, clear } = useTranscript()

  const [view, setView] = useState<ViewMode>({ mode: 'home' })
  const [episodes, setEpisodes] = useState<SavedEpisode[]>(() => loadEpisodes())

  const refreshEpisodes = useCallback(() => {
    setEpisodes(loadEpisodes())
  }, [])

  // ── Sync transcript → appState ────────────────────────────────────────────
  useEffect(() => {
    if (transcript.length > 0) {
      setAppState({ status: 'loaded', transcript, fileName })
    } else if (appState.status === 'loaded') {
      setAppState({ status: 'empty' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, fileName])

  // ── Auto-save when analysis completes ────────────────────────────────────
  useEffect(() => {
    if (appState.status === 'done') {
      // Convert versioned back to flat AnalysisResult for storage
      const r = appState.result
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
      saveEpisode(appState.fileName, flat, appState.transcript)
      refreshEpisodes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.status])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnalyze = () => {
    if (appState.status !== 'loaded') return
    void analyze(appState.transcript)
  }

  const handleClear = () => {
    clear()
    setAppState({ status: 'empty' })
    setView({ mode: 'home' })
  }

  const handleRetry = () => {
    setAppState({ status: 'empty' })
    clear()
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
        <div className="max-w-[680px] mx-auto px-6 py-3 flex items-center gap-3">
          <button onClick={handleBackHome} className="focus:outline-none">
            <img
              src="/logo.png"
              alt="Radio Knopka"
              className={[
                'h-9 w-auto transition-opacity duration-150',
                appState.status === 'analyzing' ? 'animate-pulse' : 'hover:opacity-80',
              ].join(' ')}
            />
          </button>

          {/* Back breadcrumb when viewing an episode */}
          {view.mode === 'episode' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-black/20 text-sm">/</span>
              <span className="text-sm text-black/50 truncate max-w-[300px]">
                {view.episode.title}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-[680px] mx-auto px-6 py-10 space-y-10">

        {/* ── EPISODE VIEW (history) ──────────────────────────────────────── */}
        {view.mode === 'episode' && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-1">
              <p className="text-xs text-black/30 font-medium">епізод</p>
              <h1 className="text-xl font-bold text-black leading-snug">
                {view.episode.title}
              </h1>
              <p className="text-xs text-black/35">{view.episode.fileName}</p>
            </div>

            {/* Placeholder — ResultsPanel comes in Session 4 */}
            <div className="rounded-2xl border border-black/07 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-black/40">
                результати відображатимуться тут — session 4
              </p>
            </div>

            <button
              onClick={handleBackHome}
              className="text-sm text-black/40 hover:text-black/70 transition-colors duration-150"
            >
              ← назад
            </button>
          </div>
        )}

        {/* ── HOME VIEW ──────────────────────────────────────────────────── */}
        {view.mode === 'home' && (
          <>
            {/* EMPTY */}
            {appState.status === 'empty' && (
              <div className="space-y-10">
                <TranscriptInput
                  transcript={transcript}
                  fileName={fileName}
                  error={error}
                  isLoading={false}
                  onFileLoad={loadFile}
                  onAnalyze={handleAnalyze}
                  onClear={handleClear}
                />
                <EpisodeHistory
                  episodes={episodes}
                  onSelect={handleViewEpisode}
                  onDeleted={refreshEpisodes}
                />
              </div>
            )}

            {/* LOADED */}
            {appState.status === 'loaded' && (
              <div className="space-y-4">
                <TranscriptViewer
                  transcript={appState.transcript}
                  fileName={appState.fileName}
                />
                <TranscriptInput
                  transcript={transcript}
                  fileName={fileName}
                  error={error}
                  isLoading={false}
                  onFileLoad={loadFile}
                  onAnalyze={handleAnalyze}
                  onClear={handleClear}
                />
              </div>
            )}

            {/* ANALYZING */}
            {appState.status === 'analyzing' && (
              <LoadingState />
            )}

            {/* DONE */}
            {appState.status === 'done' && (
              <div className="space-y-6 animate-fade-up">
                <div className="rounded-2xl border border-black/07 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] space-y-4">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#E1FD02]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-black/50">аналіз завершено — ui результатів у сесії 4</p>
                  <button
                    onClick={handleClear}
                    className="px-5 py-2 rounded-xl text-sm font-medium bg-black text-[#E1FD02] hover:bg-[#111] transition-all duration-150"
                  >
                    новий епізод
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {appState.status === 'error' && (
              <div className="space-y-4 animate-fade-up">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 space-y-4">
                  <p className="text-xs text-red-400 font-medium">помилка</p>
                  <p className="text-sm text-red-600 font-mono leading-relaxed">
                    {appState.message}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="px-5 py-2 rounded-xl text-sm font-medium bg-black text-[#E1FD02] hover:bg-[#111] transition-all duration-150"
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

// ─── Previous episodes section ────────────────────────────────────────────────

function EpisodeHistory({
  episodes,
  onSelect,
  onDeleted,
}: {
  episodes: SavedEpisode[]
  onSelect: (e: SavedEpisode) => void
  onDeleted: () => void
}) {
  if (episodes.length === 0) return null

  return (
    <div className="space-y-3 animate-fade-up-delay-2">
      <p className="text-xs text-black/30 font-medium">
        попередні епізоди
      </p>
      <div className="space-y-2">
        {episodes.map((episode, i) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            index={i}
            onClick={onSelect}
            onDeleted={onDeleted}
          />
        ))}
      </div>
    </div>
  )
}
