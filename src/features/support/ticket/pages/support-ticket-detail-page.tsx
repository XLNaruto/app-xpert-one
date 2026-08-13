import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Clock,
  CreditCard,
  LifeBuoy,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Timer,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { DetailItem } from '@/components/common/detail-item'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import { decryptId } from '@/lib/crypto'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useSupportTicketDetail } from '../hooks/use-support-ticket-detail'
import {
  dueLabel,
  priorityLabel,
  slaLabel,
  ticketTypeLabel,
} from '../lib/support-ticket-mappers'
import {
  SupportDueBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
} from '../components/support-ticket-badges'
import { SupportTicketReopenDialog } from '../components/support-ticket-reopen-dialog'

/** A stored timestamp as text, or nothing when the event hasn't happened. */
const asMoment = (value: string | null | undefined) =>
  value ? formatDateTime(value) : null

/**
 * One support ticket in full — the query, the promise it bought, and where the
 * desk has got to.
 *
 * The two priorities are shown separately whenever they differ: the desk may
 * re-grade a ticket, which moves its queue position and never its deadline, so
 * "what we raised it as" is the number the clock was priced from.
 *
 * The record id arrives encrypted in the `?data=` search param.
 */
export function SupportTicketDetailPage({ data }: { data?: string }) {
  const detail = useSupportTicketDetail(decryptId(data))
  const { ticket } = detail

  // Editing, reopening and closing are all writes on this resource.
  const { canUpdate } = useResourceAccess(PERMISSIONS.support)

  if (detail.isForbidden) return <Forbidden description={detail.forbiddenMessage} />

  const due = ticket ? dueLabel(ticket) : null
  const sla = ticket ? slaLabel(ticket) : null

  return (
    <div>
      <PageHeader
        title={ticket ? `Ticket ${ticket.code}` : 'Ticket Detail'}
        description="Your query to the XpertOne help desk, and the response time your plan promised for it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={detail.goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {canUpdate && detail.canEdit && (
              <Button variant="outline" onClick={detail.goToEdit}>
                <Pencil className="size-4" />
                Edit Wording
              </Button>
            )}
            {canUpdate && detail.canReopen && (
              <Button variant="outline" onClick={detail.openReopen}>
                <RotateCcw className="size-4" />
                Reopen
              </Button>
            )}
            {canUpdate && detail.canClose && (
              <Button onClick={() => detail.setIsCloseOpen(true)}>
                <CheckCheck className="size-4" />
                Accept &amp; Close
              </Button>
            )}
          </div>
        }
      />

      {detail.isLoading ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : detail.isError || !ticket ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {detail.error instanceof Error
                ? detail.error.message
                : "Couldn't load this ticket."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* The deadline is the one thing worth saying before anything else. */}
          {ticket.isOverdue && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                This ticket is past the response time your plan promised, and is
                still unfinished.
              </span>
            </p>
          )}

          <Card>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2">
              <FormSection
                icon={MessageSquareText}
                title="The Query"
                className="mt-0"
              />

              <DetailItem
                icon={LifeBuoy}
                label="Ticket Code"
                value={ticket.code}
              />
              <DetailItem
                icon={CreditCard}
                label="Help Desk"
                value={ticketTypeLabel(ticket.ticketType)}
              />

              <div className="col-span-full">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subject
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-foreground">
                  {ticket.subject}
                </p>
              </div>

              <div className="col-span-full">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                {/* Whitespace preserved: a reopen appends its reason to this
                    text, so it genuinely is more than one paragraph. */}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {ticket.description}
                </p>
              </div>

              <FormSection icon={Timer} title="Status & Response Time" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="mt-1.5">
                  <SupportStatusBadge status={ticket.status} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Priority
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <SupportPriorityBadge priority={ticket.priority} />
                  {/* Re-graded by the desk. The deadline still belongs to the
                      severity WE raised it with, so both numbers matter. */}
                  {ticket.priority !== ticket.raisedPriority && (
                    <span className="text-xs text-muted-foreground">
                      re-graded from {priorityLabel(ticket.raisedPriority)}, which
                      is what priced the deadline
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Deadline
                </p>
                <div className="mt-1.5">
                  {due ? (
                    <SupportDueBadge ticket={ticket} label={due} />
                  ) : (
                    <p className="text-sm font-semibold text-foreground">
                      {asMoment(ticket.dueAt) ?? 'No response time promised'}
                    </p>
                  )}
                </div>
              </div>

              <DetailItem
                icon={Clock}
                label="Promised Response"
                value={
                  sla
                    ? `${sla}${ticket.planName ? ` — ${ticket.planName} plan` : ''}`
                    : 'Your plan states none for this desk at this priority'
                }
              />
              <DetailItem
                icon={CalendarClock}
                label="Due At"
                value={asMoment(ticket.dueAt)}
              />
              <DetailItem
                icon={Clock}
                label="First Picked Up"
                value={asMoment(ticket.firstResponseAt)}
              />

              <FormSection icon={CircleCheck} title="Resolution" />

              {ticket.resolutionNote ? (
                <div className="col-span-full">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    What the desk did
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                    {ticket.resolutionNote}
                  </p>
                </div>
              ) : (
                <p className="col-span-full text-sm text-muted-foreground">
                  Not resolved yet. The desk records what it did here when it
                  answers.
                </p>
              )}

              <DetailItem
                icon={CircleCheck}
                label="Resolved At"
                value={asMoment(ticket.resolvedAt)}
              />
              <DetailItem
                icon={CheckCheck}
                label="Closed At"
                value={asMoment(ticket.closedAt)}
              />

              <FormSection icon={UserRound} title="Raised By" />

              <DetailItem
                icon={UserRound}
                // A ticket belongs to the organization, so this may well be a
                // colleague rather than the person reading the screen.
                label="Raised By"
                value={ticket.raisedByName}
              />
              <DetailItem
                icon={CalendarClock}
                label="Raised At"
                value={asMoment(ticket.createdAt)}
              />
              <DetailItem
                icon={CalendarClock}
                label="Last Updated"
                value={asMoment(ticket.updatedAt)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <SupportTicketReopenDialog
        ticket={ticket ?? null}
        open={detail.isReopenOpen}
        onOpenChange={detail.setIsReopenOpen}
        reason={detail.reopenReason}
        onReasonChange={detail.setReopenReason}
        onConfirm={detail.confirmReopen}
        loading={detail.isReopening}
      />

      <ConfirmDialog
        open={detail.isCloseOpen}
        onOpenChange={detail.setIsCloseOpen}
        icon={CheckCheck}
        title="Close this ticket?"
        description={
          ticket
            ? `Closing ${ticket.code} accepts the desk's resolution and files it away. Nothing is deleted, and you can still reopen it later if the fix does not hold.`
            : undefined
        }
        confirmLabel="Close ticket"
        cancelLabel="Cancel"
        loading={detail.isClosing}
        keepOpenOnConfirm
        onConfirm={detail.confirmClose}
      />
    </div>
  )
}
