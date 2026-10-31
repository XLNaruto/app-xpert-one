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

/** What a `409` from `PATCH /user/me` says, by the field that collided. */
export const EMAIL_IN_USE_MESSAGE = 'This email is already in use'
export const MOBILE_IN_USE_MESSAGE = 'This mobile number is already in use'

/** A `400` on `PATCH /user/me/profile-photo` — the key isn't this user's own upload. */
export const PROFILE_PHOTO_NOT_FOUND_MESSAGE =
  "We couldn't find this profile photo upload. Please upload the photo again."

/** The photo picker's filter — the presign signs JPG, PNG and WEBP only. */
export const PROFILE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
