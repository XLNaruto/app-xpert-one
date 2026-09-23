import type { ReactNode } from 'react'
import '@fontsource/noto-sans-gujarati/400.css'
import '@fontsource/noto-sans-gujarati/700.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/700.css'
import { A4_HEIGHT_PX, A4_WIDTH_PX, PDF_SECTION_CLASS } from '@/lib/pdf/export-pdf'
import type { LetterLang } from '../lib/appointment-letter-fields'
import { fontFor, INK, leadingFor } from '../lib/letter-typography'

/** Print primitives for generated letters — see `lib/letter-typography` for why plain hex/px. */

/**
 * One exact A4 sheet. The exporter looks for `.pdf-section`, so every page of
 * every letter goes through here.
 */
export function LetterPage({
  children,
  padding,
  lang,
  fontSize,
}: {
  children: ReactNode
  padding: string
  lang: LetterLang
  fontSize: number
}) {
  return (
    <div
      className={PDF_SECTION_CLASS}
      style={{
        position: 'relative',
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        overflow: 'hidden',
        padding,
        boxSizing: 'border-box',
        background: '#ffffff',
        color: INK,
        fontFamily: fontFor(lang),
        fontSize,
        lineHeight: leadingFor(lang),
        margin: '0 auto',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Placeholder sheet while the letter measures itself. Deliberately *not* a
 * `.pdf-section` — the exporter waits for real sheets, so this never reaches a PDF.
 */
export function MeasuringSheet() {
  return (
    <div
      style={{
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        margin: '0 auto',
        background: '#ffffff',
        display: 'grid',
        placeItems: 'center',
        color: '#a1a1aa',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      Laying out pages…
    </div>
  )
}

/**
 * A numbered, justified clause row.
 *
 * `index` is omitted on the tail of a clause carried over from the previous
 * sheet, which keeps its indent but not its number. `broken` marks the head of
 * a clause that continues overleaf: its last line is mid-sentence, so it's
 * justified like every other line rather than left ragged.
 */
export function Clause({
  index,
  broken = false,
  children,
}: {
  index?: number
  broken?: boolean
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 3, textAlign: 'justify' }}>
      <span style={{ flexShrink: 0, width: 20, textAlign: 'right' }}>
        {index !== undefined && `${index}.`}
      </span>
      <span data-measure-text style={{ flex: 1, textAlignLast: broken ? 'justify' : undefined }}>
        {children}
      </span>
    </div>
  )
}
