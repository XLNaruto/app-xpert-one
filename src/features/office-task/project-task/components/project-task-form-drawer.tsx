import { Controller } from 'react-hook-form'
import { parseISO } from 'date-fns'
import { BellRing, CalendarRange, ClipboardList, Lock, ShieldCheck, UserRound, Users } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Sheet, SheetBody, SheetFooter, SheetHeader } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ScopedDataError } from '@/features/company'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  frequencyLabel,
  PRIORITY_OPTIONS,
  type Priority,
  UPDATE_FREQUENCY_OPTIONS,
  type UpdateFrequency,
} from '@/features/office-task/common'
import { PROJECT_PICK_BY_OPTIONS } from '../constants'
import type { ProjectPickBy } from '../schemas'
import { useProjectTaskForm } from '../hooks/use-project-task-form'

const FORM_ID = 'project-task-form'

function RuleSwitch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string 
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-4 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}

function ProjectTaskForm({ id, onClose }: { id?: number; onClose: () => void }) {
  const f = useProjectTaskForm(id, onClose)
  const { register, control, formState: { errors } } = f.form

  return (
    <>
      <SheetHeader
        title={f.isEdit ? 'Edit Project Task' : 'Add Project Task'}
        description="Who It's For, the Work, Its Schedule and How It Gets Signed Off."
        onClose={onClose}
      />
      <SheetBody>
        {f.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : f.isError ? (
          <ScopedDataError error={f.error} fallback="This project task could not be found." what="project tasks" />
        ) : (
          <form id={FORM_ID} onSubmit={f.onSubmit} noValidate className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {(f.isCompleted || f.hasStartedWork) && (
              <p className="col-span-full flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-700 dark:text-sky-400">
                <Lock className="mt-0.5 size-4 shrink-0" />
                {f.isCompleted
                  ? 'Every Assignee Has Completed This Task, So It Is Read-Only.'
                  : f.pickBy === 'other'
                    ? 'Work Has Started, So the Task Name, the Mobile Number, the Start Date and Its Rules Are Fixed. You Can Still Change the Name, Delegate, Description, Priority, Deadline and Progress Updates.'
                    : 'Work Has Started, So the Task Name, Who It Targets, the Start Date and Its Rules Are Fixed. You Can Still Change the Description, Priority, Deadline and Progress Updates, and Add People.'}
              </p>
            )}
            <FormSection icon={Users} title="Who It's For" className="mt-0" />
            <Field label="Pick People By" required>
              <Combobox
                className="w-full"
                value={f.pickBy}
                onChange={(v) => f.changePickBy((v || 'designation') as ProjectPickBy)}
                options={PROJECT_PICK_BY_OPTIONS}
                searchable={false}
                disabled={f.isLocked('pick_by')}
              />
            </Field>
            {f.pickBy === 'other' ? (
              <>
                <p className="flex items-start gap-2 self-end text-xs text-muted-foreground sm:pb-2">
                  <UserRound className="mt-0.5 size-3.5 shrink-0" />
                  Someone outside your staff — they sign in to the employee app with this mobile's OTP.
                </p>
                <Field label="Full Name" required error={errors.otherName?.message}>
                  <Input placeholder="Enter Full Name" disabled={f.isCompleted} {...register('otherName')} />
                </Field>
                <Field
                  label="Mobile Number"
                  required
                  error={errors.otherMobile?.message}
                  hint={f.otherStarted ? 'They Have Started, So the Number Is Fixed.' : undefined}
                >
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter Mobile Number"
                    disabled={f.isCompleted || f.otherStarted}
                    {...register('otherMobile')}
                  />
                </Field>
                <Field
                  label="Updated By (Delegate)"
                  error={errors.delegate?.message}
                  hint="Optional — One Employee or Panel User Who Can Update This Task for Them from Their Own My Tasks."
                  className="col-span-full"
                >
                  <Controller
                    control={control}
                    name="delegate"
                    render={({ field }) => (
                      <Combobox
                        className="w-full"
                        clearable
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? '')}
                        options={f.delegateSelect.options}
                        loading={f.delegateSelect.loading}
                        onScrollEnd={f.delegateSelect.onScrollEnd}
                        onSearchChange={f.delegateSelect.onSearchChange}
                        placeholder={f.delegateSelect.error ? "Couldn't Load People" : 'Nobody — Only They Update It'}
                        searchPlaceholder="Search Name or Code"
                        disabled={f.isCompleted}
                      />
                    )}
                  />
                </Field>
              </>
            ) : (
              <>
              {f.pickBy === 'designation' ? (
                <Field label="Designation" required error={errors.designationId?.message}>
                  <Controller
                    control={control}
                    name="designationId"
                    render={({ field }) => (
                      <Combobox
                        className="w-full"
                        value={field.value}
                        onChange={(v) => f.changeTarget('designationId', v)}
                        {...f.designationSelect}
                        placeholder="Select Designation"
                        searchPlaceholder="Search Designation"
                        disabled={f.isLocked('designation_id')}
                      />
                    )}
                  />
                </Field>
              ) : (
                <Field label="Role" required error={errors.roleId?.message}>
                  <Controller
                    control={control}
                    name="roleId"
                    render={({ field }) => (
                      <Combobox
                        className="w-full"
                        value={field.value}
                        onChange={(v) => f.changeTarget('roleId', v)}
                        {...f.roleSelect}
                        placeholder="Select Role"
                        searchPlaceholder="Search Role"
                        disabled={f.isLocked('role_id')}
                      />
                    )}
                  />
                </Field>
              )}
              <Field label="Assign To" required error={errors.employeeIds?.message} className="col-span-full">
                <Controller
                  control={control}
                  name="employeeIds"
                  render={({ field }) => (
                    <Combobox
                      multiple
                      className="w-full"
                      value={field.value}
                      onChange={f.setEmployees}
                      options={f.employeeOptions}
                      loading={f.employeeSelect.loading}
                      onScrollEnd={f.employeeSelect.onScrollEnd}
                      onSearchChange={f.employeeSelect.onSearchChange}
                      placeholder={
                        !f.picked
                          ? `Pick a ${f.pickBy} first`
                          : f.employeeSelect.error
                            ? "Couldn't Load Employees"
                            : f.employeeOptions.length || f.employeeSelect.loading
                            ? 'Select One or More People'
                            : `Nobody has this ${f.pickBy}`
                      }
                      searchPlaceholder="Search Name or Code"
                      disabled={f.isLocked('people') || (!f.picked && f.employeeOptions.length === 0)}
                    />
                  )}
                />
                {!!f.employeeSelect.error && (
                  <p className="text-xs text-destructive">
                    {getApiErrorMessage(f.employeeSelect.error, "Couldn't load the employees.")}
                  </p>
                )}
                {f.pickBy === 'role' && f.picked && (
                  <p className="text-xs text-muted-foreground">
                    A role's work goes to the panel users who hold it.
                  </p>
                )}
                {f.matchingCount > 0 && !f.isLocked('people') && (
                  <button
                    type="button"
                    onClick={f.toggleSelectAll}
                    className="cursor-pointer text-xs font-medium text-primary hover:underline"
                  >
                    {f.allSelected ? 'Clear All' : `Select all ${f.matchingCount} listed`}
                  </button>
                )}
              </Field>
              </>
            )}

            <FormSection icon={ClipboardList} title="The Work" />
            <Field label="Task Name" required error={errors.task?.message} className="col-span-full">
              <Input placeholder="What Needs to Be Done" disabled={f.isLocked('task')} {...register('task')} />
            </Field>
            <Field label="Priority" required>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={(v) => field.onChange((v || 'medium') as Priority)}
                    options={PRIORITY_OPTIONS}
                    searchable={false}
                    disabled={f.isLocked('priority')}
                  />
                )}
              />
            </Field>
            <Field label="Description" error={errors.description?.message} className="col-span-full">
              <Textarea
                rows={3}
                placeholder="Optional Detail"
                disabled={f.isLocked('description')}
                {...register('description')}
              />
            </Field>

            <FormSection icon={CalendarRange} title="Schedule" />
            <Field
              label="Progress Updates"
              required
              error={errors.updatesPerDay?.message}
              hint="How Many Progress Updates Each Assignee Records per Period — 2 + Weekly Means Twice a Week (Monday to Sunday). Updates Are Spread over 09:00–19:00 IST: The Assignee Is Reminded When One Is Due, and the Assignee, Delegate and You Are Alerted If It Is Missed."
              className="col-span-full"
            >
              {/* One control, two inputs: the count and its period share an
                  edge, so the pair reads as a single bordered box. */}
              <div className="flex sm:w-64">
                <Input
                  inputMode="numeric"
                  className="flex-1 rounded-r-none"
                  aria-invalid={errors.updatesPerDay ? true : undefined}
                  disabled={f.isLocked('updates_per_day')}
                  {...register('updatesPerDay')}
                />
                <Controller
                  control={control}
                  name="updateFrequency"
                  render={({ field }) => (
                    <Combobox
                      className="w-28 shrink-0"
                      triggerClassName="rounded-l-none border-l-0"
                      searchable={false}
                      value={field.value}
                      onChange={(v) => field.onChange((v || 'daily') as UpdateFrequency)}
                      options={UPDATE_FREQUENCY_OPTIONS}
                      // Never in `locked_fields` — only a completed task fixes it.
                      disabled={f.isCompleted}
                    />
                  )}
                />
              </div>
              {!errors.updatesPerDay && f.updatesPerDay > 0 && (
                <p className="text-xs text-muted-foreground">{frequencyLabel(f.updatesPerDay, f.updateFrequency)}</p>
              )}
            </Field>
            <DateField
              control={control}
              name="startDate"
              label="Starts On"
              required
              disabled={f.isLocked('start_date')}
              error={errors.startDate?.message}
            />
            <DateField
              control={control}
              name="deadline"
              label="Deadline"
              required
              minDate={f.startDate ? parseISO(f.startDate) : undefined}
              disabled={f.isLocked('deadline')}
              error={errors.deadline?.message}
            />

            <FormSection icon={ShieldCheck} title="Rules" />
            <Controller
              control={control}
              name="photoRequired"
              render={({ field }) => (
                <RuleSwitch
                  label="Photo Required"
                  hint="Proof Must Be Uploaded Before Completing."
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={f.isLocked('photo_required')}
                />
              )}
            />
            <Controller
              control={control}
              name="needsVerification"
              render={({ field }) => (
                <RuleSwitch
                  label="Needs Verification"
                  hint="Completed Work Waits for Sign-Off in Task Approval."
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={f.isLocked('needs_verification')}
                />
              )}
            />
            {f.canSave && f.saveNotice && (
              <p
                className={
                  f.saveNotice.tone === 'warn'
                    ? 'col-span-full flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400'
                    : 'col-span-full flex items-start gap-2 text-xs text-muted-foreground'
                }
              >
                <BellRing className="mt-0.5 size-3.5 shrink-0" />
                {f.saveNotice.text}
              </p>
            )}
          </form>
        )}
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={f.isPending}>
          {f.canSave ? 'Cancel' : 'Close'}
        </Button>
        {f.canSave && (
          <Button type="submit" form={FORM_ID} disabled={f.isPending || f.isLoading}>
            {f.isPending ? 'Saving…' : f.isEdit ? 'Save Changes' : 'Add Task'}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

/** Add / edit a project task without leaving the list. */
export function ProjectTaskFormDrawer({
  open,
  id,
  onClose,
}: {
  open: boolean
  id?: number
  onClose: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Keyed so every opening starts a fresh form. */}
      {open && <ProjectTaskForm key={id ?? 'new'} id={id} onClose={onClose} />}
    </Sheet>
  )
}
