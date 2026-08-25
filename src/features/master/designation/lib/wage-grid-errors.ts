import type { FieldErrors } from 'react-hook-form'
import type { WageStructureFormValues } from '../schemas'

/**
 * What a failed save on a wage grid does about the cell in the way.
 *
 * Shared by every screen built on `WageStructureGrid` — the designation's own
 * history and the employee's wage override — because the problem is the grid's,
 * not the screen's: at forty columns the offending cell is almost always off
 * screen when Save is pressed, and a toast alone leaves you hunting for it.
 */

/** How long the cell a failed save lands on stays lit. */
const FLASH_MS = 1600

/**
 * Bring the first cell standing in the way of the save into view: scrolled to
 * the middle of the grid both ways, focused with its value selected so it can be
 * typed straight over, and flashed so the eye lands on it rather than on
 * whichever cell happens to be under the cursor.
 *
 * Deferred a frame: react-hook-form focuses the first error itself once the
 * invalid handler returns, and that focus scrolls the field to whichever edge is
 * nearest. Running after it means the centring is the one that sticks.
 */
export function revealFirstError(errors: FieldErrors<WageStructureFormValues>): void {
  const element = firstErrorElement(errors)
  if (!element) return

  requestAnimationFrame(() => {
    element.focus({ preventScroll: true })
    if (element instanceof HTMLInputElement) element.select()
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })

    const cell = element.closest('td')
    if (!cell) return
    /* Restart the animation when the same cell is hit twice — a class that is
       already there re-triggers nothing without a reflow between. */
    cell.classList.remove('wage-cell-flash')
    void cell.offsetWidth
    cell.classList.add('wage-cell-flash')
    window.setTimeout(() => cell.classList.remove('wage-cell-flash'), FLASH_MS)
  })
}

/**
 * The input behind the first error in the tree, walking it in field order —
 * rows top to bottom, and each row's fields in the order the schema checks them.
 * Errors nest as deep as the field does (`rows.0.allowances.2.amount`), and only
 * a field registered with a ref has an element to reach: a `Controller` cell
 * carries a plain `{ name }` instead, so it's stepped over rather than focused.
 */
function firstErrorElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null

  const { ref } = node as { ref?: unknown }
  if (ref instanceof HTMLElement && !(ref as HTMLInputElement).disabled) return ref

  for (const value of Object.values(node as Record<string, unknown>)) {
    const found = firstErrorElement(value)
    if (found) return found
  }
  return null
}

