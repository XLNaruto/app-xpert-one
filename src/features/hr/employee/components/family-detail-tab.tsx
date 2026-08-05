import { Controller } from 'react-hook-form'
import { Users } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Forbidden } from '@/features/error'
import { RELATION_OPTIONS } from '../constants'
import { useEmployeeFamilyTab } from '../hooks/use-employee-family-tab'
import { RepeatCard, RepeatCardBadge, RepeatSection } from './repeat-card'
import { StepFormFooter } from './step-form-footer'

/**
 * Step 4 — Family Detail, as a list of inline cards.
 *
 * Relation and name sit in one joined control because they read as one answer —
 * "Father: Ramesh" — and the API stores them as two columns of the same row.
 *
 * The nominee switch matters beyond the record: it's who a PF or gratuity claim is
 * settled with, so the card header carries a badge for it. The API doesn't enforce a
 * single nominee, so more than one card may show it — that's what's stored.
 */
export function FamilyDetailTab({
  employeeId,
  onContinue,
  onClose,
}: {
  employeeId: number
  onContinue: () => void
  onClose: () => void
}) {
  const {
    form,
    fields,
    addRow,
    removeRow,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    onSubmit,
    onSubmitAndClose,
    isSaving,
  } = useEmployeeFamilyTab({ employeeId, onSaved: onContinue, onClose })

  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error instanceof Error ? error.message : "Couldn't load the family detail."}
      </p>
    )
  }

  const rowErrors = form.formState.errors.rows

  return (
    <form onSubmit={onSubmit} noValidate>
      <RepeatSection
        first
        icon={Users}
        title="Family Members"
        count={fields.length}
        addLabel="Add"
        onAdd={addRow}
      >
        {fields.map((field, index) => {
          const errors = rowErrors?.[index]
          const row = form.watch(`rows.${index}`)
          const label =
            row?.fullName?.trim() || row?.relation
              ? [row.relation, row.fullName].filter(Boolean).join(' — ')
              : `Member ${index + 1}`

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={label}
              badge={
                row?.isNominee ? (
                  <RepeatCardBadge variant="success">Nominee</RepeatCardBadge>
                ) : undefined
              }
              hasError={Boolean(errors)}
              onRemove={() => removeRow(index)}
              canRemove={fields.length > 1 || Boolean(row?.id)}
            >
              {/*
                Relation + name as one joined control: the select loses its right
                border and radius, the input its left, so the pair reads as a
                single field with a leading dropdown.
              */}
              <Field
                label="Full Name"
                required
                error={errors?.fullName?.message ?? errors?.relation?.message}
                className="md:col-span-2"
              >
                <div className="flex">
                  <Controller
                    control={form.control}
                    name={`rows.${index}.relation`}
                    render={({ field: relation }) => (
                      <Combobox
                        className="w-36 shrink-0"
                        triggerClassName="rounded-r-none border-r-0"
                        value={relation.value}
                        onChange={relation.onChange}
                        options={RELATION_OPTIONS}
                        placeholder="Relation"
                        searchPlaceholder="Search relation"
                      />
                    )}
                  />
                  <Input
                    className="rounded-l-none"
                    placeholder="Full Name"
                    aria-invalid={errors?.fullName ? true : undefined}
                    {...form.register(`rows.${index}.fullName`)}
                  />
                </div>
              </Field>

              <DateField
                control={form.control}
                name={`rows.${index}.birthDate`}
                label="Birth Date"
                optional
                error={errors?.birthDate?.message}
                maxDate={new Date()}
              />

              <Field
                label="Aadhar Number"
                optional
                error={errors?.aadharNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Aadhar Number"
                  aria-invalid={errors?.aadharNumber ? true : undefined}
                  {...form.register(`rows.${index}.aadharNumber`)}
                />
              </Field>

              <Controller
                control={form.control}
                name={`rows.${index}.isNominee`}
                render={({ field: nominee }) => (
                  <div className="flex items-end pb-1.5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <Switch
                        checked={nominee.value}
                        onCheckedChange={nominee.onChange}
                        aria-label="This member is the nominee"
                      />
                      <span className="text-sm text-foreground/90">Is Nominee?</span>
                    </label>
                  </div>
                )}
              />
            </RepeatCard>
          )
        })}
      </RepeatSection>

      <StepFormFooter
        onCancel={onClose}
        onSaveAndClose={onSubmitAndClose}
        isSaving={isSaving}
        saveLabel="Save Family Detail"
        hint="Blank cards are ignored — remove a saved member to delete it on save."
      />
    </form>
  )
}
