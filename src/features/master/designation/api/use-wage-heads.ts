import { useMemo } from 'react'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import type { AllowanceDeduction } from '@/features/master/allowance-deduction'
import { NO_WAGE_HEADS, type WageHead, type WageHeads } from '../lib/wage-structure-mappers'

/**
 * The allowance / deduction master as the wage structure needs it — every head
 * the company has, split by the side its own `type` puts it on.
 *
 * This is where the grid's allowance and deduction columns come from: one column
 * per head, in this order. Everything that touches `salary_components` goes
 * through this hook, so the columns, the draft rows and the stored history are all
 * built from the same list and stay index-aligned.
 */
export function useWageHeads() {
  const components = useAllowanceDeductions()

  const heads = useMemo<WageHeads>(() => {
    if (!components.data) return NO_WAGE_HEADS
    return {
      allowances: headsOfType(components.data.items, 'ALLOWANCE'),
      deductions: headsOfType(components.data.items, 'DEDUCTION'),
    }
  }, [components.data])

  return {
    heads,
    /** Nothing can be mapped until the master is in — queries wait on this. */
    isReady: components.data !== undefined,
    isLoading: components.isLoading,
    isError: components.isError,
  }
}

/**
 * The master's heads for one side, as grid columns.
 *
 * Ordered by id — creation order — rather than by the list screen's sort, so the
 * columns don't reshuffle when that changes and a head added later lands at the
 * right-hand end instead of shifting the ones already on the grid.
 */
function headsOfType(
  components: AllowanceDeduction[],
  type: AllowanceDeduction['type'],
): WageHead[] {
  return components
    .filter((component) => component.type === type)
    .sort((a, b) => a.id - b.id)
    .map((component) => ({
      id: component.id,
      code: component.shortName.trim() || component.name,
      name: component.name,
    }))
}
