import { useMemo, useState } from 'react'
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
 * entered by mistake — which is why the footer says so.
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

  const assetOptions = useMemo(
    () =>
      (assetMaster.data?.items ?? []).map((asset) => ({
        label: asset.assetName,
        value: String(asset.id),
      })),
    [assetMaster.data],
  )

  const addRow = () => rows.append({ ...EMPTY_EMPLOYEE_ASSET_FORM })

  const removeRow = (index: number) => {
    const row = form.getValues(`rows.${index}`)
    if (row?.id !== undefined) setRemovedIds((previous) => [...previous, row.id as number])

    if (rows.fields.length === 1) {
      rows.update(0, { ...EMPTY_EMPLOYEE_ASSET_FORM })
      return
    }
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
