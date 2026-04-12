import { useState } from 'react'
import './index.css'
import type { AppState } from './types/podcast'

export default function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'empty' })

  // Temporary click handlers just to test state transitions
  const handleLoadTranscript = () => {
    setAppState({
      status: 'loaded',
      transcript: 'Тестовий транскрипт...',
      fileName: 'episode.txt',
    })
  }

  const handleAnalyze = () => {
    if (appState.status !== 'loaded') return
    setAppState({ status: 'analyzing', transcript: appState.transcript, fileName: appState.fileName })
    // Simulate API call finishing
    setTimeout(() => {
      setAppState({ status: 'error', message: 'API ще не підключено — це буде в сесії 2' })
    }, 1500)
  }

  const handleReset = () => setAppState({ status: 'empty' })

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] flex flex-col items-center justify-center gap-6 p-8 font-mono">
      <h1 className="text-2xl font-bold tracking-tight">🎙 Knopka Tool</h1>

      {/* State badge */}
      <div className="px-4 py-2 rounded-full border border-white/20 text-sm uppercase tracking-widest text-white/60">
        {appState.status}
      </div>

      {/* State-specific content */}
      {appState.status === 'empty' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/40 text-sm">Завантажте транскрипт, щоб почати</p>
          <button
            onClick={handleLoadTranscript}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            Симулювати завантаження файлу
          </button>
        </div>
      )}

      {appState.status === 'loaded' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60 text-sm">Файл: <span className="text-white">{appState.fileName}</span></p>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
              Аналізувати епізод
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 transition-colors text-sm text-white/40"
            >
              Очистити
            </button>
          </div>
        </div>
      )}

      {appState.status === 'analyzing' && (
        <p className="text-white/40 text-sm animate-pulse">Аналізую транскрипт…</p>
      )}

      {appState.status === 'done' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-green-400 text-sm">✓ Готово!</p>
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            Новий епізод
          </button>
        </div>
      )}

      {appState.status === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400 text-sm">{appState.message}</p>
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 transition-colors text-sm text-white/40"
          >
            Назад
          </button>
        </div>
      )}
    </div>
  )
}
