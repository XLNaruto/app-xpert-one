import type { ReactNode } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Info,
  Loader2,
  Send,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn, formatDate } from '@/lib/utils'
import { BillingCycleToggle } from './billing-cycle-toggle'
import { formatRupeesExact, secondsToDays } from '../lib/billing-mappers'
import { SWITCH_REQUEST_NOTE_MAX } from '../constants'
import type { PlanSwitchFlow } from '../hooks/use-plan-switch-flow'
import type { ExtendType, SwitchSummary } from '../types'

/** One timing option — a card-sized radio, since each needs a sentence. */
function TimingOption({
  value,
  selected,
  disabled,
  icon: Icon,
  title,
  description,
  onSelect,
}: {
  value: ExtendType
  selected: boolean
  disabled?: boolean
  icon: typeof Zap
  title: string
  description: string
  onSelect: (value: ExtendType) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(value)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
          : 'border-border hover:bg-accent/50',
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

/** One line of the money breakdown. */
function MoneyRow({
  label,
  value,
  sign,
  strong,
  tone,
}: {
  label: ReactNode
  value: number
  sign?: '−' | '+'
  strong?: boolean
  tone?: 'success'
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 text-sm',
        strong && 'border-t border-border pt-2 font-semibold text-foreground',
      )}
    >
      <span className={cn(!strong && 'text-muted-foreground')}>{label}</span>
      <span className={cn('tabular-nums', tone === 'success' && 'text-success')}>
        {sign ? `${sign} ` : ''}
        {formatRupeesExact(value)}
      </span>
    </div>
  )
}

