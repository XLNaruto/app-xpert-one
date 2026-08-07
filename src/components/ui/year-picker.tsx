import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactDatePicker from 'react-date-picker'
import { format, isValid, parse } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The wire format for every year the app stores and validates. */
const ISO_YEAR = 'yyyy'

/** Rough calendar height used to decide whether to open upward. */
const PANEL_MAX = 300
const GAP = 4
const VIEWPORT_PADDING = 8

interface YearPickerProps {
  /** Selected year as `yyyy`, or `''` when nothing is picked. */
  value: string
  /** Called with the new `yyyy` value, or `''` when cleared. */
  onChange: (value: string) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  /** Draw the field in its error state — a red border on the control itself. */
  invalid?: boolean
  /** Compact height, for a dense grid cell. */
  size?: 'default' | 'sm'
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
 * Year field — the same `react-date-picker` control the `DatePicker` and
 * `MonthPicker` use, stopped one view earlier so a year is the finest thing
 * selectable: the calendar opens on a decade of year tiles. Values cross the
 * boundary as `yyyy` strings, which is what a passing year is — a year, not a date
 * inside it.
 *
 * It replaces a scrolling list of fifty-odd years in a dropdown. Picking 1994 from
 * such a list means scrolling past thirty entries; here it's two clicks on the
 * decade arrows, and the year can still simply be typed.
 *
 * The calendar is portalled into a fixed-position host on `document.body` and
 * positioned here (flipping upward when there's no room below), so the panel stays
 * visible even when the field sits inside a scrolling or `overflow-hidden`
 * ancestor — a card in a repeatable list, typically.
 */
export function YearPicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  invalid = false,
  size = 'default',
  className,
}: YearPickerProps) {
  const parsed = value ? parse(value, ISO_YEAR, new Date()) : null
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
      const maxLeft = window.innerWidth - rect.width - VIEWPORT_PADDING
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
    <div ref={wrapRef} className={cn('relative', className)}>
      <ReactDatePicker
        className={cn(
          'sa-datepicker',
          size === 'sm' && 'sa-datepicker--sm',
          invalid && 'sa-datepicker--error',
        )}
        value={selected}
        onChange={(next) =>
          onChange(next instanceof Date && isValid(next) ? format(next, ISO_YEAR) : '')
        }
        isOpen={open}
        onCalendarOpen={() => setOpen(true)}
        onCalendarClose={() => setOpen(false)}
        portalContainer={host}
        /* Decade view is the deepest the calendar goes, so a tile is a year. */
        maxDetail="decade"
        format="yyyy"
        yearPlaceholder="yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarAriaLabel="Open year picker"
        clearAriaLabel="Clear year"
        calendarIcon={<CalendarDays className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
        clearIcon={
          value ? <X className={size === 'sm' ? 'size-3.5' : 'size-4'} /> : null
        }
      />

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
