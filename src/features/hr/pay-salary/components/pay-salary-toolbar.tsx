import { Building2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { MonthPicker } from '@/components/ui/month-picker'

interface PaySalaryToolbarProps {
  /** What the picker holds — staged, not what the list was read for. */
  month: string
  monthBounds: { minDate: Date; maxDate: Date }
  onMonthChange: (value: string) => void
  /** Likewise staged. */
  departmentId: number | null
  departmentOptions: ComboboxOption[]
  departmentsLoading: boolean
  onDepartmentChange: (value: number | null) => void
  /** Read the list for what the two pickers hold. */
  onLoad: () => void
  /** The pickers hold something the list on screen wasn't read for. */
  hasPendingScope: boolean
  isLoading: boolean
  /** The department the list *was* read for — what a batch is filed under. */
  scopeLabel: string
}

/**
 * What period and scope the screen is settling.
 *
 * **The pickers stage; Load reads.** On View Salary a filter change is a cheap
 * re-read, but here it changes what a batch would be *filed under*: the API
 * checks every salary in a Confirm & Pay against the batch's own
 * `department_id` and period. Letting the filter move under a selection made
 * against the previous one produces a batch refused row by row, so the two are
 * kept in step behind one button.
 *
 * The company isn't asked for — the list is the active company's, and switching
 * company is the switcher's job.
 */
export function PaySalaryToolbar({
  month,
  monthBounds,
  onMonthChange,
  departmentId,
  departmentOptions,
  departmentsLoading,
  onDepartmentChange,
  onLoad,
  hasPendingScope,
  isLoading,
  scopeLabel,
}: PaySalaryToolbarProps) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Salary Month" className="w-44">
          <MonthPicker
            value={month}
            onChange={onMonthChange}
            minDate={monthBounds.minDate}
            maxDate={monthBounds.maxDate}
          />
        </Field>

        <Field label="Department" className="w-lg">
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

        <Button type="button" onClick={onLoad} disabled={isLoading} className="gap-1.5">
          <Search className="size-4" />
          {isLoading ? 'Loading…' : 'Load List'}
        </Button>
      </div>

      {/* Said once, beside the button, rather than as a badge on it. */}
      {hasPendingScope && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          The month or department has changed — press Load List to read it.
        </p>
      )}

      {/* What a batch recorded right now would be filed under. Printed because
          it is not the same thing as what the pickers currently hold. */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{scopeLabel}</span>
      </p>
    </div>
  )
}

/** A labelled toolbar control — the same frame for each. */
function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
