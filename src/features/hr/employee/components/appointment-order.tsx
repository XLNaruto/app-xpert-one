import { A4_HEIGHT_PX, A4_WIDTH_PX } from '@/lib/pdf/export-pdf'
import type { AppointmentVariant } from '../constants'
import { useLetterPagination } from '../hooks/use-letter-pagination'
import {
  BLANK,
  fillTemplate,
  toGujaratiDigits,
  type AppointmentLetterFields,
  type LetterLang,
} from '../lib/appointment-letter-fields'
import {
  APPOINTMENT_CLAUSES_EN,
  APPOINTMENT_CLAUSES_GU,
  APPOINTMENT_CLAUSES_HI,
  APPOINTMENT_UI,
} from '../lib/appointment-letter-text'
import { fontFor, INK, leadingFor, PAGE_LABEL_COLOR } from '../lib/letter-typography'
import { Clause, LetterPage, MeasuringSheet } from './letter-sheet'

const CLAUSES: Record<LetterLang, string[]> = {
  en: APPOINTMENT_CLAUSES_EN,
  hi: APPOINTMENT_CLAUSES_HI,
  gu: APPOINTMENT_CLAUSES_GU,
}

const PADDING_X = 56
const PADDING_Y = 44
const CONTENT_WIDTH = A4_WIDTH_PX - PADDING_X * 2
/** Room the "Page n of m" line takes at the foot of every sheet. */
const PAGE_LABEL_HEIGHT = 26
/**
 * A few px of slack under the last line, so sub-pixel rounding between the
 * measuring pass and the real sheet can never push a line onto the page label.
 */
const PAGE_SAFETY = 8
const PAGE_CONTENT_HEIGHT =
  A4_HEIGHT_PX - PADDING_Y * 2 - PAGE_LABEL_HEIGHT - PAGE_SAFETY
const PAGE_PADDING = `${PADDING_Y}px ${PADDING_X}px`
const MEASURE_BOX = { display: 'flow-root' } as const

/** The order is a two-sheet letter; the body shrinks (within reason) to stay one. */
const MAX_PAGES = 2
/** Body sizes to try, largest first. Below the last, extra length takes a third sheet. */
const FONT_SIZES: Record<LetterLang, number[]> = {
  en: [12.4, 12, 11.6],
  hi: [12, 11.6, 11.2, 10.8],
  gu: [12, 11.6, 11.2, 10.8, 10.4],
}

/**
 * Appointment order / नियुक्ति आदेश / નિમણૂક આદેશ — the A4 sheets themselves.
 *
 * Pure props in, sheets out: the preview renders it, and the exporter renders
 * a detached copy of the same element for the PDF and the printer.
 */
