import { env } from '@/config/env'

/**
 * Razorpay Checkout — the payment handoff, kept behind one function.
 *
 * The SDK is a global `window.Razorpay` injected by a script tag; nothing
 * outside this file touches it, so the rest of the app talks in orders and
 * results rather than in gateway objects. Swapping gateways is a rewrite of this
 * file alone.
 *
 * The key here is the PUBLISHABLE key id, which is safe in the bundle. Orders
 * are still raised server-side (`POST /user/subscriptions`) and the amount is
 * the one the API put on the order — nothing about the price is decided here.
 */

/** What the gateway hands back once a payment succeeds. */
export interface RazorpayPaymentResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

/** What the caller has to state about the order being paid. */
export interface RazorpayCheckoutOptions {
  /** The order id from `POST /user/subscriptions`. */
  orderId: string
  /** In PAISE — the gateway counts paise, and this is the API's own figure. */
  amountPaise: number
  currency: string
  /** The business name on the checkout sheet. */
  name: string
  description?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (payload: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const SCRIPT_ID = 'razorpay-checkout-js'
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

// Shared promise so two cards clicked in quick succession await one load.
let loadPromise: Promise<void> | null = null

function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.Razorpay) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const fail = () => {
      loadPromise = null // let a later attempt retry rather than stay broken
      reject(new Error('Could not reach the payment gateway.'))
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', fail)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = fail
    document.head.appendChild(script)
  })

  return loadPromise
}

/** Whether a publishable key is configured — no key, no checkout. */
export function isRazorpayConfigured(): boolean {
  return Boolean(env.VITE_RAZORPAY_KEY_ID)
}

/**
 * Open the checkout sheet for one order and settle when the user is done.
 *
 * Resolves with the payment result on success and with `null` when the sheet is
 * dismissed — abandoning a payment is a normal outcome, not an error, and the
 * order stays open for another attempt either way. Rejects only when the
 * gateway itself fails: unconfigured, unreachable, or a declined payment.
 */
export function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpayPaymentResult | null> {
  if (!isRazorpayConfigured()) {
    return Promise.reject(
      new Error('Online payment is not configured for this environment.'),
    )
  }

  return loadCheckout().then(
    () =>
      new Promise<RazorpayPaymentResult | null>((resolve, reject) => {
        const Checkout = window.Razorpay
        if (!Checkout) {
          reject(new Error('Could not reach the payment gateway.'))
          return
        }

        // The sheet fires exactly one of handler / dismiss / payment.failed, but
        // a settled promise ignoring later calls is cheaper than trusting that.
        let settled = false
        const settle = (fn: () => void) => {
          if (settled) return
          settled = true
          fn()
        }

        const checkout = new Checkout({
          key: env.VITE_RAZORPAY_KEY_ID,
          order_id: options.orderId,
          amount: options.amountPaise,
          currency: options.currency,
          name: options.name,
          description: options.description,
          prefill: options.prefill,
          handler: (result: RazorpayPaymentResult) =>
            settle(() => resolve(result)),
          modal: {
            ondismiss: () => settle(() => resolve(null)),
          },
        })

        checkout.on('payment.failed', (payload: unknown) => {
          const description = (
            payload as { error?: { description?: string } } | undefined
          )?.error?.description
          settle(() =>
            reject(new Error(description || 'The payment could not be completed.')),
          )
        })

        checkout.open()
      }),
  )
}
