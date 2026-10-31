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
            ? 'Only the Wording Can Be Corrected, and Only Until the Desk Picks the Ticket Up. The Desk and the Priority Set the Deadline, So Neither Can Change.'
            : 'Tell the Help Desk What Is Wrong. The Desk You Pick and How Urgent You Mark It Decide the Response Time Your Plan Promises.'
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
                : "Couldn't Load This Ticket."}
            </p>
          ) : (
            <form onSubmit={form.onSubmit} noValidate className="space-y-5">
              {readOnly && (
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                  <Lock className="mt-0.5 size-4 shrink-0" />
                  <span>
                    The Desk Has Already Picked This Ticket Up, So the Wording Is
                    Fixed. Rewriting the Question Under Someone Who Has Started
                    Answering It Is How a Resolution Ends up Addressing Something
                    the Ticket No Longer Says — Reply on the Ticket Instead, or
                    Raise a New One.
                  </span>
                </p>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <FormSection
                  icon={LifeBuoy}
                  title="Which Desk, and How Urgent"
                  description="These Two Together Select the Response Time Your Subscription Promises. They Are Fixed Once the Ticket Is Raised, So Pick Honestly — A Severity Marked up Buys a Shorter Deadline and a Poor Record."
                  className="mt-0"
                />

                {/* Desk, sub-category and priority share one row on a three-column grid. */}
                <div className="col-span-full grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label="Help Desk"
                    required
                    hint="Technical Is the Product Itself; Billing Is Your Subscription and Invoices."
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
                        placeholder="Pick a Desk"
                      />
                    )}
                  </Field>

                  {/* Drawn from the chosen desk's own list — switching desk clears
                      it. Fixed on edit like the desk, so shown by name. */}
                  <Field
                    label="Sub-Category"
                    hint="Optional. Narrows down What the Query Is About — Each Desk Has Its Own List."
                    error={
                      form.errors.subCategoryId?.message ??
                      (form.subCategoriesError instanceof Error
                        ? form.subCategoriesError.message
                        : undefined)
                    }
                  >
                    {form.isTypeLocked ? (
                      <Input readOnly value={form.ticket?.subCategoryName ?? 'None'} />
                    ) : (
                      <Combobox
                        options={form.subCategoryOptions}
                        value={form.subCategoryId}
                        onChange={form.setSubCategoryId}
                        loading={form.isSubCategoriesLoading}
                        clearable
                        placeholder="Pick a Sub-category"
                        searchPlaceholder="Search Sub-categories…"
                      />
                    )}
                  </Field>

                  <Field
                    label="Priority"
                    required
                    hint="How Badly It Hurts. This Is Kept Forever as the Severity You Raised the Ticket With, Even If the Desk Re-grades It Later."
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
                        placeholder="Pick a Priority"
                      />
                    )}
                  </Field>
                </div>

                {form.isTypeLocked && (
                  <p className="col-span-full flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      The Desk and the Priority Priced This Ticket's Deadline, So
                      They Cannot Be Changed. If Either Is Wrong, Raise a New
                      Ticket.
                    </span>
                  </p>
                )}

                <FormSection
                  icon={MessageSquareText}
                  title="The Query"
                  description="A Ticket Names No Company, So Say Which One It Is About If That Matters."
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
                    placeholder="One Line Naming the Problem"
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
                    placeholder="What Happened, What You Expected, and Anything the Desk Needs to Reproduce It."
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
