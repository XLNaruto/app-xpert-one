import type { ClipboardEvent, FormEvent, InputHTMLAttributes } from 'react'

/**
 * Keeps a text `<input>` numeric **as it is typed**, rather than telling the user
 * off after the fact.
 *
 * Every amount, rate and day count on the wage and salary screens is captured as
 * a string, because that is what an uncontrolled `<input>` holds — the zod schema
 * then refuses anything that isn't a number. That check is still the one that
 * decides whether a value can be saved, and it stays: this only stops the
 * keystroke that could never be valid from landing at all, which on a grid of
 * forty columns is the difference between a cell that reads `12` and one that
 * reads `12abc` under a red border.
 *
 * `type="number"` is deliberately not used instead. It hands the browser a
 * spinner and its own locale rules, silently reports `''` for a half-typed value
 * like `12.`, and scroll-wheels over a grid cell change the figure under the
 * cursor. A text input plus this guard keeps the string the form actually holds.
 *
 * What is allowed through: the digits, one decimal point up to `decimals`
 * places, and a leading `-` where `negative` is set. Everything the user does
 * that isn't typing — arrows, tab, backspace, select-all, undo — is untouched,
 * because only insertions are inspected. A paste is held to the same rule as a
 * keystroke, so pasting `₹1,234.50` is refused rather than half-accepted.
 */
export function numericInputProps({
  decimals = 2,
  negative = false,
}: {
  /** Decimal places allowed. `0` is a whole number; `4` is a per-day rate. */
  decimals?: number
  /** Whether a leading minus is allowed — a correction, a reversal. */
  negative?: boolean
} = {}): Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'inputMode' | 'onBeforeInput' | 'onPaste'
> {
  const allowed = patternFor(decimals, negative)

  /** What the field would read if this text landed at the current selection. */
  const wouldBe = (input: HTMLInputElement, text: string) => {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    return input.value.slice(0, start) + text + input.value.slice(end)
  }

  return {
    /* `decimal` asks a phone keyboard for the numeric pad — the guard below is
       what actually holds the value to it, on every device. */
    inputMode: decimals > 0 ? 'decimal' : 'numeric',

    onBeforeInput: (event: FormEvent<HTMLInputElement>) => {
      /* Typed as a FormEvent by React; the inserted text rides on the native
         InputEvent. A deletion or a composition carries none — nothing to check. */
      const text = (event.nativeEvent as InputEvent).data
      if (text == null) return
      if (!allowed.test(wouldBe(event.currentTarget, text))) event.preventDefault()
    },

    onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData('text')
      if (!allowed.test(wouldBe(event.currentTarget, text))) event.preventDefault()
    },
  }
}

/**
 * What a valid *part-typed* value looks like.
 *
 * Deliberately looser than the schema's own pattern: `''`, `-`, `.` and `12.`
 * all pass, because each is a legal thing to have typed halfway to a number and
 * refusing them would make the field impossible to type into. The schema decides
 * whether the finished value is a number; this only decides whether the next
 * character can ever lead to one.
 */
function patternFor(decimals: number, negative: boolean): RegExp {
  const sign = negative ? '-?' : ''
  const fraction = decimals > 0 ? `(\\.\\d{0,${decimals}})?` : ''
  return new RegExp(`^${sign}\\d*${fraction}$`)
}

/** A whole number of days, hours or years — no decimal point at all. */
export const wholeNumberInputProps = numericInputProps({ decimals: 0 })

/** A money figure or a percentage — two decimals, the way money is stored. */
export const amountInputProps = numericInputProps()

/**
 * A configured RATE — four decimals.
 *
 * A minimum-wage notification states a per-day allowance as `146.8846`, and
 * rounding that at the point of entry loses it before the arithmetic starts.
 * Only the computed output is a 2dp figure.
 */
export const rateInputProps = numericInputProps({ decimals: 4 })

/** A figure that can be corrected downwards — a typed-over salary cell. */
export const signedAmountInputProps = numericInputProps({ negative: true })
