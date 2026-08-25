import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Omitted while the number is still loading — the chip just shows its label. */
  count?: number
}

/**
 * The row of pills both sidebars are filtered with.
 *
 * A count rides inside the chip rather than beside it, because the two are one
 * fact: "Groups, of which there are 8". The active chip carries the number in a
 * contrasting pill so it stays readable once the chip itself is filled.
 *
 * The active chip is white on sky-500 in BOTH themes, which is why it doesn't
 * use `text-primary-foreground`: on dark that token is near-black ink, chosen
 * for buttons sitting on the brighter sky-400 the dark theme makes `--primary`.
 * A filled chip is a brand surface, not a button, and dark ink on it read as a
 * disabled control — so the surface drops to `--primary-hover` (sky-500, the
 * exact colour light mode already pairs with white) and the text stays white.
 */
export function MonitoringSegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-white dark:border-primary-hover dark:bg-primary-hover'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
            {option.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold leading-4',
                  active ? 'bg-white/25 text-white' : 'bg-muted text-foreground',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
