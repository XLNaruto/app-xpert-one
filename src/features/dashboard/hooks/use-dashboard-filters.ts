import { useCallback, useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { PagedSelect } from '@/hooks/use-paged-select'
import { useMyCompanies } from '@/features/company'
import { useBranchSelect } from '@/features/master/branch'
import { useDepartmentSelect } from '@/features/master/department'
import { useDesignationSelect } from '@/features/master/designation'
import { EMPTY_DASHBOARD_FILTERS, localTimezone } from '../constants'
import { resolvePreset } from '../lib/date-presets'
import {
  activeFilterCount,
  toDashboardQuery,
  toPopulationQuery,
  type DashboardQuery,
} from '../lib/dashboard-query'
import type { DashboardFilters, DatePreset } from '../types'

/**
 * THE filter — one state object, and the two serialised queries every panel
 * reads from it.
 *
 * Held here rather than in Zustand: it is screen state, not app state, and it
 * dies with the screen. What it must NOT be is per-panel — the moment one panel
 * gets a slightly different filter, two panels describe different populations
 * and the numbers stop reconciling.
 *
 * **Debounced by 300 ms.** Six requests fire on every change, so the raw filter
 * drives the controls and a debounced copy drives the queries; superseded
 * requests are then cancelled in flight by the abort signal each panel query
 * threads through to axios.
 */

const DEBOUNCE_MS = 300

/** The initial filter: the API's own default window in the user's own zone. */
function initialFilters(): DashboardFilters {
  return {
    ...EMPTY_DASHBOARD_FILTERS,
    ...resolvePreset(EMPTY_DASHBOARD_FILTERS.preset),
    timezone: localTimezone(),
  }
}

export interface DashboardFilterOptions {
  companies: ComboboxOption[]
  /** True while the company picker's own tenants are loading. */
  isLoading: boolean
  /**
   * Scroll-lazy, server-searched pickers — spread onto the `<Combobox>`. The
   * current selection is always kept in each one's `options`, so the chips can
   * label it.
   */
  branches: PagedSelect
  departments: PagedSelect
  designations: PagedSelect
}

export interface DashboardFilterState {
  /** Drives the controls — updates on every keystroke and click. */
  filters: DashboardFilters
  /** Drives the six queries — the same object, 300 ms behind. */
  appliedFilters: DashboardFilters
  /** The window + population filter, as the endpoints spell it. */
  query: DashboardQuery
  /**
   * The population filter WITHOUT the window — what the worklist sends, because
   * every signal on it is measured as of now.
   */
  populationQuery: DashboardQuery
  /** True while the controls are ahead of the queries. */
  isDebouncing: boolean
  /** How many population narrowings are applied. */
  activeCount: number
  options: DashboardFilterOptions
  setPreset: (preset: DatePreset) => void
  setFrom: (from: string) => void
  setTo: (to: string) => void
  setFilter: <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => void
  reset: () => void
}

export function useDashboardFilters(): DashboardFilterState {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters)

  // The controls stay instant; the requests wait for the user to stop.
  const appliedFilters = useDebouncedValue(filters, DEBOUNCE_MS)

  /**
   * The company picker is populated from the caller's OWN tenants, so the user
   * only ever sees options they hold. Reach is applied server-side and silently
   * anyway — asking for a company you don't hold returns the intersection, not a
   * 403 — so nothing here reasons about it.
   */
  const { companies, isLoading: isCompaniesLoading } = useMyCompanies()

  /*
   * Branch / department / designation come off each employee's CURRENT posting,
   * and their masters are company-scoped on the API (`company_id` is required),
   * so these three pickers list the ACTIVE company's masters. Selecting other
   * companies above narrows the population without re-listing these.
   *
   * `branch` and `department` are INDEPENDENT in this product — a company may
   * have branches with no departments, or departments straight under the company
   * — so the department picker deliberately does not depend on the branch one.
   */
  const branchSelect = useBranchSelect({ selected: filters.branchIds })
  const departmentSelect = useDepartmentSelect({ selected: filters.departmentIds })
  const designationSelect = useDesignationSelect({ selected: filters.designationIds })

  const options = useMemo<DashboardFilterOptions>(
    () => ({
      companies: companies.map((company) => ({
        label: company.name,
        value: String(company.id),
      })),
      isLoading: isCompaniesLoading,
      branches: branchSelect,
      departments: departmentSelect,
      designations: designationSelect,
    }),
    [companies, isCompaniesLoading, branchSelect, departmentSelect, designationSelect],
  )

  /**
   * Picking a preset computes its from+to pair — except "All time", which sends
   * the flag instead and leaves the dates as a placeholder for when the user
   * switches back to a bounded window.
   */
  const setPreset = useCallback((preset: DatePreset) => {
    setFilters((prev) => ({
      ...prev,
      preset,
      allTime: preset === 'all_time',
      ...resolvePreset(preset),
    }))
  }, [])

  // Hand-editing either date leaves the named preset behind — the window is no
  // longer "this month", and labelling it so would be wrong.
  const setFrom = useCallback((from: string) => {
    setFilters((prev) => ({ ...prev, from, allTime: false, preset: 'last_30_days' }))
  }, [])

  const setTo = useCallback((to: string) => {
    setFilters((prev) => ({ ...prev, to, allTime: false, preset: 'last_30_days' }))
  }, [])

  const setFilter = useCallback(
    <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const reset = useCallback(() => setFilters(initialFilters()), [])

  const query = useMemo(() => toDashboardQuery(appliedFilters), [appliedFilters])
  const populationQuery = useMemo(
    () => toPopulationQuery(appliedFilters),
    [appliedFilters],
  )

  return {
    filters,
    appliedFilters,
    query,
    populationQuery,
    isDebouncing: filters !== appliedFilters,
    activeCount: activeFilterCount(filters),
    options,
    setPreset,
    setFrom,
    setTo,
    setFilter,
    reset,
  }
}
