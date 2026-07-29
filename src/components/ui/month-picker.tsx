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
  className,
}: MonthPickerProps) {
  const parsed = value ? parse(value, ISO_MONTH, new Date()) : null
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
          onChange(next instanceof Date && isValid(next) ? format(next, ISO_MONTH) : '')
        }
        isOpen={open}
        onCalendarOpen={() => setOpen(true)}
        onCalendarClose={() => setOpen(false)}
        portalContainer={host}
        /* Year view is the deepest the calendar goes, so a tile is a month. */
        maxDetail="year"
        format="MM/yyyy"
        monthPlaceholder="mm"
        yearPlaceholder="yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarAriaLabel="Open month picker"
        clearAriaLabel="Clear month"
        calendarIcon={<CalendarDays className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
        clearIcon={
          value ? <X className={size === 'sm' ? 'size-3.5' : 'size-4'} /> : null
        }
      />

      {/*
        The host only exists while the calendar is open. A closed picker keeping a
        portal on `document.body` costs a node and a mount per field — fine for a
        form with three date fields, but the wage grid puts one on every row.
      */}
      {open &&
        createPortal(
          <div
            ref={setHost}
            className="sa-datepicker-portal"
            style={{
              position: 'fixed',
              left: coords?.left ?? 0,
              top: coords && !coords.dropUp ? coords.top : undefined,
              bottom: coords?.dropUp ? window.innerHeight - coords.top : undefined,
              zIndex: 60,
            }}
          />,
          document.body,
        )}
    </div>
  )
}
