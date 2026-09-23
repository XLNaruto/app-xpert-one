import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * One piece of a clause on one sheet. A clause that fits is a single segment;
 * one that runs past the foot of a sheet is split at a word boundary into a
 * `broken` head (the rest follows overleaf) and a `continued` tail.
 */
export interface LetterSegment {
  index: number
  text: string
  /** The tail of a clause begun on the previous sheet — printed without its number. */
  continued: boolean
  /** The head of a clause that carries on overleaf — its last line is justified too. */
  broken: boolean
}

/**
 * Don't leave a sliver of a clause on either side of a break: a split keeps at
 * least this many lines at the foot of one sheet and at the head of the next.
 * A clause that can't honour both moves over whole.
 */
const MIN_SPLIT_LINES = 2

interface PaginateOptions {
  /** Usable content height of one sheet, in layout pixels. */
  pageHeight: number
  /**
   * Candidate body sizes, largest first. The first that fits `maxPages` wins;
   * if none does, the smallest is used — a legible letter on one more sheet
   * beats an unreadable one.
   */
  fontSizes: number[]
  maxPages: number
}

/**
 * Measure-then-distribute pagination for a clause list.
 *
 * A clause's rendered height depends on the script (Gujarati and Devanagari
 * wrap far earlier than Latin at the same point size) and on the employee's own
 * data (a long address adds a line to the header). So rather than hard-coding a
 * page break after clause 16, the caller renders the header, every clause and
 * the footer once into an off-screen box of the exact content width, and this
 * fills pages by pixel budget:
 *
 *   <div ref={measureRef}>
 *     <div data-measure="header">…</div>
 *     <div data-measure="clause">…<span data-measure-text>…</span></div>  // one per clause
 *     <div data-measure="footer">…</div>
 *   </div>
 *
 * Two refinements on top of that:
 *  - **Fit to length.** The letter is laid out at each candidate size until it
 *    fits `maxPages`, so the long Gujarati set stays a two-sheet letter instead
 *    of spilling the signature block onto a third. Everything in the measuring
 *    box sizes in `em` off its font size, so setting that one value rescales it.
 *  - **Split clauses.** A clause too long for the space left is broken across
 *    the sheet — at a natural line end, found by binary search over words on a
 *    probe copy of the clause's own markup — rather than moved whole, which
 *    would leave most of a sheet's foot empty.
 */
