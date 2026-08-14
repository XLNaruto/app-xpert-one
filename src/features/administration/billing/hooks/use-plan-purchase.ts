import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { toastApiError } from '@/lib/api-toast'
import { toastsuccessmsg } from '@/lib/toast'
import { isRazorpayConfigured, openRazorpayCheckout } from '@/lib/razorpay'
import { ACCESS_CODES, useCan } from '@/features/permissions'
import { usePurchasePlan } from '../api/use-billing-mutations'
import type { BillingAccount, Plan } from '../types'

/**
 * Buying a plan, end to end: confirm, raise the order, pay it, refresh.
 *
 * The two halves are deliberately separate states. `POST /user/subscriptions`
 * opens a `pending` subscription and answers with an order; only the gateway
 * settling that order makes the plan run. So a dismissed sheet is not a failure
 * — the order stays open and the subscription stays pending — and the billing
 * reads are refreshed either way, because the pending subscription is itself a
 * change the screen has to show.
 *
 * Where no publishable key is configured (`VITE_RAZORPAY_KEY_ID` empty), the
 * order is still raised and the user is told the payment is outstanding, rather
 * than being dropped into a checkout that can't load.
 */
export function usePlanPurchase({
  account,
  yearly,
}: {
  /** Billed-to details, used to prefill the checkout sheet. */
  account: BillingAccount | null
  /** Which cycle the grid is quoting — the order is raised for this one. */
  yearly: boolean
}) {
  const queryClient = useQueryClient()
  const purchase = usePurchasePlan()
  const { can } = useCan()

  /** Billing is one `billing:manage` right — there is no separate buy action. */
  const canPurchase = can(ACCESS_CODES.billing)

  /** The plan awaiting confirmation; null when the dialog is closed. */
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  /** True from the moment the sheet opens until the gateway is done with it. */
  const [isPaying, setIsPaying] = useState(false)

  const requestPurchase = useCallback((plan: Plan) => setPendingPlan(plan), [])
  const cancelPurchase = useCallback(() => setPendingPlan(null), [])

  const confirmPurchase = useCallback(async () => {
    const plan = pendingPlan
    if (!plan) return

    try {
      const { order } = await purchase.mutateAsync({
        planId: plan.id,
        isYearly: yearly,
      })
      setPendingPlan(null)

      // A free trial raises a zero-amount order — there is nothing to hand the
      // gateway, and the subscription is already as active as it gets.
      if (order.amountPaise <= 0) {
        toastsuccessmsg(`${plan.name} is now active.`)
        return
      }

      if (!isRazorpayConfigured()) {
        toast.info(
          `Your order for ${plan.name} was created. Payment can't be completed from here yet — please contact us to settle it.`,
          { duration: 6000 },
        )
        return
      }

      setIsPaying(true)
      const payment = await openRazorpayCheckout({
        orderId: order.id,
        amountPaise: order.amountPaise,
        currency: order.currency,
        name: account?.organizationName || 'XpertOne',
        description: `${plan.name} — ${yearly ? 'yearly' : 'monthly'} plan`,
        prefill: {
          name: account?.organizationName,
          email: account?.organizationEmail,
          contact: account?.organizationMobileNumber ?? undefined,
        },
      })

      if (payment) {
        // The gateway confirms the plan to the API, not to us — so this says the
        // payment landed, and the refreshed reads say what it bought.
        toastsuccessmsg('Payment successful. Your plan is being activated.')
      } else {
        toast.info(
          'Payment cancelled. Your order is still open if you want to finish it.',
          { duration: 5000 },
        )
      }
    } catch (error) {
      toastApiError(error, "Couldn't complete the purchase.")
    } finally {
      setIsPaying(false)
      // Whatever happened, a subscription record now exists — even an abandoned
      // payment leaves a pending one the screen must show.
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    }
  }, [account, pendingPlan, purchase, queryClient, yearly])

  return {
    canPurchase,
    pendingPlan,
    requestPurchase,
    cancelPurchase,
    confirmPurchase,
    /** Covers both halves — the order call and the payment sheet. */
    isPurchasing: purchase.isPending || isPaying,
  }
}
