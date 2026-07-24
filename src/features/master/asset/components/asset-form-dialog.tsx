import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { assetSchema, type AssetFormValues } from '../schemas'
import { useCreateAsset, useUpdateAsset } from '../api/use-asset-mutations'
import type { AssetRecord } from '../types'

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: AssetRecord | null
}

const EMPTY: AssetFormValues = { assetName: '' }

/** Add/edit dialog for an asset master record. */
export function AssetFormDialog({ open, onOpenChange, record }: AssetFormDialogProps) {
  const isEdit = record !== null
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const isPending = createAsset.isPending || updateAsset.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    reset(record ? { assetName: record.assetName } : EMPTY)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateAsset.mutateAsync({ id: record.id, values })
      : createAsset.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'Asset updated' : 'Asset added')
        onOpenChange(false)
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Something went wrong'),
      )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assetName">
              Asset Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="assetName" placeholder="Asset Name" {...register('assetName')} />
            {errors.assetName && (
              <p className="text-xs text-destructive">{errors.assetName.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
