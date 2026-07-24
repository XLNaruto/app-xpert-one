import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/common/form-section'
import { cn } from '@/lib/utils'
import { departmentSchema, type DepartmentFormValues } from '../schemas'
import { BRANCH_OPTIONS, EMPTY_DEPARTMENT_FORM, MONTH_DAY_OPTIONS } from '../constants'

interface DepartmentFormProps {
  defaultValues?: DepartmentFormValues
  onSubmit: (values: DepartmentFormValues) => void
  isPending?: boolean
  submitLabel?: string
  onCancel?: () => void
}

/** Create/edit form for a department master record. */
export function DepartmentForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = 'Save Department',
  onCancel,
}: DepartmentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: defaultValues ?? EMPTY_DEPARTMENT_FORM,
  })

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <FormSection
        icon={Building}
        title="Department Detail"
        description="Branch and department identity"
        className="mt-0"
      />

      <Field label="Branch" required error={errors.branch?.message}>
        <Controller
          control={control}
          name="branch"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={BRANCH_OPTIONS}
              placeholder="Select Branch"
              searchPlaceholder="Search branch"
            />
          )}
        />
      </Field>
      <Field label="Department Name" required error={errors.departmentName?.message}>
        <Input placeholder="Department Name" {...register('departmentName')} />
      </Field>
      <Field label="Department Code" required error={errors.departmentCode?.message}>
        <Input placeholder="Department Code" {...register('departmentCode')} />
      </Field>
      <Field label="Month Start Date" required error={errors.monthStartDate?.message}>
        <Controller
          control={control}
          name="monthStartDate"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={MONTH_DAY_OPTIONS}
              placeholder="Select Day"
              searchPlaceholder="Search day"
            />
          )}
        />
      </Field>

      <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** A labelled form field with a required-marker and error text. */
function Field({
  label,
  required = false,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground/90">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
