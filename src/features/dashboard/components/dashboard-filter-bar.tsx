import { Building2, CalendarRange, Clock, DatabaseZap, Loader2 } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  FilterBar,
  type FilterChipSpec,
  type FilterFacet,
} from '@/components/common/filter-bar'
import {
  ANY_VALUE,
  DATE_PRESET_LABELS,
  DATE_PRESET_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
} from '../constants'
import { formatAsOf, formatWindow } from '../lib/dashboard-format'
import type { DashboardFilterState } from '../hooks/use-dashboard-filters'
import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  DashboardFilters,
  DatePreset,
  EmploymentTypeFilter,
  GradeFilter,
} from '../types'

/**
 * THE filter bar — one row above everything it scopes, collapsed behind a single
 * Filters button.
 *
 * Nine controls laid out flat took two rows and most of the screen's first fold
 * before a single number appeared, so everything lives in the panel and only the
 * PERIOD stays outside it: the period is the one control a user changes
 * constantly, and burying the screen's primary axis behind a click would cost
 * more than the sprawl did. Whatever is applied shows as a removable chip, so a
 * collapsed panel never hides an active narrowing.
 *
 * It is not a per-panel control: all eight panels re-render against the same
 * slice, and a filter living inside one card would let two cards on one screen
 * describe different populations. The panel-local pickers (a measure, a chart
 * shape, a grain) sit in their own headers, because those change what a panel IS
 * rather than which population it measures.
 *
 * Three details the copy depends on:
 *
 * * The window shown is the one the SERVER resolved, echoed back from
 *   `/summary`. It is what every other panel is measuring, and users need to see
 *   it — especially under `all_time`, where the server re-cuts the window onto
 *   the account's first real activity.
 * * Under `all_time` the date pickers are disabled rather than hidden, so it is
 *   obvious why they stopped mattering.
 * * The company picker lists the caller's OWN tenants. Reach is applied
 *   server-side and silently — asking for a company you don't hold returns the
 *   intersection, not a 403 — so a saved filter keeps working after an access
 *   change.
 */

interface DashboardFilterBarProps {
  state: DashboardFilterState
  /** The `from`/`to` the server resolved, once `/summary` has answered. */
  resolvedWindow?: { from: string; to: string }
  /**
   * When the nightly rollup was last rebuilt. Shown here because the page shows
   * it exactly once, and this footer already carries the window and the zone —
   * the three facts that say what the numbers below actually describe.
   *
   * `undefined` = `/summary` has not answered yet. `null` = the rollup has never
   * run, which is the "not yet computed" state, not a quiet period.
   */
  asOf?: string | null
}

