import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { assetVariantSchema, type AssetVariantFormValues } from '../schemas'
import { EMPTY_ASSET_VARIANT_FORM } from '../constants'
import {
  useCreateAssetVariant,
  useUpdateAssetVariant,
} from '../api/use-asset-variant-mutations'
import { variantToFormValues } from '../lib/asset-variant-mappers'
import type { AssetVariant } from '../types'

interface UseAssetVariantFormArgs {
  /** The asset the variant hangs off — it can never be changed by an edit. */
  assetId: number
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** The variant being edited, or `null` to create a new one. */
  record: AssetVariant | null
  /** Called after a successful save (usually closes the dialog). */
  onSaved: () => void
}

/**
 * The variant form for both create and edit.
 *
 * `quantity` is an **absolute level** here, not a movement: the box shows what's
 * on the shelf, and the server turns any difference into an `ADJUSTMENT` line.
 * Buying units in or writing them off is the stock form's job, so that the
 * ledger records why.
 */
export function useAssetVariantForm({
  assetId,
  open,
  record,
  onSaved,
}: UseAssetVariantFormArgs) {
  const isEdit = record !== null
  const createVariant = useCreateAssetVariant(assetId)
  const updateVariant = useUpdateAssetVariant(assetId)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetVariantFormValues>({
    resolver: zodResolver(assetVariantSchema),
    defaultValues: EMPTY_ASSET_VARIANT_FORM,
  })

  // Sync the form to the record whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return
    reset(record ? variantToFormValues(record) : EMPTY_ASSET_VARIANT_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateVariant.mutateAsync({ id: record.id, values })
      : createVariant.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'Variant updated' : 'Variant added')
        onSaved()
      })
      // A 409 names the duplicate; leave the form as it was so the user can
      // rename rather than retype.
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save the variant.")))
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: createVariant.isPending || updateVariant.isPending,
  }
}
