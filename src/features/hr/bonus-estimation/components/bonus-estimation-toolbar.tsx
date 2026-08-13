import { Building2, Calculator, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'
import { Field } from '@/components/common/form-field'
import { cn } from '@/lib/utils'
import {
  BONUS_VIEWS,
  CALCULATION_FIELD_OPTIONS,
  type BonusView,
  type CalculationField,
} from '../constants'

interface BonusEstimationToolbarProps {
  view: BonusView
  onViewChange: (value: BonusView) => void

  /** The staged range — what the pickers hold, not what was read. */
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  monthBounds: { minDate: Date; maxDate: Date }
  /**
   * The earliest month To may hold — the From month. The range is kept valid by
   * this bound rather than by an error under the field: `from` after `to` is a
   * 400, so it is made unpickable instead of refused afterwards.
   */
  toMinDate: Date

  /** Likewise staged. */
  departmentId: number | null
  departmentOptions: ComboboxOption[]
  departmentsLoading: boolean
  onDepartmentChange: (value: number | null) => void

  /** Live, not staged — all four bases are already on every estimate line. */
  calculationField: CalculationField
  onCalculationFieldChange: (value: CalculationField) => void

  onLoad: () => void
  canLoad: boolean
  /** The pickers hold something the rows on screen weren't read for. */
  hasPendingScope: boolean
  isLoading: boolean
  /** What the rows on screen *were* read for. Empty before the first Load. */
  scopeLabel: string
}

/**
 * What range and scope the bonus is being figured for.
 *
 * **The pickers stage; Load reads.** An estimate sums every processed month of
 * every employee in scope, so a half-changed range would fire a read nobody asked
 * for — and `from` after `to` is a 400 rather than an empty table. The two views
 * then share what Load applied: switching to Saved Bonus reads back the same range
 * that was just estimated.
 *
 * The CALCULATION BASE is the one control that acts immediately, because every
 * line carries all four bases: changing it re-fills the base column from the answer
 * already on screen. It disappears on the Saved Bonus side — a committed month
 * records the base it was figured on, so there is nothing left to choose.
 *
 * The company isn't asked for: the read is the active company's.
 */
export function BonusEstimationToolbar({
  view,
  onViewChange,
  from,
  to,
  onFromChange,
  onToChange,
  monthBounds,
  toMinDate,
  departmentId,
  departmentOptions,
  departmentsLoading,
  onDepartmentChange,
  calculationField,
  onCalculationFieldChange,
  onLoad,
  canLoad,
  hasPendingScope,
  isLoading,
  scopeLabel,
}: BonusEstimationToolbarProps) {
  const estimating = view === 'estimate'

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60">
        <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
          <Filter className="size-4 text-primary" />
          Bonus Estimation
        </span>

        {/* Two endpoints, not two views of one answer: what a bonus WOULD cost,
            and what has been committed. */}
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {BONUS_VIEWS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onViewChange(tab.value)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Department" className="w-full sm:w-72">
            <Combobox
              value={departmentId === null ? '' : String(departmentId)}
              onChange={(value) => onDepartmentChange(value ? Number(value) : null)}
              options={departmentOptions}
              icon={Building2}
              placeholder={departmentsLoading ? 'Loading…' : 'Every department'}
              searchPlaceholder="Search departments…"
              clearable
            />
          </Field>

          {estimating && (
            <Field
              label="Calculation Base"
              className="w-full sm:w-60"
              hint="Which salary figure the bonus is a percentage of, summed over the range. All four come back with the estimate, so switching this re-fills the column without another Load — and it is recorded against every month the save writes."
            >
              <Combobox
                value={calculationField}
                onChange={(value) => onCalculationFieldChange(value as CalculationField)}
                options={CALCULATION_FIELD_OPTIONS}
                icon={Calculator}
                placeholder="Select a base"
                searchable={false}
              />
            </Field>
          )}

          <Field label="From" required className="w-full sm:w-44">
            <MonthPicker
              value={from}
              onChange={onFromChange}
              minDate={monthBounds.minDate}
              maxDate={monthBounds.maxDate}
            />
          </Field>

          {/* Floored at the From month, so the range can only be picked forwards.
              Raising From above a To already picked carries To with it. */}
          <Field label="To" required className="w-full sm:w-44">
            <MonthPicker
              value={to}
              onChange={onToChange}
              minDate={toMinDate}
              maxDate={monthBounds.maxDate}
            />
          </Field>

          <Button
            type="button"
            onClick={onLoad}
            disabled={!canLoad || isLoading}
            className="gap-1.5"
          >
            <Search className="size-4" />
            {isLoading ? 'Loading…' : 'Load'}
          </Button>
        </div>

        {/* Said once, beside the button, rather than as a badge on it. */}
        {hasPendingScope && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
            The range or department has changed — press Load to read it.
          </p>
        )}

        {scopeLabel && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{scopeLabel}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
