import { useMemo } from 'react'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import type { WageHead } from '../lib/wage-structure-mappers'

/**
 * The pay-component catalog as the wage structure needs it — the short code the
 * master holds against each id.
 *
 * The API identifies a head by its `pay_component_id`, while the wage grid's
 * columns are a fixed list of short codes, so every read and write of a wage
 * structure has to resolve one against the other. Everything that touches
 * `salary_components` goes through this hook to get that catalog.
 */
export function useWageHeads() {
  const components = useAllowanceDeductions()

  const heads = useMemo<WageHead[]>(
    () =>
      (components.data?.items ?? []).map((component) => ({
        id: component.id,
        shortName: component.shortName,
      })),
    [components.data],
  )

  return {
    heads,
    /** Nothing can be mapped until the catalog is in — queries wait on this. */
    isReady: components.data !== undefined,
    isLoading: components.isLoading,
    isError: components.isError,
  }
}
