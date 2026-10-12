/**
 * Company codes are four letters, a dash and four digits — `XTEC-0001`. The
 * sign-in field masks to that shape: the dash is never typed, only letters are
 * taken before it and only digits after it.
 */
export const COMPANY_CODE_MASK = 'XXXX-0000'
export const COMPANY_CODE_PATTERN = /^[A-Z]{4}-\d{4}$/

const PREFIX_LENGTH = 4
const SUFFIX_LENGTH = 4

/**
 * Coerce raw input to the mask. The dash is attached as soon as the four
 * letters are in, except while deleting — otherwise backspacing over the dash
 * would put it straight back.
 */
export function formatCompanyCode(raw: string, deleting = false): string {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

  let prefix = ''
  let i = 0
  while (i < chars.length && prefix.length < PREFIX_LENGTH) {
    if (/[A-Z]/.test(chars[i])) prefix += chars[i]
    i++
  }
  const suffix = chars
    .slice(i)
    .replace(/\D/g, '')
    .slice(0, SUFFIX_LENGTH)

  if (prefix.length < PREFIX_LENGTH) return prefix
  if (suffix === '' && deleting) return prefix
  return `${prefix}-${suffix}`
}