export function AppointmentOrder({
  fields,
  lang,
  variant = 'appointment',
}: {
  fields: AppointmentLetterFields
  lang: LetterLang
  variant?: AppointmentVariant
}) {
  const ui = APPOINTMENT_UI[lang]
  const isRenewal = variant === 'renewal'

  // On a renewal the contract dates aren't known when the sheet is printed, so
  // they're blanked — `fillTemplate()` and the header both turn an empty value
  // into a ruled blank the employee's copy can be written on.
  const letterFields: AppointmentLetterFields = isRenewal
    ? { ...fields, letterDate: '', joiningDate: '' }
    : fields
  const title = isRenewal ? ui.renewalTitle : ui.title
  const subject = isRenewal ? ui.renewalSubject : ui.subject

  // Gujarati letters are conventionally set with Gujarati numerals.
  const localise = (s: string) => (lang === 'gu' ? toGujaratiDigits(s) : s)
  const clauses = CLAUSES[lang].map((c) => localise(fillTemplate(c, letterFields)))
  // Re-measures whenever the clause text changes (it fills in as the employee
  // record loads) and on anything else that moves a line break. The body size
  // steps down from the first candidate until the order fits two sheets.
  const { measureRef, pages, footerOnOwnPage, fontSize } = useLetterPagination(
    clauses,
    { pageHeight: PAGE_CONTENT_HEIGHT, fontSizes: FONT_SIZES[lang], maxPages: MAX_PAGES },
    [lang, variant],
  )

  const header = (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div style={{ fontWeight: 700 }}>{ui.to}</div>
        <div style={{ whiteSpace: 'nowrap' }}>
          {ui.dateLabel} {localise(letterFields.letterDate || BLANK)}
        </div>
      </div>

      <div style={{ marginTop: 2, paddingLeft: 10 }}>
        <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
          {fields.fullName || BLANK}
        </div>
        <div>{fields.address || BLANK}</div>
        <div>
          {ui.cityLabel} {fields.city || BLANK}
          {fields.pinCode ? ` – ${localise(fields.pinCode)}` : ''}
        </div>
        <div>
          {ui.cellLabel} {localise(fields.mobile || BLANK)}
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontWeight: 700,
          textDecoration: 'underline',
          fontSize: '1.35em',
          letterSpacing: '0.06em',
          margin: '10px 0 8px',
        }}
      >
        {title}
      </div>

      <div style={{ textAlign: 'justify' }}>
        <span style={{ fontWeight: 700 }}>{ui.subjectLabel} </span>
        <span>{localise(fillTemplate(subject, letterFields))}</span>
      </div>
    </div>
  )

  const signatureRule = { borderBottom: `1px solid ${INK}`, width: 190, height: 26 }

  const footer = (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 18 }}>{ui.agree}</div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <div>
          <div style={signatureRule} />
          <div style={{ fontWeight: 700, marginTop: 3 }}>{ui.employeeSignature}</div>
          <div>{fields.fullName || BLANK}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...signatureRule, marginLeft: 'auto' }} />
          {ui.managerLines.map((line, i) => (
            <div
              key={i}
              style={{ fontWeight: i === 0 ? 700 : 500, marginTop: i === 0 ? 3 : 0 }}
            >
              {fillTemplate(line, letterFields)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{ui.venueLabel}</span>
        <span style={{ borderBottom: `1px dotted ${INK}`, flex: 1 }}>
          {fields.workplace}
        </span>
      </div>
    </div>
  )

  const pageLabel = (n: number, total: number) => (
    <div
      style={{
        textAlign: 'center',
        fontSize: '0.8em',
        color: PAGE_LABEL_COLOR,
        paddingTop: 6,
      }}
    >
      {ui.pageLabel(n, total)}
    </div>
  )

  // Until the first measurement lands nothing is paged — a "measuring" sheet
  // stands in rather than a wall of text clipped by the sheet's overflow.
  const pageGroups = pages ?? []
  // A very long final clause can leave no room for the signature block, which
  // then gets a sheet of its own rather than clipping off the page.
  const totalPages = pageGroups.length + (footerOnOwnPage ? 1 : 0)

  return (
    <>
      {/* Off-screen measuring pass — same width, font and markup as the real
          sheets, header and footer included, so their real heights (which grow
          with a long address) are accounted for. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -99999,
          top: 0,
          width: CONTENT_WIDTH,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={measureRef}
          style={{ fontFamily: fontFor(lang), fontSize, lineHeight: leadingFor(lang) }}
        >
          {/* `flow-root` keeps each block's own margins inside its wrapper —
              `getBoundingClientRect()` excludes margins, and a clause's
              bottom margin left out of every measurement adds up to a page
              that overflows into its footer line. */}
          <div data-measure="header" style={MEASURE_BOX}>
            {header}
          </div>
          {clauses.map((text, i) => (
            <div data-measure="clause" key={i} style={MEASURE_BOX}>
              <Clause index={i + 1}>{text}</Clause>
            </div>
          ))}
          <div data-measure="footer" style={MEASURE_BOX}>
            {footer}
          </div>
        </div>
      </div>

      {pageGroups.length === 0 && <MeasuringSheet />}

      {pageGroups.map((group, pageIndex) => (
        <LetterPage key={pageIndex} lang={lang} fontSize={fontSize} padding={PAGE_PADDING}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {pageIndex === 0 && header}
            <div style={{ flex: 1 }}>
              {group.map((segment) => (
                <Clause
                  key={`${segment.index}-${segment.continued}`}
                  index={segment.continued ? undefined : segment.index + 1}
                  broken={segment.broken}
                >
                  {segment.text}
                </Clause>
              ))}
              {!footerOnOwnPage && pageIndex === pageGroups.length - 1 && footer}
            </div>
            {pageLabel(pageIndex + 1, totalPages)}
          </div>
        </LetterPage>
      ))}

      {footerOnOwnPage && (
        <LetterPage lang={lang} fontSize={fontSize} padding={PAGE_PADDING}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>{footer}</div>
            {pageLabel(totalPages, totalPages)}
          </div>
        </LetterPage>
      )}
    </>
  )
}
