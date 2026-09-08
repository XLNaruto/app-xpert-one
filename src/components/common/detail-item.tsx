import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetailItemProps {
  /** Optional — a dense read-only grid reads better without one on every label. */
  icon?: LucideIcon
  label: string
  value: string | null
  /**
   * A short line under the value saying where it came from — "2% of ₹22,775.78"
   * beside an agency charge. For a figure that is *derived* from others on the
   * same block: without it the reader has to reconstruct the arithmetic, and
   * with it a wrong figure is visible as wrong. Omitted, nothing renders.
   */
  hint?: string
  className?: string
}

/** A labelled read-only detail row with an optional tinted icon — for detail screens. */
export function DetailItem({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: DetailItemProps) {
  return (
    <div className={cn(className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || 'N/A'}
      </p>
      {/* Only where the value itself is there to explain — a hint under an
          "N/A" would describe arithmetic that never happened. */}
      {hint && value && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
