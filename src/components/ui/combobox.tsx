import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, Search, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Rough panel height used to decide whether to open upward. */
const PANEL_MAX = 300
const GAP = 4
const VIEWPORT_PADDING = 8

export interface ComboboxOption {
  label: string
  value: string
  /**
   * Show the option but refuse it — for a choice that exists and simply can't be
   * taken right now (an asset variant at zero stock, say). A greyed row explains
   * itself better than letting the pick through to an error toast.
   */
  disabled?: boolean
  /** Muted text to the right of the label — a count, a status. */
  hint?: string
}

interface ComboboxBaseProps {
  options: ComboboxOption[]
  /** Leading icon in the trigger. */
  icon?: LucideIcon
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string
  /** Show the in-panel search box (default true). */
  searchable?: boolean
  /**
   * Offer a clear (×) control once something is selected, resetting the value
   * to `''`. Only for genuinely optional fields — a required dropdown has
   * nothing meaningful to clear to.
   */
  clearable?: boolean
  searchPlaceholder?: string
  /** How the panel aligns to the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Width utility for the trigger (e.g. "lg:w-44"). */
  className?: string
  /**
   * Overrides on the trigger button itself — for the tighter sizing a dense
   * grid cell needs, where the default 36px control is too tall.
   */
  triggerClassName?: string
  /**
   * Floor for the option panel's width, in px. The panel matches the trigger by
   * default, which truncates long labels behind a narrow control — a grid cell,
   * typically. Set this to let the panel open wider than the field it belongs to.
   */
  panelMinWidth?: number
  /**
   * Called when the option list is scrolled near its end — use to fetch the
   * next page for lazy-loaded / infinite dropdowns.
   */
  onScrollEnd?: () => void
  /** Show a loading row at the bottom of the list (a fetch is in flight). */
  loading?: boolean
  /**
   * When provided, filtering is delegated to the caller (server-side search):
   * the search box value is forwarded here and `options` are shown as-is
   * instead of being filtered locally.
   */
  onSearchChange?: (query: string) => void
  /**
   * Locks the control: the panel can't open and the value can't be cleared.
   * For a value the screen decides rather than the user — a required document's
   * type, say, which is fixed by the master.
   */
  disabled?: boolean
}

interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

interface ComboboxMultiProps extends ComboboxBaseProps {
  /**
   * Tick many options instead of one. The panel stays open as they're picked,
   * the value is the selected values in pick order, and `clearable` empties it.
   */
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
  /** Labels shown in the trigger before it collapses to "+N more". */
  maxVisibleLabels?: number
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultiProps

/** Trigger `onScrollEnd` when scrolled within this many px of the bottom. */
const SCROLL_END_THRESHOLD = 48

interface PanelCoords {
  left: number
  top: number
  width: number
  /** When true the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

/**
 * Custom searchable dropdown (combobox). Zero-dependency: a button trigger +
 * a portalled panel with a filter box and a checkmark on the selected option.
 * The panel is portalled to `document.body` with fixed positioning so it is
 * never clipped by an `overflow-hidden`/`overflow-auto` ancestor (e.g. the
 * FilterBar panel). Closes on outside-click or Escape.
 */
function normalizeComboboxValue(value: string) {
  return value.trim().replace(/[-_\s]+/g, '').toLowerCase()
}

export function Combobox(props: ComboboxProps) {
  const {
    options,
    icon: Icon,
    placeholder,
    searchable = true,
    clearable = false,
    searchPlaceholder = 'Search',
    align = 'start',
    className,
    triggerClassName,
    panelMinWidth = 0,
    onScrollEnd,
    loading = false,
    onSearchChange,
    disabled = false,
  } = props

  // `value`/`onChange` stay on `props`: reading them through the union is what
  // keeps the string and string[] halves apart without a cast.
  const selectedValues = props.multiple
    ? props.value
    : props.value
      ? [props.value]
      : []

  const selectedOptions = options.filter((option) =>
    selectedValues.some((value) => normalizeComboboxValue(value) === normalizeComboboxValue(option.value)),
  )

  /**
   * What the trigger shows for a selected value that matches no loaded option.
   *
   * A value can outlive its option list two ways: the options are still being
   * fetched, or the list they came from has been replaced — a company switch
   * reloads every master, and an id picked under the previous tenant is not in
   * the new one's. Either way the raw value is all there is to print.
   *
   * Printing it is right when the value is a code someone reads — a grade like
   * `A1`, which is also stored as its own label — and wrong when it is a record
   * id, where "20" tells the reader nothing and reads like a real selection. So
   * a bare number falls through to the placeholder instead: the field shows as
   * empty, which for a stale id is the truth.
   */
  const fallbackSelectedValue =
    selectedValues.find(
      (value) => value.trim() !== '' && !/^\d+$/.test(value.trim()),
    ) ?? ''

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Position the panel against the trigger in fixed/viewport coordinates so it
  // escapes any clipping ancestor. Recomputes on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      // The panel may outgrow the trigger, but never the viewport.
      const width = Math.min(
        Math.max(rect.width, panelMinWidth),
        window.innerWidth - VIEWPORT_PADDING * 2,
      )
      let left = rect.left
      if (align === 'end') left = rect.right - width
      else if (align === 'center') left = rect.left + rect.width / 2 - width / 2
      const maxLeft = window.innerWidth - width - VIEWPORT_PADDING
      left = Math.min(Math.max(VIEWPORT_PADDING, left), Math.max(VIEWPORT_PADDING, maxLeft))
      const top = dropUp ? rect.top - GAP : rect.bottom + GAP
      setCoords({ left, top, width, dropUp })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, align, panelMinWidth])

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

