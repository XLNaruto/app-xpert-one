import { useEffect, useState } from 'react'

/**
 * The current time in ms, re-read every `intervalMs` — drives live stopwatches.
 * Pass `active: false` to stop ticking when nothing on screen is running.
 */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return now
}
