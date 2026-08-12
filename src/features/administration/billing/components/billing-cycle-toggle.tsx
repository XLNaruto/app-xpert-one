import { cn } from '@/lib/utils'

/** One half of the segmented control. */
function Segment({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // `aria-pressed` rather than a tablist: these swap the price on cards
      // already visible, they don't reveal different panels.
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

/**
 * Monthly ⇄ Yearly for the whole plan grid.
 *
 * One control for every card, because the mistake worth preventing is reading a
 * monthly price against a yearly one. The saving is advertised on the control
 * itself rather than inside each card: it's the reason to press the thing, so it
 * belongs next to the thing.
 */
export function BillingCycleToggle({
  yearly,
  onChange,
  savingsPercent,
}: {
  yearly: boolean
  onChange: (yearly: boolean) => void
  /** Best yearly saving across the catalog, or null when none is on offer. */
  savingsPercent: number | null
}) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div
        role="group"
        aria-label="Billing cycle"
        className="inline-flex items-center rounded-full border border-border bg-muted/60 p-1"
      >
        <Segment label="Monthly" active={!yearly} onClick={() => onChange(false)} />
        <Segment label="Yearly" active={yearly} onClick={() => onChange(true)} />
      </div>

      {savingsPercent !== null && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
            // Dimmed until it applies — the claim is only true on the yearly
            // cycle, so it shouldn't read as loud while monthly is showing.
            yearly
              ? 'bg-success/12 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          Save up to {savingsPercent}% yearly
        </span>
      )}
    </div>
  )
}
