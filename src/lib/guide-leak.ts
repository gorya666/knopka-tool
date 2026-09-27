// Catches the model copying from the voice guide's worked examples instead of
// writing about the episode in front of it.
//
// The guide is full of finished posts from OTHER episodes — impostor syndrome,
// Дизаріум, the chairs that went to Умань. Telling the model not to reuse them
// helps but does not hold, so this checks mechanically: take the distinctive
// words that live inside the guide's examples, drop every one that also occurs
// in this transcript, and whatever is left must not appear in a generated text.

import VOICE_GUIDE from './voice-guide.md?raw'

// Crude stemming: Ukrainian inflects heavily, and a prefix is enough to match
// «самозванця» against «самозванець» without a morphology library.
const STEM_LENGTH = 6
const MIN_WORD = 6

function stems(text: string): Set<string> {
  const out = new Set<string>()
  for (const word of text.toLowerCase().match(/\p{L}{4,}/gu) ?? []) {
    if (word.length >= MIN_WORD) out.add(word.slice(0, STEM_LENGTH))
  }
  return out
}

// Only the fenced blocks — those are the verbatim example posts. The prose
// around them is instruction, and its vocabulary is fair game.
function exampleText(): string {
  return (VOICE_GUIDE.match(/```[\s\S]*?```/g) ?? []).join('\n')
}

const GUIDE_STEMS = stems(exampleText())

export interface LeakDetector {
  (text: string): string[]
}

// Build a detector for one episode. Anything in the guide's examples that the
// episode never mentions is off limits.
// Our own fixed footers and sign-offs also come from the guide and are also
// absent from the transcript, so lines carrying a link are skipped.
const isBoilerplate = (line: string) =>
  /https?:\/\/|\[посилання(?:@[^\]]+)?\]/iu.test(line)

function checkable(text: string): string {
  return text.split('\n').filter((l) => !isBoilerplate(l)).join('\n')
}

export function buildLeakDetector(transcript: string): LeakDetector {
  const fromEpisode = stems(transcript)
  const offLimits = [...GUIDE_STEMS].filter((s) => !fromEpisode.has(s))

  return (text: string) => {
    const used = stems(checkable(text))
    return offLimits.filter((s) => used.has(s))
  }
}

// Phrased for buildFixPrompt, which takes a list of problems to remove.
export function describeLeaks(leaks: string[]): string {
  return (
    'НАЙВАЖЛИВІШЕ: у тексті є слова з чужих епізодів, яких у цьому транскрипті немає — ' +
    leaks.map((s) => `«${s}…»`).join(', ') +
    '. Ти списав з прикладу в інструкції. Прибери це повністю і напиши про те, ' +
    'що реально прозвучало в цьому епізоді.'
  )
}