  // With server-side search the parent already returns the matching page, so
  // show options verbatim; otherwise filter the loaded options locally.
  const filtered =
    onSearchChange || !query
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  const search = (q: string) => {
    setQuery(q)
    onSearchChange?.(q)
  }

  const choose = (v: string) => {
    // Multi keeps the panel (and the search term) as it is: picking three
    // departments shouldn't mean reopening and re-typing three times.
    if (props.multiple) {
      props.onChange(
        props.value.includes(v) ? props.value.filter((current) => current !== v) : [...props.value, v],
      )
      return
    }
    props.onChange(v)
    setOpen(false)
    setQuery('')
    onSearchChange?.('')
  }

  /** Drop one picked value (multi only) — the × on a chip. */
  const remove = (v: string) => {
    if (!props.multiple) return
    props.onChange(props.value.filter((current) => current !== v))
  }

  const clear = () => {
    if (props.multiple) props.onChange([])
    else props.onChange('')
    setOpen(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    if (!onScrollEnd) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_END_THRESHOLD) {
      onScrollEnd()
    }
  }

  // The trigger is a <button>, so the clear control can't nest inside it — it
  // rides as an overlay sibling, with the trigger padded to make room.
  const showClear = clearable && selectedValues.length > 0 && !disabled

  const maxVisibleLabels = props.multiple ? (props.maxVisibleLabels ?? 2) : 1
  const visibleLabels = selectedOptions.slice(0, maxVisibleLabels)
  const hiddenCount = selectedOptions.length - visibleLabels.length

  const triggerClasses = cn(
    'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-foreground transition-colors',
    disabled
      ? 'cursor-not-allowed bg-muted/50 text-muted-foreground opacity-70'
      : 'cursor-pointer hover:border-ring/40',
    open && 'ring-1 ring-ring',
    triggerClassName,
  )

  const triggerContent = (
    <>
      {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
      {props.multiple && selectedOptions.length > 0 ? (
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {visibleLabels.map((option) => (
            <span
              key={option.value}
              className="flex min-w-0 items-center gap-1 rounded bg-primary/10 py-0.5 pl-1.5 pr-1 text-xs text-primary"
            >
              <span className="max-w-40 truncate">{option.label}</span>
              {/* Drops just this one — the trigger's × next to the chevron
                  clears the lot. Valid only because the multi trigger is a
                  div: a <button> can't hold another one. */}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  remove(option.value)
                }}
                className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="shrink-0 text-xs text-muted-foreground">+{hiddenCount} more</span>
          ) : null}
        </span>
      ) : (
        <span
          className={cn(
            'flex-1 truncate text-left',
            selectedOptions.length === 0 && 'text-muted-foreground',
          )}
        >
          {selectedOptions[0]?.label ?? (fallbackSelectedValue || placeholder || '')}
        </span>
      )}
      {/* Reserves the slot the clear overlay occupies, left of the chevron. */}
      {showClear ? <span aria-hidden className="size-5 shrink-0" /> : null}
      <ChevronDown
        className={cn(
          'size-4 shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180',
        )}
      />
    </>
  )

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {/* Multi draws its trigger as a div so each chip can carry its own remove
          button; single stays a real <button>. Both expose the same role. */}
      {props.multiple ? (
        <div
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          onClick={() => {
            if (!disabled) setOpen((o) => !o)
          }}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen((o) => !o)
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-disabled={disabled}
          className={triggerClasses}
        >
          {triggerContent}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={triggerClasses}
        >
          {triggerContent}
        </button>
      )}

      {showClear ? (
        <button
          type="button"
          aria-label="Clear selection"
          title="Clear"
          onClick={clear}
          className="absolute right-7 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      {open && !disabled && coords
        ? createPortal(
            <div
              ref={panelRef}
              data-combobox-portal
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.dropUp ? undefined : coords.top,
                bottom: coords.dropUp ? window.innerHeight - coords.top : undefined,
                width: coords.width,
              }}
              className="z-60 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              {searchable ? (
                <div className="relative mb-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    autoComplete="off"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-md bg-transparent pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : null}

              <ul
                className="max-h-60 overflow-y-auto"
                role="listbox"
                aria-multiselectable={props.multiple ? true : undefined}
                onScroll={handleScroll}
              >
                {filtered.length === 0 && !loading ? (
                  <li className="px-2 py-2 text-center text-sm text-muted-foreground">No results</li>
                ) : (
                  filtered.map((o) => {
                    const active = selectedValues.some(
                      (value) => normalizeComboboxValue(value) === normalizeComboboxValue(o.value),
                    )
                    return (
                      <li key={o.value}>
                        <button
                          type="button"
                          role="option"
                          disabled={o.disabled}
                          aria-selected={active}
                          aria-disabled={o.disabled}
                          onClick={() => choose(o.value)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                            o.disabled
                              ? 'cursor-not-allowed text-muted-foreground opacity-60'
                              : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                            active && !o.disabled && 'bg-accent/60 font-medium text-foreground',
                          )}
                        >
                          <span className="truncate">{o.label}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {o.hint ? (
                              <span className="text-xs text-muted-foreground">{o.hint}</span>
                            ) : null}
                            {active ? <Check className="size-4 text-primary" /> : null}
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
                {loading ? (
                  <li className="flex items-center justify-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
