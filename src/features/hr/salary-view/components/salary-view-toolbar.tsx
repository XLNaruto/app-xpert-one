import { Building2, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SalaryViewToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  /** The period as one `yyyy-MM` value — month and year are a single choice. */
  month: string
  monthBounds: { minDate: Date; maxDate: Date }
  onMonthChange: (value: string) => void
  departmentId: number | null
  departmentOptions: ComboboxOption[]
  departmentsLoading: boolean
  onDepartmentChange: (value: number | null) => void
  /** How many rows the discard would send — hidden when nothing is selected. */
  selectedCount: number
  onDiscard: () => void
  isDiscarding: boolean
}

/**
 * What month is on screen, and who from it.
 *
 * All four filters read straight through — there is no "run it" button here as
 * there is on Calculate Salary, because this screen only looks at a month that
 * has already been processed. Changing one is a re-read, not a decision.
 *
 * The department is optional and clearable: unset means the whole company, which
 * is the read most of these questions start from. The company itself isn't
 * asked for — the report is the active company's, and switching company is the
 * switcher's job.
 *
 * Discard sits at the end of the row rather than in the page header because it
 * acts on the selection made in the table right below it, and it only appears
 * once there is a selection to act on.
 */
export function SalaryViewToolbar({
  search,
  onSearchChange,
  month,
  monthBounds,
  onMonthChange,
  departmentId,
  departmentOptions,
  departmentsLoading,
  onDepartmentChange,
  selectedCount,
  onDiscard,
  isDiscarding,
}: SalaryViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search employee…"
          className="pl-9"
          aria-label="Search employee"
        />
      </div>

      {/* One control, not a month dropdown beside a year dropdown: these are a
          payroll period, and picking August 2026 shouldn't be two decisions
          that can be left half-made. */}
      <Field label="Salary Month" className="w-44">
        <MonthPicker
          value={month}
          onChange={onMonthChange}
          minDate={monthBounds.minDate}
          maxDate={monthBounds.maxDate}
        />
      </Field>

      <Field label="Department" className="min-w-64 flex-2">
        <Combobox
          value={departmentId === null ? '' : String(departmentId)}
          onChange={(value) => onDepartmentChange(value ? Number(value) : null)}
          options={departmentOptions}
          icon={Building2}
          placeholder={departmentsLoading ? 'Loading…' : 'All departments'}
          searchPlaceholder="Search departments…"
          clearable
        />
      </Field>

      {/* Only once there is something to discard — an always-there disabled
          button reads as a feature that never works. */}
      {selectedCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              onClick={onDiscard}
              disabled={isDiscarding}
            >
              <Trash2 className="size-4" />
              {isDiscarding ? 'Discarding…' : `Delete (${selectedCount})`}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Discard the selected salaries so the month can be processed again
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/** A labelled toolbar control — the same frame for each of the pickers. */
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
