import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Info,
  LayoutGrid,
  Loader2,
  Send,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  formatRupeesExact,
  groupAccessChangeByModule,
  secondsToDays,
} from '../lib/billing-mappers'
import { SWITCH_REQUEST_NOTE_MAX } from '../constants'
import type { PlanSwitchFlow } from '../hooks/use-plan-switch-flow'
import type {
  AccessChangeItem,
  AccessChangeModule,
  ExtendType,
  SwitchSummary,
} from '../types'

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
          caption={summary.current ? 'To' : 'New Plan'}
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
        <MoneyRow label="New Plan Price" value={summary.price} />
        {summary.prorationUsed > 0 && (
          <MoneyRow label="Credit from Current Plan" value={summary.prorationUsed} sign="−" />
        )}
        <MoneyRow label="Actual Amount" value={summary.amountBeforeDiscount} strong />
        {summary.discount > 0 && (
          <MoneyRow label="Discount" value={summary.discount} sign="−" />
        )}
        {summary.creditBalanceUsed > 0 && (
          <MoneyRow
            label={isEstimate ? 'Stored Credit Used (Estimate)' : 'Stored Credit Used'}
            value={summary.creditBalanceUsed}
            sign="−"
          />
        )}
        <MoneyRow label="Amount to Pay" value={summary.amountDue} strong />
        {summary.creditSurplus > 0 && (
          <MoneyRow
            label="Credit Saved for Later"
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

/** One module's lost screens — collapsed, it previews which screens they are. */
function AccessModuleGroup({
  group,
  defaultOpen,
}: {
  group: AccessChangeModule
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const screenNames = group.screens.map((screen) => screen.name ?? 'Module Access')

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
          <LayoutGrid className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {group.module}
          </span>
          {!open && (
            <span className="block truncate text-xs text-muted-foreground">
              {screenNames.join(' · ')}
            </span>
          )}
        </span>
        <Badge variant="destructive" className="shrink-0 tabular-nums">
          {group.count} {group.count === 1 ? 'permission' : 'permissions'}
        </Badge>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {group.screens.map((screen) => (
            <li
              key={screen.name ?? ''}
              className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <span
                className={cn(
                  'min-w-0 text-xs font-medium sm:pt-0.5',
                  screen.name ? 'text-foreground' : 'italic text-muted-foreground',
                )}
              >
                {screen.name ?? 'Module Access'}
              </span>
              <span className="flex flex-wrap gap-1 sm:max-w-[60%] sm:justify-end">
                {screen.actions.map((action) => (
                  <span
                    key={action}
                    className="rounded-md border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 text-[11px] font-medium text-destructive"
                  >
                    {action}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The target plan drops screens the account has today — what goes, module by
 * module, and the tick the owner must give before Confirm unlocks.
 */
function AccessReductionWarning({
  removed,
  acknowledged,
  disabled,
  onAcknowledgedChange,
}: {
  removed: AccessChangeItem[]
  acknowledged: boolean
  disabled: boolean
  onAcknowledgedChange: (acknowledged: boolean) => void
}) {
  const groups = useMemo(() => groupAccessChangeByModule(removed), [removed])
  // One module is shown open; several start folded so the list stays scannable.
  const openByDefault = groups.length === 1

  return (
    <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            You will lose access to {removed.length}{' '}
            {removed.length === 1 ? 'permission' : 'permissions'} in {groups.length}{' '}
            {groups.length === 1 ? 'module' : 'modules'}
          </p>
          <p className="text-xs text-muted-foreground">
            Your team won't be able to use these on the new plan.
          </p>
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {groups.map((group) => (
          <AccessModuleGroup key={group.module} group={group} defaultOpen={openByDefault} />
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 border-t border-warning/30 pt-3">
        {/* A white box in both themes, so the unticked state reads on the warning tint. */}
        <Checkbox
          className="mt-0.5 border-warning/60 bg-white"
          checked={acknowledged}
          disabled={disabled}
          onChange={(event) => onAcknowledgedChange(event.target.checked)}
        />
        <span className="text-sm text-foreground">
          I understand my team will lose access to the permissions listed above.
        </span>
      </label>
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
    isAccessReduced,
    accessReductionAcknowledged,
    setAccessReductionAcknowledged,
    canConfirm,
    confirm,
    isSubmitting,
  } = flow

  if (!plan) return null

  const isRequest = kind === 'request'
  const confirmLabel = isRequest
    ? 'Send Request'
    : extendType === 'next_renewal' && hasRunningPlan
      ? 'Book Change'
      : 'Confirm Switch'

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
              ? 'Your Request Goes to Our Team for Approval. Nothing Changes Until It Is Approved.'
              : 'Review the Price Below, Then Confirm to Change Your Plan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>Billing Cycle</Label>
            <BillingCycleToggle yearly={isYearly} onChange={setIsYearly} savingsPercent={null} />
          </div>

          {/* With no running plan there's nothing to time against — it starts now. */}
          {hasRunningPlan && (
            <div className="space-y-2">
              <Label>When Should It Start?</Label>
              <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TimingOption
                  value="immediately"
                  selected={extendType === 'immediately'}
                  icon={Zap}
                  title="Switch Now"
                  description="Starts a Fresh Term Today. Unused Time on Your Current Plan Is Credited."
                  onSelect={setExtendType}
                />
                <TimingOption
                  value="next_renewal"
                  selected={extendType === 'next_renewal'}
                  disabled={!nextRenewalAllowed}
                  icon={CalendarClock}
                  title="At Next Renewal"
                  description={
                    nextRenewalAllowed
                      ? 'Your Current Plan Runs to Its End, Then the New One Starts at Full Price.'
                      : 'Not Available — Your Current Plan Has No End Date or Is Set to Cancel.'
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

          {!isSameAsCurrent &&
            !previewError &&
            displayedSummary?.accessChange?.isReduced && (
              <AccessReductionWarning
                removed={displayedSummary.accessChange.removed}
                acknowledged={accessReductionAcknowledged}
                // A kept-previous quote's list can show, but only the current
                // one's can be agreed to.
                disabled={!isAccessReduced || isSubmitting}
                onAcknowledgedChange={setAccessReductionAcknowledged}
              />
            )}

          {isRequest && (
            <div className="space-y-2">
              <Label htmlFor="switch-request-note">Note (Optional)</Label>
              <Textarea
                id="switch-request-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything Our Team Should Know, e.g. When You Need It By"
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
