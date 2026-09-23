import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, Search, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

/** A single faceted dropdown filter. */
export interface FilterFacet {
  /** Stable identity for the facet (used as React key). */
  key: string
  /** Heading shown above the control in the panel. */
  label: string
  icon?: LucideIcon
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  searchable?: boolean
  searchPlaceholder?: string
  /** Value that means "no filter applied" (default "all"). */
  clearValue?: string
  /**
   * Lazy-loading pass-through for a master too big to list whole — spread a
   * `PagedSelect` here: the next page loads on scroll-to-end and the search box
   * is sent to the server instead of filtering `options` locally.
   */
  onScrollEnd?: () => void
  onSearchChange?: (query: string) => void
  loading?: boolean
}

interface FilterSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** A removable pill for a filter the config-driven `facets` can't express. */
export interface FilterChipSpec {
  key: string
  label: string
  onRemove: () => void
}

interface FilterBarProps {
  search?: FilterSearch
  facets?: FilterFacet[]
  /** Clears every filter back to its empty state. */
  onReset: () => void
  className?: string
  /**
   * A control kept OUTSIDE the panel, where the search box would sit — for the
   * one filter a screen expects to be changed constantly and shouldn't bury
   * behind a click (the dashboard's date preset, say). Everything else belongs
   * in the panel.
   */
  leading?: ReactNode
  /**
   * Controls rendered at the top of the panel, above the facets — for filters a
   * `FilterFacet` cannot describe: a date range, a multi-select, anything whose
   * value isn't one string.
   */
  panelExtras?: ReactNode
  /**
   * Chips for those same filters. `facets` produce their own; these are for
   * whatever `panelExtras` owns, so one row of chips still shows everything
   * that is applied.
   */
  extraChips?: FilterChipSpec[]
  /**
   * How many of those extra filters are applied. Folded into the trigger's
   * badge and into whether "Clear all" is offered, so the count on the button
   * matches what the panel actually holds.
   */
  extraActiveCount?: number
  /** A caption row under the bar — a resolved window, a timezone, a row count. */
  footer?: ReactNode
}

/** Panel width in px, clamped to the viewport. */
const PANEL_WIDTH = 340
const GAP = 6
const VIEWPORT_PADDING = 8

interface PanelCoords {
  left: number
  top: number
  width: number
}

/** Label shown on a facet's active chip (falls back to the raw value). */
function facetChipLabel(facet: FilterFacet): string {
  return facet.options.find((o) => o.value === facet.value)?.label ?? facet.value
}

/**
 * Trigger placeholder for a facet. A clear value of `''` reads as "nothing
 * selected" to the Combobox, so its own "All …" option would render blank —
 * surface that option's label as the placeholder instead.
 */
function facetPlaceholder(facet: FilterFacet): string {
  const clearValue = facet.clearValue ?? 'all'
  return facet.options.find((o) => o.value === clearValue)?.label ?? 'All'
}

/**
 * Reusable filter control. Renders a compact "Filters" trigger (with an active
 * count) plus removable chips for any applied filters. Clicking the trigger
 * opens an anchored panel with the search box and every faceted dropdown.
 * Config-driven so any list screen can drop it in.
 */
