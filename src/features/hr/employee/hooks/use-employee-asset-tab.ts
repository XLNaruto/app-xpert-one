import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useAssets } from '@/features/master/asset'
import {
  ASSET_ROW_KEYS,
  employeeAssetListSchema,
  type EmployeeAssetFormValues,
  type EmployeeAssetListFormValues,
} from '../schemas'
import { EMPTY_EMPLOYEE_ASSET_FORM } from '../constants'
import { useEmployeeAssets } from '../api/use-employee-steps'
import {
  useCreateEmployeeAsset,
  useDeleteEmployeeAsset,
  useUpdateEmployeeAsset,
} from '../api/use-employee-step-mutations'
import { assetToFormValues } from '../lib/employee-step-mappers'
import { isBlankRow, saveRows } from '../lib/save-rows'
import { useRowSeed } from './use-row-seed'

/**
 * Step 7 — assets issued to the employee, as one card list with one Save.
 *
 * An asset coming back is a **status change**, not a removal: the row records that
 * it was issued, and flipping it to `RETURNED` keeps that fact. The bin is for a card
 * entered by mistake — which is why the footer says so. It empties the list when
 * that's the last card: holding no assets is a valid state for the step.
 */
export function useEmployeeAssetTab({
  employeeId,
  onSaved,
}: {
  employeeId: number
  onSaved: () => void
}) {
  const list = useEmployeeAssets(employeeId)
  const createAsset = useCreateEmployeeAsset(employeeId)
  const updateAsset = useUpdateEmployeeAsset(employeeId)
  const deleteAsset = useDeleteEmployeeAsset(employeeId)

  const assetMaster = useAssets()

  const form = useForm<EmployeeAssetListFormValues>({
    resolver: zodResolver(employeeAssetListSchema),
    defaultValues: { rows: [EMPTY_EMPLOYEE_ASSET_FORM] },
  })
  const { control, handleSubmit, reset } = form
  const rows = useFieldArray({ control, name: 'rows' })

  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Seed from the server, and again after each save — but never mid-save.
  useRowSeed(list.data, isSaving, (assets) => {
    reset({
      rows:
        assets.length > 0
          ? assets.map((asset) => ({ id: asset.id, ...assetToFormValues(asset) }))
          : [EMPTY_EMPLOYEE_ASSET_FORM],
    })
    setRemovedIds([])
  })

  /**
   * The asset master, by id — what tells the form whether the picked asset holds
   * its own stock or hands that job to its variants. `variantCount` rides on the
   * LIST rows, which is what this read returns.
   */
  const assetsById = useMemo(
    () => new Map((assetMaster.data?.items ?? []).map((asset) => [String(asset.id), asset])),
    [assetMaster.data],
  )

  const assetOptions = useMemo(
    () =>
      (assetMaster.data?.items ?? []).map((asset) => ({
        label: asset.assetName,
        value: String(asset.id),
        // An asset holds stock or its variants do, so the hint says which and
        // how much. Legacy assets all read 0 until someone refills them.
        hint:
          asset.variantCount > 0
            ? `${asset.variantCount} variant${asset.variantCount === 1 ? '' : 's'}`
            : asset.quantity === 0
              ? 'No stock'
              : `${asset.quantity} left`,
      })),
    [assetMaster.data],
  )

  /**
   * Which saved handouts are holding a unit right now, by row id.
   *
   * `stock_held` is the truth, not the status: a consumable reads `RETURNED` and
   * still holds its unit, because a consumed unit never goes back on the shelf.
   */
  const heldById = useMemo(
    () => new Map((list.data ?? []).map((asset) => [asset.id, asset.stockHeld])),
    [list.data],
  )

  const addRow = () => rows.append({ ...EMPTY_EMPLOYEE_ASSET_FORM })

  /**
   * Picking a different asset invalidates the variant under it — a variant id
   * from the previous asset answers 400 ("does not belong to the selected
   * asset"), so it's cleared rather than carried across.
   */
  const onAssetChange = (index: number, assetId: string) => {
    form.setValue(`rows.${index}.assetId`, assetId, { shouldValidate: false })
    form.setValue(`rows.${index}.variantId`, '', { shouldValidate: false })
    // Whether a variant is required travels with the asset, and the master row
    // already carries the count — no second read to find out.
    form.setValue(
      `rows.${index}.hasVariants`,
      (assetsById.get(assetId)?.variantCount ?? 0) > 0,
      { shouldValidate: false },
    )
  }

  /**
   * Keep every row's `hasVariants` true to the master.
   *
   * The rows are seeded from the handouts, which may land before the asset
   * master does — and a legacy row on an asset that has since grown variants
   * would otherwise stay marked as needing none. `variant_count` is the answer,
   * so the rows are re-settled whenever it arrives.
   */
  useEffect(() => {
    if (assetsById.size === 0) return
    form.getValues('rows').forEach((row, index) => {
      const next = (assetsById.get(row.assetId)?.variantCount ?? 0) > 0
      if (row.hasVariants === next) return
      form.setValue(`rows.${index}.hasVariants`, next, { shouldValidate: false })
    })
  }, [assetsById, form])

  /**
   * The bin takes the card away, the last one included: an employee who holds
   * nothing is a real answer here, unlike the steps that must have a row. What's
   * left is an empty list with its Add button.
   */
  const removeRow = (index: number) => {
    const row = form.getValues(`rows.${index}`)
    if (row?.id !== undefined) setRemovedIds((previous) => [...previous, row.id as number])
    rows.remove(index)
  }

  const submit = handleSubmit(async (values) => {
    const savable = values.rows.filter(
      (row) => !isBlankRow(row as Record<string, unknown>, ASSET_ROW_KEYS),
    )


    setIsSaving(true)
    try {
      await saveRows<EmployeeAssetFormValues>(savable, removedIds, {
        create: (row) => createAsset.mutateAsync(row),
        update: (id, row) => updateAsset.mutateAsync({ assetId: id, values: row }),
        remove: (id) => deleteAsset.mutateAsync(id),
      })
      setRemovedIds([])
      toast.success('Assets saved')
      onSaved()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the assets."))
    } finally {
      setIsSaving(false)
    }
  })

  const isForbidden = isForbiddenError(list.error)

  return {
    form,
    fields: rows.fields,
    addRow,
    removeRow,
    assetOptions,
    assetsById,
    onAssetChange,
    heldById,
    isAssetsLoading: assetMaster.isLoading,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,
    onSubmit: submit,
    isSaving,
  }
}
