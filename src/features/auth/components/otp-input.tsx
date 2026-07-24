import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * Segmented one-time-code input: `length` single-digit boxes that behave as one
 * field. Controlled — holds the joined string in `value` and reports changes
 * via `onChange`. Handles auto-advance, backspace, arrows and paste.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  hasError,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  hasError?: boolean
  autoFocus?: boolean
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const focus = (i: number) => inputs.current[i]?.focus()

  const setChar = (index: number, char: string) => {
    const chars = value.padEnd(length, ' ').split('')
    chars[index] = char || ' '
    onChange(chars.join('').replace(/ /g, '').slice(0, length))
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return setChar(index, '')

    if (digits.length > 1) {
      // Multiple chars (autofill/paste into one box) → distribute from here.
      const next = (value.slice(0, index) + digits).slice(0, length)
      onChange(next)
      focus(Math.min(index + digits.length, length - 1))
      return
    }
    setChar(index, digits)
    if (index < length - 1) focus(index + 1)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        setChar(index, '')
      } else if (index > 0) {
        focus(index - 1)
        setChar(index - 1, '')
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focus(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focus(index + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)
    if (!pasted) return
    onChange(pasted)
    focus(Math.min(pasted.length, length - 1))
  }

  return (
    <div className="flex gap-2 sm:gap-2.5">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-full min-w-0 rounded-xl border bg-white/80 text-center text-lg font-semibold text-foreground shadow-sm outline-none backdrop-blur-sm transition-colors focus:border-primary dark:bg-white/5 dark:focus:border-primary',
            hasError ? 'border-destructive/60' : 'border-border dark:border-white/15',
          )}
        />
      ))}
    </div>
  )
}
