import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useWithdrawSettingChange } from '../api/use-company-settings-mutations'
import type { SettingChange } from '../types'

/**
 * The Withdraw flow, shared by the form's notices and the History tab: pick a
 * SCHEDULED change, confirm, DELETE it. The mutation refreshes both reads.
 */
export function useSettingChangeWithdraw() {
  const withdraw = useWithdrawSettingChange()
  const [pending, setPending] = useState<SettingChange | null>(null)

  const confirm = () => {
    if (!pending) return
    withdraw.mutate(pending.id, {
      onSuccess: (message) => {
        toast.success(message)
        setPending(null)
      },
      // A 409 ("already in effect" / "already withdrawn") is worded for the user.
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Couldn't withdraw the change."))
        setPending(null)
      },
    })
  }

  return {
    pending,
    request: setPending,
    cancel: () => setPending(null),
    confirm,
    isWithdrawing: withdraw.isPending,
  }
}
