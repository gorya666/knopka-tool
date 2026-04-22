// Shared Claude API caller — used by useAnalyze and standalone regen calls.

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-20250514'

const HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY as string,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}

export async function callClaudeStreaming(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const body: Record<string, unknown> = { model: MODEL, max_tokens: maxTokens, messages, stream: true }
  if (systemPrompt) body.system = systemPrompt

  const res = await fetch(API_URL, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`API помилка ${res.status}: ${await res.text()}`)
  if (!res.body) throw new Error('Порожній потік від API')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (jsonStr === '[DONE]') continue
      try {
        const ev = JSON.parse(jsonStr) as { type: string; delta?: { type: string; text: string } }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text
          onChunk(accumulated)
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }
  if (!accumulated) throw new Error('Порожня відповідь від API')
  return accumulated
}

export async function callClaude(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = { model: MODEL, max_tokens: maxTokens, messages }
  if (systemPrompt) body.system = systemPrompt

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API помилка ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('Порожня відповідь від API')
  return textBlock.text
}

export function extractJSON(raw: string): string {
  const start = raw.search(/[{[]/)
  return start === -1 ? raw.trim() : raw.slice(start)
}
