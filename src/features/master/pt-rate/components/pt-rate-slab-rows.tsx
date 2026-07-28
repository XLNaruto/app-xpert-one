import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { GENDER_OPTIONS, MONTH_OPTIONS, SLAB_LABELS } from '../constants'
import type { PtRateFormValues } from '../schemas'

interface PtRateSlabRowsProps {
  register: UseFormRegister<PtRateFormValues>
  control: Control<PtRateFormValues>
  errors: FieldErrors<PtRateFormValues>
  /** `useFieldArray` rows — only their `id` is read, the values come from RHF. */
  fields: { id: string }[]
  onAdd: () => void
  onRemove: (index: number) => void
}

/**
 * The repeatable salary bands. Each row is one band: the salary range, the flat
 * amount deducted inside it and the month/gender/age it's limited to. A rate
 * always keeps at least one band, so the last row can't be removed.
 */
export function PtRateSlabRows({
  register,
  control,
  errors,
  fields,
  onAdd,
  onRemove,
}: PtRateSlabRowsProps) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 border-b-2 border-primary/30 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Layers className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Salary Slabs</h3>
            <p className="text-xs text-muted-foreground">
              {fields.length} {fields.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {/* The array-level message (e.g. "add at least one slab"). */}
      {errors.slabs?.message && (
        <p className="mt-3 text-xs text-destructive">{errors.slabs.message}</p>
      )}

      <div className="mt-4 space-y-4">
        {fields.map((field, index) => {
          const slabErrors = errors.slabs?.[index]
          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h4 className="text-sm font-medium text-foreground">
                    Slab {index + 1}
                  </h4>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove slab ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Field
                  label={SLAB_LABELS.minSalary}
                  required
                  error={slabErrors?.minSalary?.message}
                >
                  <Input
                    inputMode="decimal"
                    placeholder={SLAB_LABELS.minSalary}
                    {...register(`slabs.${index}.minSalary`)}
                  />
                </Field>

                <Field
                  label={SLAB_LABELS.maxSalary}
                  error={slabErrors?.maxSalary?.message}
                >
                  <Input
                    inputMode="decimal"
                    placeholder="Blank = Above"
                    {...register(`slabs.${index}.maxSalary`)}
                  />
                </Field>

                <Field
                  label={SLAB_LABELS.amount}
                  required
                  error={slabErrors?.amount?.message}
                >
                  <Input
                    inputMode="decimal"
                    placeholder={SLAB_LABELS.amount}
                    {...register(`slabs.${index}.amount`)}
                  />
                </Field>

                <Field
                  label={SLAB_LABELS.month}
                  required
                  error={slabErrors?.month?.message}
                >
                  <Controller
                    control={control}
                    name={`slabs.${index}.month`}
                    render={({ field: monthField }) => (
                      <Combobox
                        className="w-full"
                        value={monthField.value}
                        onChange={monthField.onChange}
                        options={MONTH_OPTIONS}
                        searchable={false}
                        placeholder="Select Month"
                      />
                    )}
                  />
                </Field>

                <Field
                  label={SLAB_LABELS.gender}
                  required
                  error={slabErrors?.gender?.message}
                >
                  <Controller
                    control={control}
                    name={`slabs.${index}.gender`}
                    render={({ field: genderField }) => (
                      <Combobox
                        className="w-full"
                        value={genderField.value}
                        onChange={(value) =>
                          genderField.onChange(value as PtRateFormValues['slabs'][number]['gender'])
                        }
                        options={GENDER_OPTIONS}
                        searchable={false}
                        placeholder="Select Gender"
                      />
                    )}
                  />
                </Field>

                <Field
                  label={SLAB_LABELS.minAge}
                  error={slabErrors?.minAge?.message}
                >
                  <Input
                    inputMode="numeric"
                    placeholder={SLAB_LABELS.minAge}
                    {...register(`slabs.${index}.minAge`)}
                  />
                </Field>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
