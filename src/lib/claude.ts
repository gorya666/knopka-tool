// ─── Shared Claude API client ─────────────────────────────────────────────────
// Interface Adapter layer — translates between fetch and our domain.
// The single client for the whole app; everything that talks to Claude goes
// through here so prompt caching behaves consistently.
//
// Caching is prefix-based: a block is a cache hit only when everything before
// it is byte-identical. That is why every call shares one system prompt and
// puts the transcript in the first user block — see prompt.ts.

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-5'

export interface TextBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

export interface Usage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

// Mark a block as a cache breakpoint: this block and everything before it is
// cached. The 5-minute TTL refreshes on every hit, so an active session stays
// warm without asking for the extended TTL.
export function cached(text: string): TextBlock {
  return { type: 'text', text, cache_control: { type: 'ephemeral' } }
}

export function plain(text: string): TextBlock {
  return { type: 'text', text }
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
}

function buildBody(
  content: TextBlock[],
  system: TextBlock[] | undefined,
  maxTokens: number,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
  }
  if (system) body.system = system
  if (stream) body.stream = true
  return body
}

function reportUsage(label: string, usage: Usage | undefined): void {
  if (!import.meta.env.DEV || !usage) return
  // Cache hits are invisible in the UI, so surface them while developing.
  console.debug(
    `[claude] ${label}`,
    `in=${usage.input_tokens ?? 0}`,
    `cache_write=${usage.cache_creation_input_tokens ?? 0}`,
    `cache_read=${usage.cache_read_input_tokens ?? 0}`,
    `out=${usage.output_tokens ?? 0}`,
  )
}

export async function callClaudeStreaming(
  content: TextBlock[],
  system: TextBlock[] | undefined,
  maxTokens: number,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(buildBody(content, system, maxTokens, true)),
  })
  if (!res.ok) throw new Error(`API помилка ${res.status}: ${await res.text()}`)
  if (!res.body) throw new Error('Порожній потік від API')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''
  const usage: Usage = {}

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
        const ev = JSON.parse(jsonStr) as {
          type: string
          delta?: { type: string; text: string }
          message?: { usage?: Usage }
          usage?: Usage
        }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          accumulated += ev.delta.text
          onChunk(accumulated)
        } else if (ev.type === 'message_start' && ev.message?.usage) {
          Object.assign(usage, ev.message.usage)
        } else if (ev.type === 'message_delta' && ev.usage) {
          Object.assign(usage, ev.usage)
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }

  reportUsage('stream', usage)
  if (!accumulated) throw new Error('Порожня відповідь від API')
  return accumulated
}

export async function callClaude(
  content: TextBlock[],
  system: TextBlock[] | undefined,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(buildBody(content, system, maxTokens, false)),
  })

  if (!res.ok) throw new Error(`API помилка ${res.status}: ${await res.text()}`)

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>
    usage?: Usage
  }
  reportUsage('call', data.usage)

  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('Порожня відповідь від API')
  return textBlock.text
}

// Pull the JSON payload out of a reply that may be wrapped in markdown fences
// or padded with prose. Trimming only the head leaves a trailing ``` behind,
// which fails JSON.parse — so cut to the last closing bracket too.
export function extractJSON(raw: string): string {
  const start = raw.search(/[{[]/)
  if (start === -1) return raw.trim()
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'))
  return end > start ? raw.slice(start, end + 1) : raw.slice(start)
}
