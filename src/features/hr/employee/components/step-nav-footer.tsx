import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Back / Next for a step with nothing of its own to save.
 *
 * Two steps are like that. Wage Structure reads the wage in force and writes the
 * employee's own versions one dialog at a time; Service History is append-only,
 * and every write there happens inside a dialog too. A Save button on either
 * would have nothing left to send, so these two wear the same pair of buttons as
 * every other step, minus the save.
 */
export function StepNavFooter({
  onContinue,
  onBack,
  continueLabel = 'Next',
  children,
}: {
  onContinue: () => void
  /** Go back a step — the previous tab. */
  onBack: () => void
  continueLabel?: string
  /** A line of explanation on the left of the footer. */
  children?: ReactNode
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <div className="text-xs text-muted-foreground">{children}</div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button type="button" onClick={onContinue}>
          {continueLabel}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
