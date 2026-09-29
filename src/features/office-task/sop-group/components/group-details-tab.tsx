import { Controller } from 'react-hook-form'
import { ClipboardList, ListChecks, Plus } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { PICK_BY_OPTIONS, type PickBy } from '@/features/office-task/common'
import type { SopGroupForm } from '../hooks/use-sop-group-form'
import { ChecklistItemRow } from './checklist-item-row'

/** Tab 1 — the group's name, who it applies to, and its checklist. */
export function GroupDetailsTab({ f }: { f: SopGroupForm }) {
  const { register, control, formState: { errors } } = f.form
  const lockHint = f.targetLocked ? 'Employees already run this group, so who it applies to is fixed.' : undefined

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
      <FormSection icon={ClipboardList} title="Group Details" className="mt-0" />
      <Field label="Group Name" required error={errors.name?.message}>
        <Input placeholder="e.g. Office Opening Checklist" {...register('name')} />
      </Field>
      <Field label="Assign By" required hint={lockHint}>
        <Combobox
          className="w-full"
          value={f.pickBy}
          onChange={(v) => f.changePickBy((v || 'designation') as PickBy)}
          options={PICK_BY_OPTIONS}
          searchable={false}
          disabled={f.targetLocked}
        />
      </Field>
      {f.pickBy === 'designation' ? (
        <Field label="Designation" required error={errors.designationId?.message} hint={lockHint}>
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
                searchPlaceholder="Search designation"
                disabled={f.targetLocked}
              />
            )}
          />
        </Field>
      ) : (
        <Field label="Role" required error={errors.roleId?.message} hint={lockHint}>
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
                searchPlaceholder="Search role"
                disabled={f.targetLocked}
              />
            )}
          />
        </Field>
      )}

      <FormSection
        icon={ListChecks}
        title="Checklist"
        description={`Every assigned employee gets these · ${f.checklistPerDay} task${f.checklistPerDay === 1 ? '' : 's'} per day`}
      />
      <div className="col-span-full space-y-3">
        {f.isEdit && f.targetLocked && (
          <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-700 dark:text-sky-400">
            Checklist changes apply to employees you assign from now on. People already running this group keep the checklist they were given.
          </p>
        )}
        {f.items.fields.map((field, index) => (
          <ChecklistItemRow
            key={field.id}
            form={f.form}
            index={index}
            count={f.items.fields.length}
            onMove={f.items.move}
            onDuplicate={() => f.duplicateItem(index)}
            onRemove={() => f.removeItem(index)}
          />
        ))}
        {errors.items?.root?.message && <p className="text-xs text-destructive">{errors.items.root.message}</p>}
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={f.addItem}>
            <Plus className="size-4" />
            Add Checklist Task
          </Button>
        </div>
      </div>
    </div>
  )
}
