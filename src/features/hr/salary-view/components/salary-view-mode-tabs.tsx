import { AlignJustify, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SALARY_VIEW_MODES, type SalaryViewMode } from '../constants'

const MODE_ICON = {
  short: LayoutList,
  long: AlignJustify,
} as const

/**
 * Short view / Long view — the same rows, two densities.
 *
 * A segmented control rather than a dropdown: there are two of them, they are
 * switched between constantly, and which one is on has to be readable at a
 * glance. It sits above the card because it changes the whole table underneath,
 * not what is in it — the filters do that, and they live inside.
 */
export function SalaryViewModeTabs({
  mode,
  onChange,
}: {
  mode: SalaryViewMode
  onChange: (mode: SalaryViewMode) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Salary view density"
      className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
    >
      {SALARY_VIEW_MODES.map((option) => {
        const Icon = MODE_ICON[option.value]
        const active = option.value === mode
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
