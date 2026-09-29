import { Controller } from 'react-hook-form'
import { parseISO } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { PRIORITY_OPTIONS } from '@/features/office-task/common'
import { useBulkEditForm } from '../hooks/use-bulk-edit-form'

/** Shown while rows are ticked — set priority and dates on all of them at once. */
export function ProjectTaskBulkBar({ ids, onClear }: { ids: number[]; onClear: () => void }) {
  const { form, touched, onSubmit, isPending } = useBulkEditForm(ids, onClear)
  const { control, watch, formState: { errors } } = form
  const startDate = watch('startDate')

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
    >
      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
        {ids.length} selected
      </span>
      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <Combobox
            className="w-40"
            value={field.value}
            onChange={field.onChange}
            options={PRIORITY_OPTIONS}
            placeholder="Priority"
            searchable={false}
            clearable
          />
        )}
      />
      <Controller
        control={control}
        name="startDate"
        render={({ field }) => (
          <DatePicker value={field.value} onChange={field.onChange} className="w-40" />
        )}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Controller
        control={control}
        name="deadline"
        render={({ field }) => (
          <DatePicker
            value={field.value}
            onChange={field.onChange}
            minDate={startDate ? parseISO(startDate) : undefined}
            className="w-40"
          />
        )}
      />
      {errors.deadline?.message && <span className="text-xs text-destructive">{errors.deadline.message}</span>}
      <div className="ml-auto flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!touched || isPending}>
          {isPending ? 'Applying…' : 'Apply'}
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Clear selection" onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>
    </form>
  )
}
