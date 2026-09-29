import { Controller, type UseFormReturn } from 'react-hook-form'
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { frequencyLabel } from '@/features/office-task/common'
import type { SopGroupFormValues } from '../schemas'

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  label: string
  icon: typeof Copy
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40',
            danger && 'hover:bg-destructive/10 hover:text-destructive',
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** One editable checklist line: task, description, times a day and its two rules. */
export function ChecklistItemRow({
  form,
  index,
  count,
  onMove,
  onDuplicate,
  onRemove,
}: {
  form: UseFormReturn<SopGroupFormValues>
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const { register, control, watch, formState } = form
  const errors = formState.errors.items?.[index]
  const frequency = Number(watch(`items.${index}.frequency`)) || 0

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Move up" icon={ArrowUp} disabled={index === 0} onClick={() => onMove(index, index - 1)} />
          <IconButton label="Move down" icon={ArrowDown} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} />
          <IconButton label="Duplicate" icon={Copy} onClick={onDuplicate} />
          <IconButton label="Remove" icon={Trash2} danger disabled={count === 1} onClick={onRemove} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[2fr_2fr_1fr_auto_auto]">
        <Field label="Task Name" required error={errors?.task?.message}>
          <Input placeholder="e.g. Check housekeeping" {...register(`items.${index}.task`)} />
        </Field>
        <Field label="Description" error={errors?.description?.message}>
          <Input placeholder="Description" {...register(`items.${index}.description`)} />
        </Field>
        <Field
          label="Times per Day"
          required
          error={errors?.frequency?.message}
          hint="How many runs of this task each employee gets per day."
        >
          <Input inputMode="numeric" {...register(`items.${index}.frequency`)} />
          {!errors?.frequency && frequency > 0 && (
            <p className="text-xs text-muted-foreground">{frequencyLabel(frequency)}</p>
          )}
        </Field>
        <Field label="Photo Required">
          <Controller
            control={control}
            name={`items.${index}.photoRequired`}
            render={({ field }) => (
              <div className="flex h-9 items-center">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
        </Field>
        <Field label="Needs Approval">
          <Controller
            control={control}
            name={`items.${index}.needsApproval`}
            render={({ field }) => (
              <div className="flex h-9 items-center">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
        </Field>
      </div>
    </div>
  )
}
