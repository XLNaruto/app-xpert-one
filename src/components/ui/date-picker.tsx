import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactDatePicker from 'react-date-picker'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The wire format for every date the app stores and validates. */
const ISO_DATE = 'yyyy-MM-dd'

/** Rough calendar height used to decide whether to open upward. */
const PANEL_MAX = 340
const GAP = 4
const VIEWPORT_PADDING = 8

/*
 * The panel's own width — `.react-calendar` is `18rem` in `globals.css`.
 *
 * The horizontal clamp below has to be measured against THIS, not against the
 * field: a field narrower than the panel (a `w-44` filter control, say) sitting
 * at the right edge of the page would otherwise be told it had room, and the
 * panel would hang off the viewport and be clipped.
 */
const PANEL_WIDTH = 288

interface DatePickerProps {
  /** Selected date as `yyyy-MM-dd`, or `''` when nothing is picked. */
  value: string
  /** Called with the new `yyyy-MM-dd` value, or `''` when cleared. */
  onChange: (value: string) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  /** Width utility for the control (defaults to full width). */
  className?: string
}

interface PanelCoords {
  left: number
  top: number
  /** When true the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

/**
 * Date field built on `react-date-picker`: a typeable dd/mm/yyyy input with a
 * calendar popup, themed by the `.sa-datepicker` rules in `globals.css`. Values
 * cross the boundary as `yyyy-MM-dd` strings so forms, Zod schemas and the API
 * layer never deal with `Date` objects.
 *
 * The calendar is portalled into a fixed-position host on `document.body` — the
 * library's own `portalContainer` renders the panel unpositioned, and its
 * non-portalled fallback is absolute, so either way a scrolling or
 * `overflow-hidden` ancestor could clip it. Positioning it here (flipping
 * upward when there's no room below, clamped to the viewport) keeps the panel
 * visible wherever the field sits.
 */
export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
}: DatePickerProps) {
  const parsed = value ? parseISO(value) : null
  const selected = parsed && isValid(parsed) ? parsed : null

  const wrapRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)

  // Anchor the panel to the input in viewport coordinates, and keep it there
  // while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      // Wide enough for the panel, whatever the field measures.
      const panelWidth = Math.max(rect.width, PANEL_WIDTH)
      const maxLeft = window.innerWidth - panelWidth - VIEWPORT_PADDING
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, rect.left),
        Math.max(VIEWPORT_PADDING, maxLeft),
      )
      setCoords({ left, top: dropUp ? rect.top - GAP : rect.bottom + GAP, dropUp })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  // The panel lives outside the field, so nothing closes it when the field
  // itself unmounts (e.g. switching tabs) — reset on teardown.
  useEffect(() => () => setOpen(false), [])

  /*
   * `react-date-picker` clamps a value outside [minDate, maxDate] for DISPLAY
   * only — it never reports the clamp through onChange. A form seeded with an
   * out-of-range date would then show one day and submit another, silently.
   * Push the clamped day back up so the field and the form always agree.
   */
  const minTime = minDate?.getTime()
  const maxTime = maxDate?.getTime()

  useEffect(() => {
    if (!selected) return
    const time = selected.getTime()
    const clamped =
      minTime !== undefined && time < minTime
        ? minDate
        : maxTime !== undefined && time > maxTime
          ? maxDate
          : null
    if (clamped) onChange(format(clamped, ISO_DATE))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minTime, maxTime])

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <ReactDatePicker
        className="sa-datepicker"
        value={selected}
        onChange={(next) =>
          onChange(next instanceof Date && isValid(next) ? format(next, ISO_DATE) : '')
        }
        isOpen={open}
        onCalendarOpen={() => setOpen(true)}
        onCalendarClose={() => setOpen(false)}
        portalContainer={host}
        format="dd/MM/yyyy"
        dayPlaceholder="dd"
        monthPlaceholder="mm"
        yearPlaceholder="yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarAriaLabel="Open calendar"
        clearAriaLabel="Clear date"
        calendarIcon={<CalendarDays className="size-4 text-muted-foreground" />}
        clearIcon={value ? <X className="size-4 text-muted-foreground" /> : null}
      />

      {createPortal(
        <div
          ref={setHost}
          className="sa-datepicker-portal"
          style={{
            position: 'fixed',
            left: coords?.left ?? 0,
            top: coords && !coords.dropUp ? coords.top : undefined,
            bottom: coords?.dropUp ? window.innerHeight - coords.top : undefined,
            /* Never show the panel at a position that hasn't been measured yet —
               the first frame of an open would otherwise flash it at `left: 0`. */
            visibility: coords ? undefined : 'hidden',
            zIndex: 60,
          }}
        />,
        document.body,
      )}
    </div>
  )
}
