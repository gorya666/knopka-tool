/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Markdown imported as a raw string — used for the voice guide, which is kept
// as plain .md so it stays byte-identical to the shared SKILL.md.
declare module '*.md?raw' {
  const content: string
  export default content
}
