import { useCallback, useMemo, useState } from 'react'
import { toastApiError } from '@/lib/api-toast'
import { toastsuccessmsg } from '@/lib/toast'
import { formatDate } from '@/lib/utils'
import {
  useCreateSwitchRequest,
  useSwitchPlan,
  useSwitchPreview,
} from '../api/use-plan-switch'
import { SWITCH_REQUEST_NOTE_MAX } from '../constants'
import { canBookNextRenewal } from '../lib/billing-mappers'
import type { ExtendType, Plan, Subscription, SwitchChoice } from '../types'

/**
 * Self-serve switch (`switch`) or a request to the super admin (`request`) — the
 * same picker and the same priced preview, only the last button differs.
 */
export type PlanSwitchKind = 'switch' | 'request'

/**
 * The extend-plan dialog, end to end: which plan, which term, when it starts,
 * what it costs, and the confirm that applies (or requests) it.
 *
 * The preview is re-fetched on every change of plan, term or timing — the API
 * is the only place the proration is worked out, so the screen never guesses a
 * number. With no running plan the timing choice doesn't exist: the switch is
 * `direct`, starts now at full price, and `extend_type` stays off the wire.
 */
export function usePlanSwitchFlow({
  subscription,
}: {
  /** The running subscription; null when the account has none. */
  subscription: Subscription | null
}) {
  const switchPlan = useSwitchPlan()
  const sendRequest = useCreateSwitchRequest()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [kind, setKind] = useState<PlanSwitchKind>('switch')
  const [isYearly, setIsYearly] = useState(false)
  const [extendType, setExtendType] = useState<ExtendType>('immediately')
  const [note, setNote] = useState('')

  /** A trial counts as running — anything the API returned is a running term. */
  const hasRunningPlan = subscription !== null
  const nextRenewalAllowed = canBookNextRenewal(subscription)

  const open = useCallback(
    (target: Plan, nextKind: PlanSwitchKind, yearly: boolean) => {
      setPlan(target)
      setKind(nextKind)
      setIsYearly(yearly)
      // "Switch now" is the safe default: it's always allowed, while
      // next_renewal is refused for an open-ended or cancelling term.
      setExtendType('immediately')
      setNote('')
    },
    [],
  )

  const close = useCallback(() => setPlan(null), [])

  /** Same plan AND same term is the one switch the API always refuses. */
  const isSameAsCurrent =
    plan !== null &&
    subscription !== null &&
    plan.id === subscription.planId &&
    isYearly === subscription.isYearly

  const choice = useMemo<SwitchChoice | null>(
    () =>
      plan && !isSameAsCurrent
        ? {
            planId: plan.id,
            isYearly,
            extendType: hasRunningPlan ? extendType : null,
          }
        : null,
    [plan, isSameAsCurrent, isYearly, hasRunningPlan, extendType],
  )

  const preview = useSwitchPreview(choice)
  // A kept-previous quote belongs to the last choice — it can be shown while
  // the new one loads, but never confirmed.
  const summary = preview.isPlaceholderData ? null : (preview.data ?? null)

  const isSubmitting = switchPlan.isPending || sendRequest.isPending
  const noteTooLong = note.trim().length > SWITCH_REQUEST_NOTE_MAX

  const canConfirm =
    choice !== null &&
    summary !== null &&
    summary.capacity.ok &&
    !preview.isFetching &&
    !isSubmitting &&
    !(kind === 'request' && noteTooLong)

  const confirm = useCallback(async () => {
    if (!choice || !plan) return

    try {
      if (kind === 'request') {
        await sendRequest.mutateAsync({ ...choice, note })
        toastsuccessmsg('Request sent — waiting for approval.', 3000)
      } else {
        const result = await switchPlan.mutateAsync(choice)
        const name = result.summary.target.planName ?? plan.name
        const startsAt = result.subscription.scheduledSwitch?.startsAt
        toastsuccessmsg(
          result.outcome === 'scheduled'
            ? `${name} will start on ${startsAt ? formatDate(startsAt) : 'your next renewal'}.`
            : `You are now on ${name}.`,
          4000,
        )
      }
      setPlan(null)
    } catch (error) {
      // The server's messages are written for end users — shown as is, and the
      // dialog stays open so the choice can be adjusted and retried.
      toastApiError(
        error,
        kind === 'request'
          ? "Couldn't send your plan change request."
          : "Couldn't change your plan.",
      )
      preview.refetch()
    }
  }, [choice, kind, note, plan, preview, sendRequest, switchPlan])

  return {
    plan,
    kind,
    isOpen: plan !== null,
    open,
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
    /**
     * The quote on screen — may be the previous term's or timing's while the
     * next one loads, but never another plan's, and nothing once the choice is
     * one the API would refuse.
     */
    displayedSummary:
      choice && preview.data?.target.planId === choice.planId
        ? preview.data
        : null,
    isPreviewLoading: preview.isLoading,
    isPreviewFetching: preview.isFetching,
    previewError: preview.isError ? preview.error : null,
    canConfirm,
    confirm,
    isSubmitting,
  }
}

export type PlanSwitchFlow = ReturnType<typeof usePlanSwitchFlow>
