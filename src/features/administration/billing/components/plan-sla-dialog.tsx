import { Clock, Headphones } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { SLA_PRIORITY_LABELS, SLA_PRIORITY_VARIANTS } from '../constants'
import { groupSlas, slaLabel } from '../lib/billing-mappers'
import type { Plan } from '../types'

/**
 * A plan's full support-response table.
 *
 * It lives in a dialog rather than on the card: a plan can carry eight promises
 * and the next can carry two, and eight rows against two turns a comparison grid
 * into a column of ragged cards. The card states how many there are; this states
 * what they are.
 */
export function PlanSlaDialog({
  plan,
  open,
  onOpenChange,
}: {
  /** The plan whose promises are being read, or null while the dialog is shut. */
  plan: Plan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const groups = plan ? groupSlas(plan.supportSlas) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="size-4" />
            </span>
            Support response
          </DialogTitle>
          <DialogDescription>
            {plan
              ? `How quickly ${plan.name} promises to respond, by ticket type and urgency.`
              : undefined}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.ticketType}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>

              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {group.slas.map((sla) => (
                  <li
                    key={`${sla.ticketType}-${sla.priority}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        SLA_PRIORITY_VARIANTS[sla.priority] ??
                          'bg-muted text-muted-foreground',
                      )}
                    >
                      {SLA_PRIORITY_LABELS[sla.priority] ?? sla.priority}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {/*
                        Rendered in the unit it was promised in — "2 days" and
                        "48 hours" are the same duration, not the same sentence.
                      */}
                      {slaLabel(sla)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This plan states no support response times.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
