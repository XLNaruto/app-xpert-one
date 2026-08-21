/** How a status pill reads. Not a colour — the page maps tones to classes. */
export type StatusTone = 'positive' | 'warning' | 'danger' | 'neutral'

/**
 * Account statuses this API is known to send. Anything it adds later falls
 * back to `neutral` rather than being coloured by guesswork.
 */
export const ACCOUNT_STATUS_TONES: Record<string, StatusTone> = {
  active: 'positive',
  verified: 'positive',
  pending: 'warning',
  invited: 'warning',
  unverified: 'warning',
  suspended: 'danger',
  blocked: 'danger',
  inactive: 'neutral',
}

/** Subscription statuses, coloured by what they mean for access. */
export const SUBSCRIPTION_STATUS_TONES: Record<string, StatusTone> = {
  active: 'positive',
  trialing: 'warning',
  pending: 'warning',
  created: 'warning',
  past_due: 'danger',
  cancelled: 'neutral',
  canceled: 'neutral',
  expired: 'neutral',
}

/** The share of an allowance at which a usage meter warns, then goes red. */
export const USAGE_WARN_PERCENT = 80
export const USAGE_FULL_PERCENT = 100
