import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Rough panel height used to decide whether to open upward. */
const PANEL_MAX = 300
const GAP = 4
const VIEWPORT_PADDING = 8
/** Panel width — three columns plus their padding. */
const PANEL_WIDTH = 232

const MINUTES_PER_HOUR = 60
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const MERIDIEMS = ['AM', 'PM'] as const

type Meridiem = (typeof MERIDIEMS)[number]

interface Parts {
  hour12: number
  minute: number
  meridiem: Meridiem
}

/** `HH:MM` → its 12-hour parts, or `null` if it isn't a time. */
function partsOf(value: string): Parts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  const hour24 = Number(match[1])
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: Number(match[2]),
    meridiem: hour24 < 12 ? 'AM' : 'PM',
  }
}

/** 12-hour parts → the `HH:MM` the API takes. */
function to24Hour({ hour12, minute, meridiem }: Parts): string {
  const base = hour12 % 12
  const hour24 = meridiem === 'PM' ? base + 12 : base
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** What the trigger reads: `13:45` → `01:45 PM`. */
function label(parts: Parts): string {
  return `${String(parts.hour12).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} ${parts.meridiem}`
}

interface PanelCoords {
  left: number
  top: number
  /** When true the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

interface TimePickerProps {
  /** Selected time as `HH:MM` (24-hour), or `''` when nothing is picked. */
  value: string
  /** Called with the new `HH:MM` value, or `''` when cleared. */
  onChange: (value: string) => void
  /** Minutes between one offered minute and the next. */
  minuteStep?: number
  disabled?: boolean
  /** Offer a clear (×) control once a time is picked. */
  clearable?: boolean
  placeholder?: string
  /** Width utility for the control (defaults to full width). */
  className?: string
}

/**
 * Time field in the shape of the `DatePicker`: a read-only trigger showing
 * `hh:mm AM/PM` and a portalled panel of hour / minute / AM-PM columns, rather
 * than one long dropdown of every clock time — three short scrolls beat a
 * 96-item list, and the panel is portalled with fixed positioning (flipping
 * upward when there's no room below) so it is never clipped by a scrolling or
 * `overflow-hidden` ancestor.
 *
 * **What's shown is 12-hour; what's held is 24-hour.** The value crosses the
 * boundary as `HH:MM` — what the API stores and what the schemas validate — so
 * forms never deal with a meridiem.
 */
export function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  disabled = false,
  clearable = false,
  placeholder = 'Select time',
  className,
}: TimePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)

  const selected = partsOf(value)

  // Anchor the panel to the trigger in viewport coordinates, and keep it there
  // while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      const width = Math.max(rect.width, PANEL_WIDTH)
      const maxLeft = window.innerWidth - width - VIEWPORT_PADDING
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

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // The panel lives outside the field, so nothing closes it when the field
  // itself unmounts (e.g. switching tabs) — reset on teardown.
  useEffect(() => () => setOpen(false), [])

  // Picking one column shouldn't wait on the other two: an empty field starts
  // from 12:00 AM, so the first click already yields a whole time.
  const patch = (part: Partial<Parts>) => {
    const base: Parts = selected ?? { hour12: 12, minute: 0, meridiem: 'AM' }
    onChange(to24Hour({ ...base, ...part }))
  }

  const minutes = Array.from(
    { length: Math.ceil(MINUTES_PER_HOUR / minuteStep) },
    (_, i) => i * minuteStep,
  )
  // A record saved elsewhere can hold an off-step minute (`14:37`); show it so
  // the column still marks what the field holds.
  if (selected && !minutes.includes(selected.minute)) {
    minutes.push(selected.minute)
    minutes.sort((a, b) => a - b)
  }

  const showClear = clearable && value !== ''

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-foreground transition-colors hover:border-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-1 ring-ring',
        )}
      >
        <span className={cn('flex-1 truncate text-left', !selected && 'text-muted-foreground')}>
          {selected ? label(selected) : placeholder}
        </span>
        {/* Reserves the slot the clear overlay occupies, left of the icon. */}
        {showClear ? <span aria-hidden className="size-5 shrink-0" /> : null}
        <Clock className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {showClear ? (
        <button
          type="button"
          aria-label="Clear time"
          title="Clear"
          onClick={() => {
            onChange('')
            setOpen(false)
          }}
          className="absolute right-8 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose time"
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.dropUp ? undefined : coords.top,
                bottom: coords.dropUp ? window.innerHeight - coords.top : undefined,
                width: PANEL_WIDTH,
              }}
              className="z-60 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
            >
              <div className="grid grid-cols-3 divide-x divide-border">
                <Column
                  heading="Hour"
                  items={HOURS_12}
                  selected={selected?.hour12 ?? null}
                  format={(h) => String(h).padStart(2, '0')}
                  onPick={(hour12) => patch({ hour12 })}
                />
                <Column
                  heading="Minute"
                  items={minutes}
                  selected={selected?.minute ?? null}
                  format={(m) => String(m).padStart(2, '0')}
                  onPick={(minute) => patch({ minute })}
                />
                <Column
                  heading="AM/PM"
                  items={MERIDIEMS}
                  selected={selected?.meridiem ?? null}
                  format={(m) => m}
                  onPick={(meridiem) => patch({ meridiem })}
                />
              </div>

              <div className="flex items-center justify-end border-t border-border px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
                >
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

interface ColumnProps<T extends string | number> {
  heading: string
  items: readonly T[]
  selected: T | null
  format: (item: T) => string
  onPick: (item: T) => void
}

/** One scrollable column of the panel, scrolled to whatever is selected. */
function Column<T extends string | number>({
  heading,
  items,
  selected,
  format,
  onPick,
}: ColumnProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  // Open on the held value rather than at the top of the list — 08:00 PM
  // otherwise shows a minute column starting at 00 with the selection offscreen.
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'center' })
    // Only on mount: re-running would yank the list back while the user scrolls.
  }, [])

  return (
    <div className="min-w-0">
      <div className="border-b border-border px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {heading}
      </div>
      <div ref={listRef} className="max-h-48 overflow-y-auto p-1">
        {items.map((item) => {
          const active = item === selected
          return (
            <button
              key={String(item)}
              type="button"
              data-active={active}
              aria-pressed={active}
              onClick={() => onPick(item)}
              className={cn(
                'w-full cursor-pointer rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground',
                active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {format(item)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
