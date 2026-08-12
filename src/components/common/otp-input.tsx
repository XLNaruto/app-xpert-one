import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  /** The code so far — always digits only, never longer than `length`. */
  value: string
  onChange: (value: string) => void
  /** Fired when the last box is filled, so the caller can submit on its own. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  /** Paint the boxes as rejected — the code came back wrong or expired. */
  invalid?: boolean
  autoFocus?: boolean
  'aria-label'?: string
}

/**
 * A one-box-per-digit code field. It is a *single* value split across inputs
 * rather than one piece of state per box: typing, pasting a whole code from the
 * mail, backspacing and arrowing all edit the same string, so the caller only
 * ever sees `"123456"`.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  'aria-label': ariaLabel = 'Verification code',
}: OtpInputProps) {
  const boxes = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus()
  }, [autoFocus])

  /** Push a new code up, keeping it digits-only and within `length`. */
  const commit = (next: string, focusIndex: number) => {
    const digits = next.replace(/\D/g, '').slice(0, length)
    onChange(digits)
    boxes.current[Math.min(focusIndex, length - 1)]?.focus()
    if (digits.length === length) onComplete?.(digits)
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    // A paste lands in whichever box has focus and fills the rest from there.
    const next =
      value.slice(0, index) + digits + value.slice(index + digits.length)
    commit(next, index + digits.length)
  }

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      // An empty box deletes the digit before it and steps back; a filled one
      // clears itself and stays put.
      const target = value[index] ? index : index - 1
      if (target < 0) return
      commit(value.slice(0, target) + value.slice(target + 1), target)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      boxes.current[Math.max(index - 1, 0)]?.focus()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      boxes.current[Math.min(index + 1, length - 1)]?.focus()
    }
  }

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el
          }}
          // `inputMode` is what brings up the numeric keypad on a phone; the
          // type stays `text` so a leading zero and a paste both survive.
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          value={value[index] ?? ''}
          aria-label={`Digit ${index + 1}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-12 w-11 rounded-lg border bg-white/80 text-center font-heading text-lg font-semibold text-foreground shadow-sm outline-none transition-[color,background-color,border-color,box-shadow] sm:h-14 sm:w-12 sm:text-xl',
            'disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5',
            // The dark border colour has to be repeated on `focus:` — Tailwind
            // emits `dark:` after `focus:`, so a plain focus border loses to it.
            invalid
              ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/40 dark:border-destructive dark:focus:border-destructive'
              : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-white/15 dark:focus:border-primary',
          )}
        />
      ))}
    </div>
  )
}