export function useLetterPagination(
  texts: string[],
  { pageHeight, fontSizes, maxPages }: PaginateOptions,
  deps: unknown[] = [],
) {
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState<{
    /** Segments grouped per sheet. */
    pages: LetterSegment[][]
    /** The closing block didn't fit beside the last clause — it gets its own sheet. */
    footerOnOwnPage: boolean
    fontSize: number
  } | null>(null)
  const [fontsReady, setFontsReady] = useState(false)

  // Indic webfonts change wrap points, so measuring before they land produces
  // page breaks that are visibly wrong once the real face swaps in.
  useEffect(() => {
    let alive = true
    void document.fonts.ready.then(() => {
      if (alive) setFontsReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const textKey = texts.join('\u0000')
  const sizesKey = fontSizes.join(',')

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el || !fontsReady || fontSizes.length === 0) return

    const clauseNodes = Array.from(el.querySelectorAll('[data-measure="clause"]'))
    if (clauseNodes.length !== texts.length) return

    /*
     * The preview sits inside a `zoom`-ed wrapper, and `getBoundingClientRect()`
     * reports zoomed pixels while `pageHeight` is in layout pixels. Comparing the
     * box against its own unscaled `offsetWidth` recovers the scale, so the same
     * breaks come out at 50% preview and in the full-size export copy.
     */
    const scale =
      el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 1
    const divisor = scale > 0 ? scale : 1
    const heightOf = (node: Element | null) =>
      node ? node.getBoundingClientRect().height / divisor : 0

    // A probe copy of a clause row, for measuring partial text in the same markup.
    const probe = clauseNodes[0].cloneNode(true) as HTMLElement
    el.appendChild(probe)
    const probeText = probe.querySelector<HTMLElement>('[data-measure-text]')
    const measureText = (text: string) => {
      if (probeText) probeText.textContent = text
      return heightOf(probe)
    }

    const paginate = () => {
      const headerHeight = heightOf(el.querySelector('[data-measure="header"]'))
      const footerHeight = heightOf(el.querySelector('[data-measure="footer"]'))
      const fullHeights = clauseNodes.map(heightOf)

      // A clause row is `lines × lineHeight` plus its own bottom margin.
      const lineHeight = probeText ? parseFloat(getComputedStyle(probeText).lineHeight) : 0
      const rowExtra = measureText('x') - lineHeight
      const linesOf = (height: number) =>
        lineHeight > 0 ? Math.round((height - rowExtra) / lineHeight) : 1

      /**
       * How many words of `words` fill exactly `lines` lines. The longest
       * prefix that fits in that height always ends at a natural wrap, so the
       * head's last line is a full one.
       */
      const wordsForLines = (words: string[], lines: number) => {
        const limit = lines * lineHeight + rowExtra + 0.5
        let lo = 0
        let hi = words.length - 1
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2)
          if (measureText(words.slice(0, mid).join(' ')) <= limit) lo = mid
          else hi = mid - 1
        }
        return lo
      }

      const result: LetterSegment[][] = []
      let current: LetterSegment[] = []
      let used = 0
      // Sheet 1 also carries the header block.
      let budget = pageHeight - headerHeight
      const newPage = () => {
        result.push(current)
        current = []
        used = 0
        budget = pageHeight
      }

      texts.forEach((fullText, index) => {
        const isLast = index === texts.length - 1
        let text = fullText
        let continued = false
        let height = fullHeights[index]

        for (;;) {
          // The closing block rides along with the final clause.
          const needed = isLast ? height + footerHeight : height
          if (used + needed <= budget) {
            current.push({ index, text, continued, broken: false })
            used += height
            return
          }

          // As many whole lines as the space allows, leaving the tail its minimum.
          const roomLines =
            lineHeight > 0 ? Math.floor((budget - used - rowExtra) / lineHeight) : 0
          const headLines = Math.min(roomLines, linesOf(height) - MIN_SPLIT_LINES)

          if (headLines >= MIN_SPLIT_LINES) {
            const words = text.split(' ')
            const fit = wordsForLines(words, headLines)
            if (fit > 0) {
              // Split: the head fills this sheet, the tail starts the next.
              current.push({ index, text: words.slice(0, fit).join(' '), continued, broken: true })
              newPage()
              text = words.slice(fit).join(' ')
              continued = true
              height = measureText(text)
              continue
            }
          }

          if (current.length > 0) {
            // Nothing worth splitting off — move the clause over whole.
            newPage()
            continue
          }

          // A clause taller than an empty sheet can't be helped; place it anyway.
          current.push({ index, text, continued, broken: false })
          used += height
          return
        }
      })
      if (current.length) result.push(current)

      // An oversized clause is still placed, so re-check whether the footer
      // actually fitted on the final sheet (`used` / `budget` are that sheet's).
      const footerOnOwnPage = used + footerHeight > budget
      return { pages: result, footerOnOwnPage }
    }

    let chosen = null as ReturnType<typeof paginate> | null
    let chosenSize = fontSizes[0]
    for (const size of fontSizes) {
      el.style.fontSize = `${size}px`
      chosen = paginate()
      chosenSize = size
      if (chosen.pages.length + (chosen.footerOnOwnPage ? 1 : 0) <= maxPages) break
    }
    probe.remove()

    if (chosen) setLayout({ ...chosen, fontSize: chosenSize })
    // `deps` is the caller's re-measure trigger, spread in on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey, sizesKey, pageHeight, maxPages, fontsReady, ...deps])

  return {
    measureRef,
    /** `null` until the first measurement lands. */
    pages: layout?.pages ?? null,
    footerOnOwnPage: layout?.footerOnOwnPage ?? false,
    /** The body size the sheets must be set in — the one the layout was measured at. */
    fontSize: layout?.fontSize ?? fontSizes[0],
  }
}
