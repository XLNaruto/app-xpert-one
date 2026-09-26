import type { ReactNode } from 'react'
import { CalendarClock, Clock, Loader2, PiggyBank } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { ScheduledSwitch, SwitchRequest } from '../types'

/** A tinted strip with an icon, a sentence and an optional action. */
function Banner({
  icon: Icon,
  tone,
  children,
  action,
}: {
  icon: typeof Clock
  tone: 'primary' | 'warning' | 'success'
  children: ReactNode
  action?: ReactNode
}) {
  const tones = {
    primary: 'border-primary/25 bg-primary/5 text-primary',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    success: 'border-success/30 bg-success/10 text-success',
  }
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        tones[tone],
      )}
    >
      <p className="flex items-start gap-2 text-sm">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span className="text-foreground">{children}</span>
      </p>
      {action}
    </div>
  )
}

/**
 * The account's plan changes in flight: a booked `next_renewal` switch (with
 * its Cancel), a request waiting on the super admin (with its Withdraw), and
 * any stored credit. Each renders only when there's something to say. The
 * action buttons are omitted when the user can't manage billing.
 */
export function PlanChangeBanners({
  scheduledSwitch,
  pendingRequest,
  creditBalance,
  onCancelSwitch,
  onWithdrawRequest,
  isCancelling,
  isWithdrawing,
}: {
  scheduledSwitch: ScheduledSwitch | null
  pendingRequest: SwitchRequest | null
  creditBalance: number
  onCancelSwitch?: () => void
  onWithdrawRequest?: () => void
  isCancelling?: boolean
  isWithdrawing?: boolean
}) {
  if (!scheduledSwitch && !pendingRequest && creditBalance <= 0) return null

  return (
    <div className="space-y-3">
      {scheduledSwitch && (
        <Banner
          icon={CalendarClock}
          tone="primary"
          action={
            onCancelSwitch && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCancelSwitch}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2 className="size-3.5 animate-spin" />}
                Cancel change
              </Button>
            )
          }
        >
          <strong>{scheduledSwitch.planName ?? `Plan #${scheduledSwitch.planId}`}</strong> (
          {scheduledSwitch.isYearly ? 'yearly' : 'monthly'}) starts on{' '}
          <strong>{formatDate(scheduledSwitch.startsAt)}</strong>. Until then your account
          is held to the smaller of the two plans' limits.
        </Banner>
      )}

      {pendingRequest && (
        <Banner
          icon={Clock}
          tone="warning"
          action={
            onWithdrawRequest && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onWithdrawRequest}
                disabled={isWithdrawing}
              >
                {isWithdrawing && <Loader2 className="size-3.5 animate-spin" />}
                Withdraw
              </Button>
            )
          }
        >
          Request pending: <strong>{pendingRequest.planName ?? `Plan #${pendingRequest.planId}`}</strong>{' '}
          ({pendingRequest.isYearly ? 'yearly' : 'monthly'}
          {pendingRequest.extendType === 'next_renewal'
            ? ', at next renewal'
            : pendingRequest.extendType === 'immediately'
              ? ', switch now'
              : ''}
          ), sent {formatDate(pendingRequest.createdAt)}. Waiting for approval.
        </Banner>
      )}

      {creditBalance > 0 && (
        <Banner icon={PiggyBank} tone="success">
          You have <strong>{formatCurrency(creditBalance)}</strong> in stored credit. It's
          used automatically on your next plan change.
        </Banner>
      )}
    </div>
  )
}
