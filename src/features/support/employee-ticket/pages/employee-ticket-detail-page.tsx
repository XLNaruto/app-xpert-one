import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Clock,
  HandHelping,
  MessagesSquare,
  Tags,
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
import { PERMISSIONS, useCan } from '@/features/permissions'
import { useEmployeeTicketDetail } from '../hooks/use-employee-ticket-detail'
import { ageLabel, categoryLabel, employeeLabel } from '../lib/employee-ticket-mappers'
import {
  EmployeeTicketCategoryBadge,
  EmployeeTicketPriorityBadge,
  EmployeeTicketStatusBadge,
} from '../components/employee-ticket-badges'
import { EmployeeTicketAttachment } from '../components/employee-ticket-attachment'
import { EmployeeTicketThread } from '../components/employee-ticket-thread'
import { EmployeeTicketReplyForm } from '../components/employee-ticket-reply-form'
import { EmployeeTicketResolveDialog } from '../components/employee-ticket-resolve-dialog'

/** A stored timestamp as text, or nothing when the event hasn't happened. */
const asMoment = (value: string | null | undefined) =>
  value ? formatDateTime(value) : null

/**
 * One employee query and its whole conversation.
 *
 * The office has three moves here, and they are not the same act: **replying**
 * keeps talking (and, the first time, picks the ticket up on its own),
 * **resolving** answers it and pushes the note to the employee's device, and
 * **closing** files an already-resolved ticket away. Which of them are offered
 * comes from the ticket's own status — the rest would be a 409.
 *
 * The record id arrives encrypted in the `?data=` search param.
 */
export function EmployeeTicketDetailPage({ data }: { data?: string }) {
  const detail = useEmployeeTicketDetail(decryptId(data))
  const { ticket } = detail

  /** Every action on this screen is a write — replying, or moving the status. */
  const { can } = useCan()
  const canWrite = can(`${PERMISSIONS.employeeHelpdesk}:update`)

  if (detail.isForbidden) return <Forbidden description={detail.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title={ticket ? `Ticket ${ticket.code}` : 'Employee Ticket'}
        description="A query one of your employees raised from the app, and the conversation about it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={detail.goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {canWrite && detail.canPickUp && (
              <Button
                variant="outline"
                onClick={detail.onPickUp}
                disabled={detail.isTransitioning}
              >
                <HandHelping className="size-4" />
                Pick Up
              </Button>
            )}
            {canWrite && detail.canResolve && (
              <Button onClick={() => detail.setIsResolveOpen(true)}>
                <CircleCheck className="size-4" />
                Resolve
              </Button>
            )}
            {canWrite && detail.canClose && (
              <Button onClick={() => detail.setIsCloseOpen(true)}>
                <CheckCheck className="size-4" />
                Close
              </Button>
            )}
          </div>
        }
      />

      {detail.isLoading ? (
        <div className="space-y-5">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
          <Skeleton className="h-64 w-full" />
        </div>
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
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2">
              <FormSection
                icon={MessagesSquare}
                title="The Query"
                className="mt-0"
              />

              <div className="col-span-full flex flex-wrap items-center gap-2">
                <EmployeeTicketStatusBadge status={ticket.status} />
                <EmployeeTicketPriorityBadge priority={ticket.priority} />
                <EmployeeTicketCategoryBadge category={ticket.category} />
                <span className="text-xs text-muted-foreground">
                  Raised {ageLabel(ticket.ageDays).toLowerCase()} ·{' '}
                  {ticket.messageCount} message
                  {ticket.messageCount === 1 ? '' : 's'}
                </span>
              </div>

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
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {ticket.description}
                </p>
                {/* What they raised it WITH — a payslip, a screenshot. */}
                {ticket.attachmentUrl && (
                  <EmployeeTicketAttachment attachmentKey={ticket.attachmentUrl} />
                )}
              </div>

              <FormSection icon={UserRound} title="Who Raised It" />

              <DetailItem
                icon={UserRound}
                label="Employee"
                value={employeeLabel(ticket)}
              />
              <DetailItem
                icon={Building2}
                label="Company"
                value={ticket.companyName}
              />
              <DetailItem
                icon={Tags}
                label="Category"
                value={categoryLabel(ticket.category)}
              />
              <DetailItem
                icon={CalendarClock}
                label="Raised At"
                value={asMoment(ticket.createdAt)}
              />
              <DetailItem
                icon={Clock}
                // Stamped by the first office reply and never moved — it's what
                // makes response time reportable without walking the thread.
                label="First Replied"
                value={asMoment(ticket.firstResponseAt) ?? 'Not answered yet'}
              />
              <DetailItem
                icon={CalendarClock}
                label="Last Updated"
                value={asMoment(ticket.updatedAt)}
              />

              <FormSection icon={CircleCheck} title="Resolution" />

              {ticket.resolutionNote ? (
                <div className="col-span-full">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    What was done
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                    {ticket.resolutionNote}
                  </p>
                </div>
              ) : (
                <p className="col-span-full text-sm text-muted-foreground">
                  Not resolved yet. Resolving pushes your note to the employee,
                  who then accepts it or reopens the ticket.
                </p>
              )}

              <DetailItem
                icon={UserRound}
                // There's no assignee on this desk — whoever answered is the
                // only record of who worked it.
                label="Resolved By"
                value={ticket.resolvedByName}
              />
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 pt-6">
              <FormSection
                icon={MessagesSquare}
                title="Conversation"
                description="The whole thread, oldest first. Your replies are pushed to the employee's device."
                className="mt-0"
              />

              <EmployeeTicketThread messages={detail.messages} />

              {canWrite ? (
                <div className="border-t pt-5">
                  <EmployeeTicketReplyForm
                    form={detail.replyForm}
                    error={detail.replyError}
                    onSubmit={detail.onReply}
                    attachment={detail.attachment}
                    onAttachmentChange={detail.setAttachment}
                    isPending={detail.isReplying}
                    disabled={!detail.canReply}
                  />
                </div>
              ) : (
                <p className="border-t pt-5 text-sm text-muted-foreground">
                  You can read this thread but not reply to it.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <EmployeeTicketResolveDialog
        code={ticket?.code}
        open={detail.isResolveOpen}
        onOpenChange={detail.setIsResolveOpen}
        form={detail.resolveForm}
        error={detail.resolveError}
        onConfirm={detail.onResolve}
        loading={detail.isTransitioning}
      />

      <ConfirmDialog
        open={detail.isCloseOpen}
        onOpenChange={detail.setIsCloseOpen}
        icon={CheckCheck}
        title="Close this ticket?"
        description={
          ticket
            ? `${ticket.code} is filed away. The resolution and its author stay intact, and the employee is not notified again — they were told when it was resolved. Nothing is deleted.`
            : undefined
        }
        confirmLabel="Close ticket"
        cancelLabel="Cancel"
        loading={detail.isTransitioning}
        keepOpenOnConfirm
        onConfirm={detail.onClose}
      />
    </div>
  )
}
