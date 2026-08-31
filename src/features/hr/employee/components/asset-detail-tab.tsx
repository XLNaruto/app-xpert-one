import { Controller, type Control } from 'react-hook-form'
import { Boxes } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Forbidden } from '@/features/error'
import { ASSET_STATUS_OPTIONS } from '../constants'
import { useEmployeeAssetTab } from '../hooks/use-employee-asset-tab'
import { useAssetVariantOptions } from '../hooks/use-asset-variant-options'
import { takenVariantIds, withTakenAssetsDisabled } from '../lib/asset-row-picks'
import type { EmployeeAssetListFormValues } from '../schemas'
import { RepeatCard, RepeatCardBadge, RepeatSection } from './repeat-card'
import { StepFormFooter } from './step-form-footer'

/** Status → badge colour: issued is fine, returned is closed, lost needs chasing. */
const STATUS_VARIANT: Record<string, 'success' | 'default' | 'destructive'> = {
  ASSIGNED: 'success',
  RETURNED: 'default',
  LOST: 'destructive',
}

/**
 * The second of step 7's two dependent dropdowns: which variant of the picked
 * asset is being handed over.
 *
 * Conditional, not optional — an asset holds stock, or its variants do. This
 * field is rendered only for an asset that HAS variants, and is required there:
 * handing such an asset out without naming one is refused, since there is no
 * asset-level stock left to draw on. An asset with none takes no variant at all.
 *
 * The remaining count sits beside each name and a variant at zero is shown
 * greyed rather than left to fail server-side.
 */
function VariantField({
  control,
  index,
  assetId,
  value,
  taken,
  error,
}: {
  control: Control<EmployeeAssetListFormValues>
  index: number
  assetId: string
  value: string
  /** Variant ids the other rows already hold for this asset. */
  taken: string[]
  error?: string
}) {
  const { options, isLoading } = useAssetVariantOptions(assetId, value, taken)

  return (
    <Field
      label="Variant"
      required
      error={error}
      hint="Assigning a variant takes one unit off the shelf. A variant already on another card can't be picked twice."
    >
      <Controller
        control={control}
        name={`rows.${index}.variantId`}
        render={({ field: variant }) => (
          <Combobox
            className="w-full"
            value={variant.value}
            onChange={variant.onChange}
            options={options}
            placeholder={isLoading ? 'Loading…' : 'Select Variant'}
            searchPlaceholder="Search variant"
          />
        )}
      />
    </Field>
  )
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
    assetsById,
    onAssetChange,
    heldById,
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
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No assets issued to this employee. Save to continue, or add one.
          </p>
        ) : null}

        {fields.map((field, index) => {
          const errors = rowErrors?.[index]
          const row = form.watch(`rows.${index}`)
          // What the OTHER cards already hold — a unit can't be on two rows.
          const rows = form.watch('rows')
          const assetLabel = assetOptions.find((o) => o.value === row?.assetId)?.label
          // The master row behind the pick — it says whether this asset counts
          // its own stock or leaves that to its variants.
          const picked = row?.assetId ? assetsById.get(row.assetId) : undefined

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={assetLabel || `Asset ${index + 1}`}
              badge={
                <span className="flex items-center gap-2">
                  {row?.status ? (
                    <RepeatCardBadge variant={STATUS_VARIANT[row.status] ?? 'secondary'}>
                      {row.status}
                    </RepeatCardBadge>
                  ) : null}
                  {/* Drive "still out" off stock_held, never off the status: a
                      consumable reads RETURNED and still holds its unit. */}
                  {row?.id !== undefined && heldById.get(row.id) ? (
                    <RepeatCardBadge variant="warning">Holding a unit</RepeatCardBadge>
                  ) : null}
                </span>
              }
              hasError={Boolean(errors)}
              onRemove={() => removeRow(index)}
            >
              <Field label="Asset Name" required error={errors?.assetId?.message}>
                <Controller
                  control={form.control}
                  name={`rows.${index}.assetId`}
                  render={({ field: asset }) => (
                    <Combobox
                      className="w-full"
                      value={asset.value}
                      // A variant belongs to exactly one asset, so switching
                      // the asset drops the variant with it.
                      onChange={(next) => onAssetChange(index, next)}
                      options={withTakenAssetsDisabled(
                        assetOptions,
                        rows,
                        index,
                        assetsById,
                      )}
                      placeholder={isAssetsLoading ? 'Loading…' : 'Select Asset'}
                      searchPlaceholder="Search asset"
                    />
                  )}
                />
              </Field>

              {/* An asset holds stock, or its variants do. Only one of these two
                  is ever the right question to ask about a handout. */}
              {picked && picked.variantCount > 0 ? (
                <VariantField
                  control={form.control}
                  index={index}
                  assetId={row.assetId}
                  value={row?.variantId ?? ''}
                  taken={takenVariantIds(rows, index, row.assetId)}
                  error={errors?.variantId?.message}
                />
              ) : picked ? (
                <Field
                  className="min-w-0"
                  label="Stock"
                  hint="This asset has no variants, so a handout draws on its own stock. It must have stock on the shelf before it can be issued."
                >
                  {/* Wraps rather than runs on: the column is a quarter of the
                      card on a wide screen, and a nowrap row of pills spilled
                      over the field beside it. */}
                  <div className="flex min-h-9 flex-wrap items-center gap-2">
                    {picked.quantity === 0 ? (
                      // Every asset that predates variants reads 0, so the first
                      // direct handout is refused until someone refills it.
                      <RepeatCardBadge variant="warning">No stock</RepeatCardBadge>
                    ) : (
                      <span className="text-sm text-foreground">
                        {picked.quantity} left on the shelf
                      </span>
                    )}
                    {!picked.isReturnable && (
                      <RepeatCardBadge variant="secondary">Consumable</RepeatCardBadge>
                    )}
                  </div>
                </Field>
              ) : null}

              <DateField
                control={form.control}
                name={`rows.${index}.assignedDate`}
                label="Assigned Date"
                required
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
        hint="When an asset comes back, set its status to Returned rather than removing the card — the bin is for a card entered by mistake."
      />
    </form>
  )
}
