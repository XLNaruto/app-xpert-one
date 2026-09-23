import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A small segmented control for the letter toolbar — which order, which
 * language. The icon leads so the two groups read apart at a glance.
 */
export function LetterToggle<T extends string>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon
  /** Accessible name for the group. */
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-lg border border-border bg-muted/40 p-1"
      >
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm dark:text-white'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