export function DashboardFilterBar({
  state,
  resolvedWindow,
  asOf,
}: DashboardFilterBarProps) {
  const { filters, options, isDebouncing } = state
  const allTime = filters.allTime

  /*
   * The two single-value narrowings are exactly what a `FilterFacet` is for,
   * so they go through the shared bar's own config rather than being hand-drawn:
   * it renders them in the panel and gives each one a chip for free.
   */
  const facets: FilterFacet[] = [
    {
      key: 'employment_type',
      label: 'Employment type',
      value: filters.employmentType,
      onChange: (value) =>
        state.setFilter('employmentType', value as EmploymentTypeFilter | ''),
      options: EMPLOYMENT_TYPE_OPTIONS,
      searchable: false,
      clearValue: ANY_VALUE,
    },
    {
      key: 'grade',
      label: 'Grade',
      value: filters.grade,
      onChange: (value) => state.setFilter('grade', value as GradeFilter | ''),
      options: GRADE_OPTIONS,
      searchable: false,
      clearValue: ANY_VALUE,
    },
  ]

  /*
   * The multi-selects can't be facets — a facet's value is one string — so they
   * supply their own chips. One chip per selection would flood the row on a
   * tenant with twenty branches, so each list collapses to a count.
   */
  const extraChips: FilterChipSpec[] = (
    [
      ['companyIds', 'company', 'companies', options.companies],
      ['branchIds', 'branch', 'branches', options.branches.options],
      ['departmentIds', 'department', 'departments', options.departments.options],
      ['designationIds', 'designation', 'designations', options.designations.options],
    ] as const
  ).flatMap(([key, singular, plural, list]) => {
    const selected = filters[key]
    if (selected.length === 0) return []
    return [
      {
        key,
        label:
          selected.length === 1
            ? (list.find((option) => option.value === selected[0])?.label ??
              `1 ${singular}`)
            : `${selected.length} ${plural}`,
        onRemove: () => state.setFilter(key, [] as DashboardFilters[typeof key]),
      },
    ]
  })

  return (
    <FilterBar
      className="mb-6"
      onReset={state.reset}
      facets={facets}
      extraChips={extraChips}
      // One per applied multi-select, so the badge matches the chips beside it.
      // The shared bar adds its own facet count on top.
      extraActiveCount={extraChips.length}
      leading={
        <div className="w-full sm:w-48">
          <Combobox
            icon={CalendarRange}
            options={DATE_PRESET_OPTIONS}
            value={filters.preset}
            onChange={(value) => state.setPreset(value as DatePreset)}
            searchable={false}
            triggerClassName="h-10"
          />
        </div>
      }
      panelExtras={
        <>
          {/* Stacked, not side by side: half the panel's width can't hold a
              dd/mm/yyyy input plus its clear and calendar buttons, and the date
              text ends up running under them. */}
          <div className="space-y-3">
            <PanelField label="From">
              <DatePicker
                value={filters.from}
                onChange={state.setFrom}
                disabled={allTime}
                maxDate={filters.to ? new Date(filters.to) : undefined}
              />
            </PanelField>
            <PanelField label="To">
              <DatePicker
                value={filters.to}
                onChange={state.setTo}
                disabled={allTime}
                minDate={filters.from ? new Date(filters.from) : undefined}
              />
            </PanelField>
          </div>

          {allTime ? (
            <p className="-mt-1 text-xs text-muted-foreground">
              {/* Said out loud, rather than leaving two dead controls above. */}
              “{DATE_PRESET_LABELS.all_time}” ignores these dates entirely.
            </p>
          ) : null}

          <PanelField label="Companies">
            <MultiSelect
              icon
              options={options.companies}
              value={filters.companyIds}
              onChange={(value) => state.setFilter('companyIds', value)}
              placeholder="All companies"
              loading={options.isLoading}
            />
          </PanelField>

          <PanelField label="Branches">
            <MultiSelect
              {...options.branches}
              value={filters.branchIds}
              onChange={(value) => state.setFilter('branchIds', value)}
              placeholder="All branches"
            />
          </PanelField>

          {/*
            Department does NOT depend on the branch selection: branch and
            department are independent in this product — a company may have
            branches with no departments, or departments straight under the
            company.
          */}
          <PanelField label="Departments">
            <MultiSelect
              {...options.departments}
              value={filters.departmentIds}
              onChange={(value) => state.setFilter('departmentIds', value)}
              placeholder="All departments"
            />
          </PanelField>

          <PanelField label="Designations">
            <MultiSelect
              {...options.designations}
              value={filters.designationIds}
              onChange={(value) => state.setFilter('designationIds', value)}
              placeholder="All designations"
            />
          </PanelField>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {allTime
              ? resolvedWindow
                ? `All time — ${formatWindow(resolvedWindow.from, resolvedWindow.to)}`
                : 'All time'
              : resolvedWindow
                ? formatWindow(resolvedWindow.from, resolvedWindow.to)
                : 'Resolving period…'}
          </span>
          <span aria-hidden>·</span>
          <span>{filters.timezone}</span>
          {asOf !== undefined ? (
            <>
              <span aria-hidden>·</span>
              {/* These figures are a nightly rollup, not a live query — today's
                  punches, leaves and tickets are not in them, and this line is
                  the answer when somebody asks why. */}
              <span className="inline-flex items-center gap-1.5">
                <DatabaseZap className="size-3.5" />
                {formatAsOf(asOf)}
              </span>
            </>
          ) : null}
          {allTime ? (
            <>
              <span aria-hidden>·</span>
              {/* Said out loud, because every delta badge on the page vanishes. */}
              <span>Comparisons unavailable over all time</span>
            </>
          ) : null}
          {isDebouncing ? (
            <span className="ml-auto inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Applying…
            </span>
          ) : null}
        </div>
      }
    />
  )
}

/** A labelled control inside the filter panel. */
function PanelField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

/** A tick-many picker sized for the panel. */
function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  loading,
  icon,
  onScrollEnd,
  onSearchChange,
}: {
  options: ComboboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  loading?: boolean
  icon?: boolean
  /** Set by a scroll-lazy picker: loads the next page at the list's end. */
  onScrollEnd?: () => void
  /** Set by a scroll-lazy picker: the search is sent to the server. */
  onSearchChange?: (query: string) => void
}) {
  return (
    <Combobox
      multiple
      className="w-full"
      icon={icon ? Building2 : undefined}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      clearable
      loading={loading}
      onScrollEnd={onScrollEnd}
      onSearchChange={onSearchChange}
      maxVisibleLabels={1}
    />
  )
}
