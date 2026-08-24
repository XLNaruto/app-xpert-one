import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactDatePicker from 'react-date-picker'
import { format, isValid, parse } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The wire format for every month the app stores and validates. */
const ISO_MONTH = 'yyyy-MM'

/** Rough calendar height used to decide whether to open upward. */
const PANEL_MAX = 300
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

/**
 * The month the calendar should open on when the field is empty: today when it
 * falls inside the allowed range, otherwise the nearest valid bound.
 */
function nearestAllowedMonth(minDate?: Date, maxDate?: Date): Date | undefined {
  const today = new Date()
  if (maxDate && today > maxDate) return maxDate
  if (minDate && today < minDate) return minDate
  return undefined
}

interface MonthPickerProps {
  /** Selected month as `yyyy-MM`, or `''` when nothing is picked. */
  value: string
  /** Called with the new `yyyy-MM` value, or `''` when cleared. */
  onChange: (value: string) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  /** Draw the field in its error state — a red border on the control itself. */
  invalid?: boolean
  /** Compact height, for a dense grid cell. */
  size?: 'default' | 'sm'
  /**
   * How the picked month reads in the field.
   *
   * `numeric` (the default) is `06/2026` — two typed segments, which is what a
   * form field wants: it is quick to key and it lines up with every other date
   * field in the app.
   *
   * `long` is `June 2026`, for the few places where the month is a heading
   * rather than an entry — a calendar's own month control, say. The field goes
   * read-only there and the whole of it opens the calendar: `react-date-picker`
   * renders the month as a native `<select>` once the format asks for names, and
   * left alone that gives one field two different pickers — the OS dropdown on
   * the word, the app's panel on the icon. Reading is what this mode is for, so
   * the panel is made the only way to set the value.
   */
  display?: 'numeric' | 'long'
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
 * Month field — the same `react-date-picker` control the `DatePicker` uses, but
 * stopped at the year view so a month is the finest thing selectable. Values
 * cross the boundary as `yyyy-MM` strings, since a month has no day: an
 * effective-from month is a period, not a date.
 *
 * The calendar is portalled into a fixed-position host on `document.body` and
 * positioned here (flipping upward when there's no room below), so the panel
 * stays visible even when the field sits inside a scrolling or `overflow-hidden`
 * ancestor — a grid cell, typically.
 */
export function MonthPicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  invalid = false,
  size = 'default',
  display = 'numeric',
  className,
}: MonthPickerProps) {
  const parsed = value ? parse(value, ISO_MONTH, new Date()) : null
  const selected = parsed && isValid(parsed) ? parsed : null

  const wrapRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const [anchorMonth, setAnchorMonth] = useState<Date | undefined>(() =>
    nearestAllowedMonth(minDate, maxDate),
  )

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

  return (
    <div
      ref={wrapRef}
      className={cn('relative', className)}
      /* In `long` mode the segments are inert (see the CSS), so a click that
         lands on the text would otherwise do nothing at all — send it to the
         calendar. The icons keep their own jobs: clear still clears. */
      onClick={
        display === 'long' && !disabled
          ? (event) => {
              const onButton = (event.target as HTMLElement).closest(
                '.react-date-picker__button',
              )
              if (!onButton) setOpen(true)
            }
          : undefined
      }
    >
      <ReactDatePicker
        className={cn(
          'sa-datepicker',
          size === 'sm' && 'sa-datepicker--sm',
          display === 'long' && 'sa-datepicker--readonly',
          invalid && 'sa-datepicker--error',
        )}
        value={selected}
        onChange={(next) =>
          onChange(next instanceof Date && isValid(next) ? format(next, ISO_MONTH) : '')
        }
        isOpen={open}
        onCalendarOpen={() => {
          setOpen(true)
          setAnchorMonth(nearestAllowedMonth(minDate, maxDate))
        }}
        onCalendarClose={() => setOpen(false)}
        portalContainer={host}
        /* Year view is the deepest the calendar goes, so a tile is a month. */
        maxDetail="year"
        format={display === 'long' ? 'MMMM yyyy' : 'MM/yyyy'}
        monthPlaceholder="mm"
        yearPlaceholder="yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarAriaLabel="Open month picker"
        clearAriaLabel="Close month picker"
        clearIcon={null}
        calendarProps={{ defaultActiveStartDate: anchorMonth }}
        calendarIcon={<CalendarDays className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
      />

      {value && display !== 'long' && !disabled && (
        <button
          type="button"
          aria-label="Close month picker"
          className="absolute right-9 top-1/2 z-10 inline-flex -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          }}
        >
          <X className={size === 'sm' ? 'size-3.5' : 'size-4'} />
        </button>
      )}

      {/*
        The host is mounted whether or not the calendar is open, and deliberately.
        It used to be created only on opening, to save a node per field — but the
        host is what `portalContainer` points at, and on the render that opens the
        calendar it did not exist yet. `react-date-picker` fell back to rendering
        the panel unportalled and unpositioned, which put it at the end of the
        body's flow — a calendar floating below the page instead of under its
        field, correcting itself a frame later. An empty div per field is the
        cheaper of the two.
      */}
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
