/**
 * Minimal type stub for the `turndown` package. The runtime is plain
 * JavaScript and ships no `.d.ts`, and `npm install @types/turndown`
 * is unmaintained (DefinitelyTyped entry is years old and breaks on
 * modern TS). The real library has a richer surface (custom rules,
 * keep/remove filters) — we only use the `turndown()` instance
 * method, so a narrow declaration keeps the editor happy without
 * papering over type drift in the future.
 */
declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx'
    hr?: string
    bulletListMarker?: '-' | '+' | '*'
    codeBlockStyle?: 'indented' | 'fenced'
    fence?: '```' | '~~~'
    emDelimiter?: '_' | '*'
    strongDelimiter?: '__' | '**'
    linkStyle?: 'inlined' | 'referenced'
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut'
  }

  class TurndownService {
    constructor(options?: TurndownOptions)
    turndown(html: string): string
  }

  export default TurndownService
}
