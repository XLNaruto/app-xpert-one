import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Close / Continue for a step with nothing of its own to save.
 *
 * Two steps are like that. Wage Structure is read-only — the structure is inherited
 * from the designation and stored nowhere on the employee. Transfer History is
 * append-only, and every write there happens inside a dialog. A Save button on
 * either would have nothing to send, and a button that does nothing is worse than
 * no button at all.
 */
export function StepNavFooter({
  onContinue,
  onClose,
  continueLabel = 'Continue',
  children,
}: {
  onContinue: () => void
  onClose: () => void
  continueLabel?: string
  /** A line of explanation on the left of the footer. */
  children?: ReactNode
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <div className="text-xs text-muted-foreground">{children}</div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onContinue}>
          {continueLabel}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
