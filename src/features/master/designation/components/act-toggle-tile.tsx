import type { LucideIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ActToggleTileProps {
  icon: LucideIcon
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Tint applied while the toggle is on, e.g. "border-primary/30 bg-primary/5". */
  tone: string
  /** Icon colour class used while the toggle is on. */
  iconTone: string
}

/**
 * One applicable-act switch — a bordered tile that tints itself when the act is
 * turned on, so which acts apply to a designation reads at a glance.
 */
export function ActToggleTile({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  tone,
  iconTone,
}: ActToggleTileProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
        checked ? cn(tone, 'dark:bg-transparent') : 'border-border bg-muted/30',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          checked ? cn('bg-background', iconTone) : 'bg-background text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
        className="mt-0.5"
      />
    </div>
  )
}