/** One side of the From → To comparison. */
function PlanSide({
  caption,
  name,
  lines,
}: {
  caption: string
  name: string
  lines: string[]
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {caption}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{name}</p>
      {lines.map((line) => (
        <p key={line} className="text-xs text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  )
}

/** The priced preview: from → to, time used, the money, and whether it fits. */
function SwitchSummaryView({ summary }: { summary: SwitchSummary }) {
  const term = (yearly: boolean) => (yearly ? 'Yearly' : 'Monthly')
  const isEstimate = summary.mode === 'next_renewal'

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-2">
        {summary.current && (
          <>
            <PlanSide
              caption="From"
              name={summary.current.planName ?? `Plan #${summary.current.planId}`}
              lines={[
                `${term(summary.current.isYearly)} · ${formatRupeesExact(summary.current.price)}`,
              ]}
            />
            <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
          </>
        )}
        <PlanSide
          caption={summary.current ? 'To' : 'New plan'}
          name={summary.target.planName ?? `Plan #${summary.target.planId}`}
          lines={[
            `${term(summary.target.isYearly)} · ${formatRupeesExact(summary.target.price)}`,
            `${summary.target.maxEmployees} employees · ${summary.target.maxCompanies} companies`,
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {summary.time && summary.current && (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="font-medium text-foreground">Current plan</p>
            <p className="text-muted-foreground">
              {secondsToDays(summary.time.elapsedSeconds)} days used ·{' '}
              {secondsToDays(summary.time.remainingSeconds)} days left
            </p>
          </div>
        )}
        {(summary.newTerm.start || summary.newTerm.end) && (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="font-medium text-foreground">New term</p>
            <p className="text-muted-foreground">
              {summary.newTerm.start ? formatDate(summary.newTerm.start) : '—'} →{' '}
              {summary.newTerm.end ? formatDate(summary.newTerm.end) : '—'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-border p-3">
        <MoneyRow label="New plan price" value={summary.price} />
        {summary.prorationUsed > 0 && (
          <MoneyRow label="Credit from current plan" value={summary.prorationUsed} sign="−" />
        )}
        <MoneyRow label="Actual amount" value={summary.amountBeforeDiscount} strong />
        {summary.discount > 0 && (
          <MoneyRow label="Discount" value={summary.discount} sign="−" />
        )}
        {summary.creditBalanceUsed > 0 && (
          <MoneyRow
            label={isEstimate ? 'Stored credit used (estimate)' : 'Stored credit used'}
            value={summary.creditBalanceUsed}
            sign="−"
          />
        )}
        <MoneyRow label="Amount to pay" value={summary.amountDue} strong />
        {summary.creditSurplus > 0 && (
          <MoneyRow
            label="Credit saved for later"
            value={summary.creditSurplus}
            sign="+"
            tone="success"
          />
        )}
      </div>

      {isEstimate && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          No credit applies at next renewal — the new plan is charged in full. Stored
          credit is an estimate until the change is applied.
        </p>
      )}

      {!summary.capacity.ok && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="flex items-center gap-1.5 font-semibold">
            <CircleAlert className="size-3.5" />
            This plan is too small for your account
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {summary.capacity.violations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Extend plan / Request plan extend — the picker (term, timing), the priced
 * preview the API returns for it, and the confirm. Presentational: every value
 * and handler comes from `usePlanSwitchFlow`.
 */
export function PlanSwitchDialog({ flow }: { flow: PlanSwitchFlow }) {
  const {
    plan,
    kind,
    isOpen,
    close,
    isYearly,
    setIsYearly,
    extendType,
    setExtendType,
    note,
    setNote,
    noteTooLong,
    hasRunningPlan,
    nextRenewalAllowed,
    isSameAsCurrent,
    displayedSummary,
    isPreviewLoading,
    isPreviewFetching,
    previewError,
    canConfirm,
    confirm,
    isSubmitting,
  } = flow

  if (!plan) return null

  const isRequest = kind === 'request'
  const confirmLabel = isRequest
    ? 'Send request'
    : extendType === 'next_renewal' && hasRunningPlan
      ? 'Book change'
      : 'Confirm switch'

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) close()
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-xl overflow-y-auto"
        onClose={isSubmitting ? undefined : close}
      >
        <DialogHeader>
          <DialogTitle>
            {isRequest ? `Request ${plan.name}` : `Switch to ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            {isRequest
              ? 'Your request goes to our team for approval. Nothing changes until it is approved.'
              : 'Review the price below, then confirm to change your plan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>Billing cycle</Label>
            <BillingCycleToggle yearly={isYearly} onChange={setIsYearly} savingsPercent={null} />
          </div>

          {/* With no running plan there's nothing to time against — it starts now. */}
          {hasRunningPlan && (
            <div className="space-y-2">
              <Label>When should it start?</Label>
              <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TimingOption
                  value="immediately"
                  selected={extendType === 'immediately'}
                  icon={Zap}
                  title="Switch now"
                  description="Starts a fresh term today. Unused time on your current plan is credited."
                  onSelect={setExtendType}
                />
                <TimingOption
                  value="next_renewal"
                  selected={extendType === 'next_renewal'}
                  disabled={!nextRenewalAllowed}
                  icon={CalendarClock}
                  title="At next renewal"
                  description={
                    nextRenewalAllowed
                      ? 'Your current plan runs to its end, then the new one starts at full price.'
                      : 'Not available — your current plan has no end date or is set to cancel.'
                  }
                  onSelect={setExtendType}
                />
              </div>
            </div>
          )}

          <div className="relative">
            {isSameAsCurrent ? (
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                You're already on {plan.name} ({isYearly ? 'yearly' : 'monthly'}). Pick the
                other billing cycle to change it.
              </p>
            ) : previewError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {getApiErrorMessage(previewError, "Couldn't price this plan change.")}
              </p>
            ) : isPreviewLoading || !displayedSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-36 w-full" />
              </div>
            ) : (
              <div className={cn('transition-opacity', isPreviewFetching && 'opacity-60')}>
                <SwitchSummaryView summary={displayedSummary} />
              </div>
            )}
          </div>

          {isRequest && (
            <div className="space-y-2">
              <Label htmlFor="switch-request-note">Note (optional)</Label>
              <Textarea
                id="switch-request-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything our team should know, e.g. when you need it by"
                aria-invalid={noteTooLong || undefined}
              />
              <p
                className={cn(
                  'text-right text-xs',
                  noteTooLong ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {note.trim().length}/{SWITCH_REQUEST_NOTE_MAX}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={!canConfirm}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isRequest ? (
              <Send className="size-4" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
