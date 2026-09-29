import { useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarRange, ChevronsDownUp, ChevronsUpDown, Users } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import type { SopGroupForm } from '../hooks/use-sop-group-form'
import { AssigneeTaskGroup } from './assignee-task-group'

/**
 * Tab 2 — who runs this group. People come from the designation/role picked in
 * Tab 1; each gets the whole checklist plus their own custom tasks, for one
 * shared period.
 */
export function AssignEmployeesTab({ f }: { f: SopGroupForm }) {
  const { control, formState: { errors } } = f.form
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const target = f.targetName

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
      <FormSection
        icon={CalendarRange}
        title="Period"
        description="For the employees you add now — people already assigned keep the period shown on their card"
        className="mt-0"
      />
      <DateField
        control={control}
        name="effectiveFrom"
        label="Effective From"
        required={f.newAssignees > 0}
        hint="Daily tasks are created from this date."
        error={errors.effectiveFrom?.message}
      />
      <DateField
        control={control}
        name="effectiveTo"
        label="Effective To"
        hint="Leave empty to run until stopped."
        minDate={f.effectiveFrom ? parseISO(f.effectiveFrom) : undefined}
        error={errors.effectiveTo?.message}
      />

      <FormSection
        icon={Users}
        title="Employees"
        description={
          f.picked
            ? f.pickBy === 'role'
              ? `Panel users who hold the ${target || '—'} role`
              : `People whose designation is ${target || '—'}`
            : `Pick a ${f.pickBy} in Group Details first`
        }
      />
      <Field label="Select Employees">
        <Combobox
          multiple
          className="w-full"
          value={f.pickedIds}
          onChange={f.setEmployees}
          options={f.employeeOptions}
          loading={f.employeeSelect.loading}
          onScrollEnd={f.employeeSelect.onScrollEnd}
          onSearchChange={f.employeeSelect.onSearchChange}
          placeholder={
            !f.picked
              ? `Pick a ${f.pickBy} first`
              : f.employeeSelect.error
                ? "Couldn't load employees"
                : f.employeeOptions.length || f.employeeSelect.loading
                ? 'Select one or more employees'
                : `Nobody has this ${f.pickBy}`
          }
          searchPlaceholder="Search name or code"
          disabled={!f.picked}
          maxVisibleLabels={3}
        />
        {!!f.employeeSelect.error && (
          <p className="text-xs text-destructive">
            {getApiErrorMessage(f.employeeSelect.error, "Couldn't load the employees.")}
          </p>
        )}
        {f.assignableCount > 0 && (
          <button
            type="button"
            onClick={f.toggleAll}
            className="cursor-pointer text-xs font-medium text-primary hover:underline"
          >
            {f.allPicked ? 'Clear all' : `Select all ${f.assignableCount} listed`}
          </button>
        )}
      </Field>

      <div className="col-span-full">
        {f.assignees.fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Selected employees appear here with the group checklist. Add custom tasks for anyone who needs extra work.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {f.assignees.fields.length} employee{f.assignees.fields.length === 1 ? '' : 's'}
                {f.newAssignees > 0 && ` · ${f.newAssignees} new`}
              </span>
              {/* Segmented control — the state everything is in stays highlighted. */}
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                {(
                  [
                    {
                      label: 'Expand all',
                      icon: ChevronsUpDown,
                      active: collapsed.size === 0,
                      onClick: () => setCollapsed(new Set()),
                    },
                    {
                      label: 'Collapse all',
                      icon: ChevronsDownUp,
                      active: collapsed.size === f.assignees.fields.length,
                      onClick: () => setCollapsed(new Set(f.assignees.fields.map((x) => x.id))),
                    },
                  ] as const
                ).map(({ label, icon: Icon, active, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className={cn(
                      'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                      'outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      active
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {f.assignees.fields.map((field, index) => (
                <AssigneeTaskGroup
                  key={field.id}
                  f={f}
                  index={index}
                  expanded={!collapsed.has(field.id)}
                  onToggle={() => toggle(field.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
