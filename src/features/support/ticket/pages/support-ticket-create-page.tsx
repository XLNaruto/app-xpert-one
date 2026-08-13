import { AlertCircle, ArrowLeft, Flame, LifeBuoy, Lock, MessageSquareText } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  SUPPORT_PRIORITY_OPTIONS,
  SUPPORT_TICKET_TYPE_OPTIONS,
} from '../constants'
import { MAX_SUPPORT_DESCRIPTION, MAX_SUPPORT_SUBJECT } from '../schemas'
import { priorityLabel, ticketTypeLabel } from '../lib/support-ticket-mappers'
import { useSupportTicketForm } from '../hooks/use-support-ticket-form'

interface SupportTicketCreatePageProps {
  /**
   * Encrypted ticket id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh ticket.
   */
  data?: string
}

/**
 * Raise / Edit Ticket.
 *
 * The desk and the severity are a ONE-TIME choice: together they select the cell
 * of your plan's support promise that becomes this ticket's deadline. Neither
 * can be changed afterwards, so on edit both are shown locked and only the
 * wording moves — a ticket filed against the wrong desk is replaced, not amended.
 *
 * The edit window closes entirely once the desk picks the ticket up, which the
 * page states plainly instead of offering a form that would answer 409.
 */
export function SupportTicketCreatePage({ data }: SupportTicketCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const ticketId = decryptId(data)

  const form = useSupportTicketForm(ticketId)
  const readOnly = form.isLocked

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit Ticket' : 'Raise a Ticket'}
        description={
          form.isEdit
            ? 'Only the wording can be corrected, and only until the desk picks the ticket up. The desk and the priority set the deadline, so neither can change.'
            : 'Tell the help desk what is wrong. The desk you pick and how urgent you mark it decide the response time your plan promises.'
        }
        actions={
          <Button variant="outline" onClick={form.goToList}>
            <ArrowLeft className="size-4" />
            Back to Tickets
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {form.isLoading ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : form.isError ? (
            <p className="text-sm text-destructive">
              {form.loadError instanceof Error
                ? form.loadError.message
                : "Couldn't load this ticket."}
            </p>
          ) : (
            <form onSubmit={form.onSubmit} noValidate className="space-y-5">
              {readOnly && (
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                  <Lock className="mt-0.5 size-4 shrink-0" />
                  <span>
                    The desk has already picked this ticket up, so the wording is
                    fixed. Rewriting the question under someone who has started
                    answering it is how a resolution ends up addressing something
                    the ticket no longer says — reply on the ticket instead, or
                    raise a new one.
                  </span>
                </p>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <FormSection
                  icon={LifeBuoy}
                  title="Which desk, and how urgent"
                  description="These two together select the response time your subscription promises. They are fixed once the ticket is raised, so pick honestly — a severity marked up buys a shorter deadline and a poor record."
                  className="mt-0"
                />

                <Field
                  label="Help Desk"
                  required
                  hint="Technical is the product itself; Billing is your subscription and invoices."
                  error={form.errors.ticketType?.message}
                >
                  {/* Locked on edit: this half of the SLA lookup is spent. Shown
                      as a read-only box rather than a dropdown that would only
                      have its pick rejected. */}
                  {form.isTypeLocked ? (
                    <Input readOnly value={ticketTypeLabel(form.ticketType)} />
                  ) : (
                    <Combobox
                      options={SUPPORT_TICKET_TYPE_OPTIONS}
                      value={form.ticketType}
                      onChange={form.setTicketType}
                      searchable={false}
                      placeholder="Pick a desk"
                    />
                  )}
                </Field>

                <Field
                  label="Priority"
                  required
                  hint="How badly it hurts. This is kept forever as the severity you raised the ticket with, even if the desk re-grades it later."
                  error={form.errors.priority?.message}
                >
                  {form.isTypeLocked ? (
                    <Input readOnly value={priorityLabel(form.priority)} />
                  ) : (
                    <Combobox
                      options={SUPPORT_PRIORITY_OPTIONS}
                      value={form.priority}
                      onChange={form.setPriority}
                      searchable={false}
                      placeholder="Pick a priority"
                    />
                  )}
                </Field>

                {form.isTypeLocked && (
                  <p className="col-span-full flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      The desk and the priority priced this ticket's deadline, so
                      they cannot be changed. If either is wrong, raise a new
                      ticket.
                    </span>
                  </p>
                )}

                <FormSection
                  icon={MessageSquareText}
                  title="The query"
                  description="A ticket names no company, so say which one it is about if that matters."
                />

                <Field
                  label="Subject"
                  required
                  className="col-span-full"
                  error={form.errors.subject?.message}
                >
                  <Input
                    maxLength={MAX_SUPPORT_SUBJECT}
                    readOnly={readOnly}
                    placeholder="One line naming the problem"
                    {...form.form.register('subject')}
                  />
                </Field>

                <Field
                  label="Description"
                  required
                  className="col-span-full"
                  error={form.errors.description?.message}
                >
                  <Textarea
                    rows={8}
                    maxLength={MAX_SUPPORT_DESCRIPTION}
                    readOnly={readOnly}
                    placeholder="What happened, what you expected, and anything the desk needs to reproduce it."
                    {...form.form.register('description')}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" onClick={form.goToList}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.isPending || readOnly}>
                  <Flame className="size-4" />
                  {form.isEdit ? 'Save Changes' : 'Raise Ticket'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
