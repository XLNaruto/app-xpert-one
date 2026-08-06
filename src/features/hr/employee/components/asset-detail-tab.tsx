import { Controller } from 'react-hook-form'
import { Boxes } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Forbidden } from '@/features/error'
import { ASSET_STATUS_OPTIONS } from '../constants'
import { useEmployeeAssetTab } from '../hooks/use-employee-asset-tab'
import { RepeatCard, RepeatCardBadge, RepeatSection } from './repeat-card'
import { StepFormFooter } from './step-form-footer'

/** Status → badge colour: issued is fine, returned is closed, lost needs chasing. */
const STATUS_VARIANT: Record<string, 'success' | 'default' | 'destructive'> = {
  ASSIGNED: 'success',
  RETURNED: 'default',
  LOST: 'destructive',
}

/**
 * Step 7 — Assets, as a list of inline cards.
 *
 * The status badge on each card is the point of the screen: what's still out with
 * the employee is what has to be collected when they leave.
 */
export function AssetDetailTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const {
    form,
    fields,
    addRow,
    removeRow,
    assetOptions,
    isAssetsLoading,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    onSubmit,
    isSaving,
  } = useEmployeeAssetTab({ employeeId, onSaved: onContinue })

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
        {error instanceof Error ? error.message : "Couldn't load the assets."}
      </p>
    )
  }

  const rowErrors = form.formState.errors.rows

  return (
    <form onSubmit={onSubmit} noValidate>
      <RepeatSection
        first
        icon={Boxes}
        title="Employee Assets"
        count={fields.length}
        addLabel="Add Asset"
        onAdd={addRow}
      >
        {fields.map((field, index) => {
          const errors = rowErrors?.[index]
          const row = form.watch(`rows.${index}`)
          const assetLabel = assetOptions.find((o) => o.value === row?.assetId)?.label

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={assetLabel || `Asset ${index + 1}`}
              badge={
                row?.status ? (
                  <RepeatCardBadge variant={STATUS_VARIANT[row.status] ?? 'secondary'}>
                    {row.status}
                  </RepeatCardBadge>
                ) : undefined
              }
              hasError={Boolean(errors)}
              onRemove={() => removeRow(index)}
              canRemove={fields.length > 1 || Boolean(row?.id)}
            >
              <Field label="Asset Name" required error={errors?.assetId?.message}>
                <Controller
                  control={form.control}
                  name={`rows.${index}.assetId`}
                  render={({ field: asset }) => (
                    <Combobox
                      className="w-full"
                      value={asset.value}
                      onChange={asset.onChange}
                      options={assetOptions}
                      placeholder={isAssetsLoading ? 'Loading…' : 'Select Asset'}
                      searchPlaceholder="Search asset"
                    />
                  )}
                />
              </Field>

              <DateField
                control={form.control}
                name={`rows.${index}.assignedDate`}
                label="Assigned Date"
                error={errors?.assignedDate?.message}
              />

              <DateField
                control={form.control}
                name={`rows.${index}.validTill`}
                label="Valid Till"
                error={errors?.validTill?.message}
                hint="When the asset is due back, for anything issued on loan."
                minDate={
                  row?.assignedDate ? new Date(`${row.assignedDate}T00:00:00`) : undefined
                }
              />

              <Field label="Status" required error={errors?.status?.message}>
                <Controller
                  control={form.control}
                  name={`rows.${index}.status`}
                  render={({ field: status }) => (
                    <Combobox
                      className="w-full"
                      searchable={false}
                      value={status.value}
                      onChange={status.onChange}
                      options={ASSET_STATUS_OPTIONS}
                      placeholder="Select status"
                    />
                  )}
                />
              </Field>

              <Field
                label="Remarks"
                error={errors?.remarks?.message}
                className="md:col-span-2"
              >
                <Textarea
                  rows={2}
                  placeholder="Serial number, condition, anything worth noting"
                  {...form.register(`rows.${index}.remarks`)}
                />
              </Field>
            </RepeatCard>
          )
        })}
      </RepeatSection>

      <StepFormFooter
        onBack={onBack}
        isSaving={isSaving}
        hint="At least one asset is required; when one comes back, set its status to Returned rather than removing the card."
      />
    </form>
  )
}
