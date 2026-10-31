import { cn } from '@/lib/utils'

interface EmployeeCodeBadgeProps {
  code: string | null | undefined
  className?: string
}

/**
 * The employee code as a small tinted mono pill — the one way a code is shown
 * beside a name, so it reads as an identifier at a glance on every screen.
 * Renders nothing without a code, so callers needn't guard it.
 */
export function EmployeeCodeBadge({ code, className }: EmployeeCodeBadgeProps) {
  if (!code) return null
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-md border border-primary/20 bg-primary/8 px-1.5 py-px font-mono text-[11px] font-medium leading-4 tabular-nums text-primary',
        className,
      )}
    >
      #{code}
    </span>
  )
}
