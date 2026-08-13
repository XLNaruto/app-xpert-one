import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  Layers,
  Paperclip,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { usePagination } from '@/hooks/use-pagination'
import { useMediaResolver } from '@/hooks/use-media-url'
import { formatAmount } from '@/lib/currency'
import { cn, formatDate } from '@/lib/utils'
import { usePaymentBatch } from '../api/use-payment-history'
import { BATCH_EMPLOYEE_PAGE_SIZE } from '../constants'
import type { PaymentBatchCard as BatchCard } from '../types'

interface PaymentBatchCardProps {
  card: BatchCard
  open: boolean
  onToggle: () => void
}

/**
 * One recorded payment batch, collapsed to what identifies it and expandable to
 * who it paid and against what proof.
 *
 * The expansion is a **second request**, made only when a card is actually
 * opened: the history shows a dozen cards, a batch may hold five hundred
 * employees, and nobody opens all of them.
 *
 * "Batch #1" is the list *position* the endpoint computed, continued across
 * pages — not a stored number and not an identifier. Anything addressing this
 * batch uses its id, which is why the position is printed and never sent.
 */
export function PaymentBatchCard({ card, open, onToggle }: PaymentBatchCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'grid w-full cursor-pointer gap-x-6 gap-y-4 px-4 py-3.5 text-left transition-colors hover:bg-accent/40',
          'lg:grid-cols-[minmax(12rem,auto)_1fr_auto] lg:items-center',
          open && 'bg-accent/30',
        )}
      >
        {/* Which batch, and who filed it. */}
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-foreground">
              Batch #{card.batchNumber}
            </span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              {formatDate(card.recordedAt, 'dd MMM yyyy, hh:mm a')}
              {card.recordedBy ? ` · ${card.recordedBy}` : ''}
            </span>
          </span>
        </span>

        {/*
          The four facts on one baseline grid rather than floated side by side.
          Every label sits in the same row and every value in the next, so a
          column of cards can be read straight down — batch to batch — instead of
          re-finding each figure in a layout that shifts with its own text width.
        */}
        <span className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Fact icon={CalendarDays} label="Payment Date">
            {formatDate(card.paymentDate)}
          </Fact>
          <Fact icon={CreditCard} label="Mode">
            {card.paymentMode}
          </Fact>
          <Fact icon={UsersRound} label="Employees">
            {card.totalEmployees}
          </Fact>
          <Fact icon={Paperclip} label="Documents" muted={card.documentCount === 0}>
            {/* A zero is "none filed", not a count worth reading as one. */}
            {card.documentCount || 'None'}
          </Fact>
        </span>

        <span className="flex items-center justify-between gap-4 lg:justify-end">
          <span className="text-left lg:text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total Paid
            </span>
            <span className="block font-heading text-lg font-semibold leading-tight tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatAmount(card.totalAmount)}
            </span>
          </span>
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform',
              open && 'rotate-180 border-primary/40 text-primary',
            )}
          >
            <ChevronDown className="size-4" />
          </span>
        </span>
      </button>

      {open && <BatchBody id={card.id} />}
    </div>
  )
}

/**
 * One header fact: a labelled figure, the label always above the value.
 *
 * The icon sits beside the *label* rather than beside the two-line stack, which
 * is what keeps the values themselves on one baseline across all four cells.
 */
function Fact({
  icon: Icon,
  label,
  muted = false,
  children,
}: {
  icon: typeof CalendarDays
  label: string
  /** Draws the value as an absence — a zero count rather than a figure. */
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'mt-0.5 block truncate text-sm font-medium leading-tight tabular-nums',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {children}
      </span>
    </span>
  )
}

/**
 * The expanded card: the proof documents, then the employees the batch settled.
 *
 * The employees page inside the card — the endpoint pages them for the same
 * reason, a batch may hold five hundred — so the card owns its own pagination
 * rather than sharing the history screen's.
 */
function BatchBody({ id }: { id: number }) {
  const { params, limit, offset, onPaginationChange } = usePagination(
    BATCH_EMPLOYEE_PAGE_SIZE,
  )
  const batch = usePaymentBatch(id, params)
  const resolveMedia = useMediaResolver()

  if (batch.isLoading) {
    return (
      <p className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Loading the batch…
      </p>
    )
  }

  if (batch.isError || !batch.data) {
    return (
      <p className="border-t border-border px-4 py-6 text-center text-sm text-destructive">
        {batch.error instanceof Error
          ? batch.error.message
          : "Couldn't load the payment batch."}
      </p>
    )
  }

  const { documents, employees } = batch.data
  const total = employees.total
  const shown = offset + employees.items.length
  const canPrev = offset > 0
  const canNext = shown < total

  return (
    <div className="border-t border-border">
      {documents.length > 0 && (
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payment Documents
          </p>
          <div className="flex flex-wrap gap-2">
            {documents.map((document) => (
              <a
                key={document.id}
                href={resolveMedia(document.key)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-64 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{document.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/*
        The employees as a two-column ledger rather than floated figures: the
        amounts are right-aligned in fixed columns under their own headings, so
        a batch of fifty reads as a column of money instead of fifty separate
        "Gross … Net …" sentences.
      */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/10 px-4 py-2">
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Employee
        </span>
        <span className="w-28 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Gross Pay
        </span>
        <span className="w-28 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Net Pay
        </span>
      </div>

      <ul className="divide-y divide-border">
        {employees.items.map((employee) => (
          <li
            key={employee.salaryId}
            className="flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-accent/30"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-tight text-foreground">
                  {employee.employeeName || '—'}
                </span>
                {employee.employeeCode && (
                  <span className="block font-mono text-[11px] leading-tight text-muted-foreground">
                    {employee.employeeCode}
                  </span>
                )}
              </span>
            </span>
            <span className="w-28 shrink-0 text-right text-sm tabular-nums text-foreground">
              {formatAmount(employee.grossPay)}
            </span>
            <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatAmount(employee.netPay)}
            </span>
          </li>
        ))}
      </ul>

      {total > limit && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}–{shown} of {total}
          </p>
          <div className="flex items-center gap-2">
            <PagerButton
              disabled={!canPrev}
              onClick={() =>
                onPaginationChange({ limit, offset: Math.max(0, offset - limit) })
              }
            >
              Previous
            </PagerButton>
            <PagerButton
              disabled={!canNext}
              onClick={() => onPaginationChange({ limit, offset: offset + limit })}
            >
              Next
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  )
}

function PagerButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