export function FilterBar({
  search,
  facets = [],
  onReset,
  className,
  leading,
  panelExtras,
  extraChips = [],
  extraActiveCount = 0,
  footer,
}: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const searchActive = Boolean(search?.value.trim())
  const activeFacets = facets.filter((f) => f.value !== (f.clearValue ?? 'all'))
  // The badge/chips track panel filters; search lives in its own visible box.
  const facetCount = activeFacets.length + extraActiveCount
  const anyActive = searchActive || facetCount > 0
  // With nothing to put in the panel there is nothing to open — hide the trigger.
  const hasFacets = facets.length > 0 || panelExtras !== undefined

  // Position the panel below the trigger in fixed/viewport coordinates so it is
  // never clipped by an `overflow-hidden` ancestor (e.g. the DataTable card).
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2)
      const maxLeft = window.innerWidth - width - VIEWPORT_PADDING
      // Right-align the panel under the trigger (button sits on the right).
      const left = Math.min(Math.max(VIEWPORT_PADDING, rect.right - width), Math.max(VIEWPORT_PADDING, maxLeft))
      setCoords({ left, top: rect.bottom + GAP, width })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  // Close on outside-click / Escape — but not on a click inside a control's own
  // portalled panel. A Combobox's option list and a DatePicker's calendar are
  // both mounted on `document.body`, so by the DOM they are outside this panel
  // even though by the UI they are inside it: without these two exemptions,
  // choosing an option or a date collapses the filter panel under the cursor.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        target.closest('[data-combobox-portal]') ||
        target.closest('.sa-datepicker-portal')
      ) {
        return
      }
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

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card p-3 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search — always visible, outside the panel. Debounced so list
          queries/filtering only fire once the user pauses typing. */}
      {search ? <SearchBox search={search} /> : null}
      {leading}

      {/* Facet chips + Filters trigger (right) */}
      <div className="flex flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2">
        {activeFacets.length > 0 || extraChips.length > 0 ? (
          <div className="mr-auto flex flex-wrap items-center gap-1.5">
            {extraChips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            {activeFacets.map((facet) => (
              <FilterChip
                key={facet.key}
                label={facetChipLabel(facet)}
                onRemove={() => facet.onChange(facet.clearValue ?? 'all')}
              />
            ))}
          </div>
        ) : null}

        {anyActive ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <RotateCcw className="size-3.5" />
            Clear all
          </button>
        ) : null}

        {hasFacets ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-10 cursor-pointer gap-2',
              (open || facetCount > 0) && 'border-primary/40 text-primary',
              open && 'ring-2 ring-ring/20',
            )}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {facetCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-none text-primary-foreground">
                {facetCount}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      </div>

      {footer ? (
        <div className="mt-3 border-t border-border/60 pt-3">{footer}</div>
      ) : null}

      {hasFacets && open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Filters"
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.top,
                width: coords.width,
              }}
              className="z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Filters</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto px-4 py-4">
                {panelExtras}
                {facets.map((facet) => (
                  <div key={facet.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {facet.label}
                    </label>
                    <Combobox
                      className="w-full"
                      icon={facet.icon}
                      value={facet.value}
                      onChange={facet.onChange}
                      options={facet.options}
                      placeholder={facetPlaceholder(facet)}
                      searchable={facet.searchable}
                      searchPlaceholder={facet.searchPlaceholder}
                      onScrollEnd={facet.onScrollEnd}
                      onSearchChange={facet.onSearchChange}
                      loading={facet.loading}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                <Button
                  variant="ghost"
                  onClick={onReset}
                  disabled={!anyActive}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

/** Debounce delay (ms) before a typed search term is propagated upward. */
const SEARCH_DEBOUNCE = 300

/**
 * Search input with a local, instantly-responsive value that only calls
 * `search.onChange` after the user pauses typing — so list queries and table
 * filtering don't run on every keystroke. Syncs back when the value is changed
 * externally (Reset / Clear all); the clear button flushes immediately.
 */
function SearchBox({ search }: { search: FilterSearch }) {
  const [local, setLocal] = useState(search.value)
  const onChangeRef = useRef(search.onChange)
  onChangeRef.current = search.onChange

  // Reflect external changes (reset / clear-all / programmatic) into the input.
  useEffect(() => {
    setLocal(search.value)
  }, [search.value])

  // Debounce propagation of the typed value upward.
  useEffect(() => {
    if (local === search.value) return
    const t = setTimeout(() => onChangeRef.current(local), SEARCH_DEBOUNCE)
    return () => clearTimeout(t)
  }, [local, search.value])

  const active = Boolean(local.trim())

  return (
    <div className="relative sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={search.placeholder ?? 'Search…'}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="h-10 truncate border-border/50 pl-9 pr-9"
      />
      {active ? (
        <button
          type="button"
          onClick={() => {
            setLocal('')
            onChangeRef.current('')
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

/** A removable pill representing one active filter. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex size-4 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
