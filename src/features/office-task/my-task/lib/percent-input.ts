/**
 * What a percent box may hold while typing: digits only, capped at 100 —
 * "11000" becomes "100", "4a5" becomes "45". Empty stays empty so the field
 * can be cleared and retyped.
 */
export function clampPercentInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  return String(Math.min(100, Number(digits)))
}
