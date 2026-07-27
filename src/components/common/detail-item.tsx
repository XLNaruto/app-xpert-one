import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetailItemProps {
  icon: LucideIcon
  label: string
  value: string | null
  className?: string
}

/** A labelled read-only detail row with a tinted icon — for detail screens. */
export function DetailItem({ icon: Icon, label, value, className }: DetailItemProps) {
  return (
    <div className={cn(className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || 'N/A'}
      </p>
    </div>
  )
}
