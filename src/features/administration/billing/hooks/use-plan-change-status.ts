import { useCallback, useState } from 'react'
import { toastApiError } from '@/lib/api-toast'
import { toastsuccessmsg } from '@/lib/toast'
import {
  useBillingCredits,
  useCancelScheduledSwitch,
  usePendingSwitchRequest,
  useWithdrawSwitchRequest,
} from '../api/use-plan-switch'

/**
 * What's in motion on the account's plan: a `next_renewal` switch already
 * booked, a request waiting on the super admin, and the stored credit earlier
 * switches left behind — plus the two ways to back out (cancel the booking,
 * withdraw the request), each behind its own confirmation.
 */
export function usePlanChangeStatus() {
  const pending = usePendingSwitchRequest()
  // The balance is all the screen shows, so one ledger row is plenty.
  const credits = useBillingCredits({ limit: 1, offset: 0 })
  const cancelSwitch = useCancelScheduledSwitch()
  const withdraw = useWithdrawSwitchRequest()

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false)

  const cancelScheduledSwitch = useCallback(async () => {
    try {
      await cancelSwitch.mutateAsync()
      toastsuccessmsg('The booked plan change was cancelled.', 3000)
      setConfirmCancelOpen(false)
    } catch (error) {
      toastApiError(error, "Couldn't cancel the booked plan change.")
    }
  }, [cancelSwitch])

  const withdrawRequest = useCallback(async () => {
    try {
      await withdraw.mutateAsync()
      toastsuccessmsg('Your plan change request was withdrawn.', 3000)
      setConfirmWithdrawOpen(false)
    } catch (error) {
      toastApiError(error, "Couldn't withdraw your plan change request.")
    }
  }, [withdraw])

  return {
    pendingRequest: pending.data ?? null,
    creditBalance: credits.data?.balance ?? 0,

    confirmCancelOpen,
    setConfirmCancelOpen,
    cancelScheduledSwitch,
    isCancelling: cancelSwitch.isPending,

    confirmWithdrawOpen,
    setConfirmWithdrawOpen,
    withdrawRequest,
    isWithdrawing: withdraw.isPending,
  }
}
