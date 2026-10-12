/**
 * IST (Asia/Kolkata) helpers for the Settings screen. The API speaks ISO-8601
 * UTC; the screen shows and picks times in IST whatever the browser's own zone.
 * IST has a fixed +05:30 offset and no DST, so plain arithmetic is exact.
 */

const IST_OFFSET = '+05:30'
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000
const MINUTE_MS = 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

/** The IST wall-clock fields of an instant, or `null` if it isn't a date. */
function istClock(iso: string) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  // Shift into IST, then read the UTC fields — they now hold IST's wall clock.
  const d = new Date(ms + IST_OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

/** `2026-10-18T09:49:00.000Z` → `18/10/2026 3:19 PM`; missing → `—`. */
export function formatIst(iso: string | null | undefined): string {
  if (!iso) return '—'
  const c = istClock(iso)
  if (!c) return iso
  const hour12 = c.hour % 12 === 0 ? 12 : c.hour % 12
  const meridiem = c.hour < 12 ? 'AM' : 'PM'
  return `${pad(c.day)}/${pad(c.month)}/${c.year} ${hour12}:${pad(c.minute)} ${meridiem}`
}

/** An instant as the picker's IST fields: `{ date: 'yyyy-MM-dd', time: 'HH:mm' }`. */
export function toIstFields(iso: string): { date: string; time: string } {
  const c = istClock(iso)
  if (!c) return { date: '', time: '' }
  return {
    date: `${c.year}-${pad(c.month)}-${pad(c.day)}`,
    time: `${pad(c.hour)}:${pad(c.minute)}`,
  }
}

/** The picker's IST fields → the ISO-with-offset the PATCH takes. */
export function fromIstFields(date: string, time: string): string {
  return `${date}T${time}:00${IST_OFFSET}`
}

/**
 * Is `iso` earlier than `min`? Compared to the minute — the server ignores
 * seconds on this check, so the minimum itself (seconds and all) always passes.
 */
export function isBeforeMinute(iso: string, min: string): boolean {
  const a = Date.parse(iso)
  const b = Date.parse(min)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return Math.floor(a / MINUTE_MS) < Math.floor(b / MINUTE_MS)
}
