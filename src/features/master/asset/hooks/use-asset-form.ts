import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { assetSchema, type AssetFormValues } from '../schemas'
import { EMPTY_ASSET_FORM } from '../constants'
import { useCreateAsset, useUpdateAsset } from '../api/use-asset-mutations'
import { assetToFormValues } from '../lib/asset-mappers'
import type { AssetRecord } from '../types'

interface UseAssetFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** The record being edited, or `null` to create a new one. */
  record: AssetRecord | null
  /** Called after a successful save (usually closes the dialog). */
  onSaved: () => void
}

/**
 * Owns the asset master form for both create and edit: validation, seeding from
 * the edited record and the POST/PUT on submit. The dialog only lays out fields.
 */
export function useAssetForm({ open, record, onSaved }: UseAssetFormArgs) {
  const isEdit = record !== null
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()

  /**
   * An asset with variants no longer owns its stock — the variants do. Both
   * fields are refused with a 409 for one, so the form neither shows nor sends
   * them. `variantCount` only rides on list rows, which is where the dialog is
   * opened from.
   */
  const hasVariants = (record?.variantCount ?? 0) > 0

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: EMPTY_ASSET_FORM,
  })

  // Sync the form to the record whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return
    reset(record ? assetToFormValues(record) : EMPTY_ASSET_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateAsset.mutateAsync({ id: record.id, values, withStock: !hasVariants })
      : createAsset.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'Asset updated' : 'Asset added')
        onSaved()
      })
      // A 409 names what's in the way — an asset that has variants, say.
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save the asset.")))
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    /** Hides the stock fields: they belong to the variants from now on. */
    hasVariants,
    isPending: createAsset.isPending || updateAsset.isPending,
  }
}
