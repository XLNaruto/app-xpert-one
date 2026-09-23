import type { LetterLang } from './appointment-letter-fields'

/**
 * Type and ink for generated letters.
 *
 * Colours are plain hex and sizes plain px, not Tailwind tokens: a letter is
 * paper, and it has to look the same on screen, in the PDF and from the printer
 * whatever theme the app is in. The Noto faces are bundled by `letter-sheet`.
 */

export const INK = '#111111'
export const PAGE_LABEL_COLOR = '#71717a'

/** Script-appropriate font stack. */
export const fontFor = (lang: LetterLang): string => {
  switch (lang) {
    case 'gu':
      return "'Noto Sans Gujarati', 'Nirmala UI', 'Shruti', sans-serif"
    case 'hi':
      return "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif"
    default:
      return "'Times New Roman', Times, Georgia, serif"
  }
}

/** Indic scripts need a little more leading than Latin at the same size. */
export const leadingFor = (lang: LetterLang) => (lang === 'en' ? 1.45 : 1.65)
