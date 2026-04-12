import { useState } from 'react'

// ─── Clean Architecture note ──────────────────────────────────────────────────
// This is a Use Case layer hook. It handles file-reading side-effects only.
// It does NOT import any components. It returns plain data + callbacks.

interface UseTranscriptReturn {
  transcript: string
  fileName: string
  error: string | null
  loadFile: (file: File) => Promise<void>
  setText: (text: string) => void
  clear: () => void
}

export function useTranscript(): UseTranscriptReturn {
  const [transcript, setTranscript] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadFile = async (file: File): Promise<void> => {
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'txt') {
      try {
        const text = await readAsText(file)
        setTranscript(text)
        setFileName(file.name)
      } catch {
        setError('Не вдалося прочитати .txt файл. Спробуй ще раз.')
      }
    } else if (ext === 'docx') {
      try {
        const mammoth = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        if (!result.value.trim()) {
          setError('Файл порожній або не містить тексту.')
          return
        }
        setTranscript(result.value)
        setFileName(file.name)
      } catch {
        setError('Не вдалося прочитати .docx файл. Спробуй ще раз.')
      }
    } else {
      setError('Підтримуються лише файли .txt та .docx.')
    }
  }

  const setText = (text: string) => {
    setError(null)
    setTranscript(text)
    setFileName('вставлений текст')
  }

  const clear = () => {
    setTranscript('')
    setFileName('')
    setError(null)
  }

  return { transcript, fileName, error, loadFile, setText, clear }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') resolve(text)
      else reject(new Error('Unexpected FileReader result type'))
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsText(file, 'UTF-8')
  })
}
