/** Field labels, shared by the summary panel and the plan cards. */
export const BILLING_LABELS = {
  plan: 'Plan',
  status: 'Status',
  billingCycle: 'Billing Cycle',
  renewsOn: 'Renews On',
  endsOn: 'Ends On',
  startedOn: 'Current Period Started',
  autopay: 'Auto-Renew',
  employees: 'Employees',
  companies: 'Companies',
  organization: 'Organization',
} as const

/** Paise per rupee — the one place the API's money unit is converted. */
export const PAISE_PER_RUPEE = 100

/**
 * How a subscription status paints. The wire type is a free string, so anything
 * unlisted falls back to a neutral badge rather than being dropped.
 */
export const SUBSCRIPTION_STATUS_VARIANTS: Record<
  string,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'destructive',
  cancelled: 'secondary',
  canceled: 'secondary',
  expired: 'secondary',
  pending: 'warning',
  created: 'warning',
}

/**
 * The share of an allowance at which the usage meter starts warning, and the
 * share at which it goes red. Hitting a limit blocks the next employee or
 * company outright, so the warning has to arrive before the wall does.
 */
export const USAGE_WARN_RATIO = 0.8
export const USAGE_DANGER_RATIO = 1

/**
 * What each usage tone SAYS, so the meter never signals by colour alone — a
 * red bar and an amber one are the same bar to a colourblind reader.
 */
export const USAGE_TONE_LABELS = {
  normal: 'Healthy',
  warning: 'Nearing limit',
  danger: 'Limit reached',
} as const

/** How an SLA's ticket type reads on screen. */
export const SLA_TICKET_LABELS: Record<string, string> = {
  technical: 'Technical',
  billing: 'Billing',
}

/** How an SLA's priority reads on screen. */
export const SLA_PRIORITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

/**
 * Least to most urgent. The API returns SLAs in whatever order it stores them,
 * and a support table that jumps between urgencies is read row by row instead of
 * at a glance — so the screen imposes this order.
 */
export const SLA_PRIORITY_ORDER = ['normal', 'medium', 'high', 'critical'] as const

/** Technical before billing — the one people look up first goes first. */
export const SLA_TICKET_ORDER = ['technical', 'billing'] as const

/** How a priority paints, rising with urgency. */
export const SLA_PRIORITY_VARIANTS: Record<string, string> = {
  normal: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/15 text-warning',
  critical: 'bg-destructive/12 text-destructive',
}
