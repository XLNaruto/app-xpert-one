import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PermissionAction } from '@/features/permissions'
import { lucideIcon } from '../lib/lucide-icon'

interface PermissionActionPillProps {
  action: PermissionAction
  checked: boolean
  /**
   * Something else that's ticked depends on this one. Still clickable —
   * clearing it takes the dependents with it — but marked, so that cascade is
   * announced before it happens rather than discovered after.
   */
  locked: boolean
  /** What the lock says on hover — what goes if this one is cleared. */
  lockReason?: string
  disabled?: boolean
  onToggle: () => void
}

/**
 * One action on a screen's row — `List`, `View`, `Add`, `Edit`, `Delete`, or a
 * bespoke one. The catalog's own `description` is the tooltip, so the pill never
 * has to invent wording for what a code allows.
 *
 * The pill IS the control: it carries no checkbox of its own, and its fill is
 * what says on or off. `aria-pressed` is what tells a screen reader the same
 * thing the fill tells everyone else.
 *
 * A pill something else depends on is marked with a lock but stays clickable —
 * clicking it clears the dependents too, which the selection engine already does
 * correctly. Blocking the click instead would freeze a fully-granted role solid:
 * once everything is on, almost everything holds something else up, and the only
 * way back would be Clear.
 */
export function PermissionActionPill({
  action,
  checked,
  locked,
  lockReason,
  disabled = false,
  onToggle,
}: PermissionActionPillProps) {
  const Icon = lucideIcon(action.icon)

  const pill = (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {action.label}
      {/* Only ever on a ticked pill — it marks a cascade, not a block. */}
      {locked && <Lock className="size-3 opacity-70" />}
    </button>
  )

  // The description is the whole point of the tooltip; without one there is
  // nothing to say that the label doesn't already.
  const hint = locked ? (lockReason ?? action.description) : action.description
  if (!hint) return pill

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty font-normal">{hint}</TooltipContent>
    </Tooltip>
  )
}
