import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStates } from '@/features/master/state'
import { districtSchema, type DistrictFormValues } from '../schemas'
import { useCreateDistrict, useUpdateDistrict } from '../api/use-district-mutations'
import type { DistrictRecord } from '../types'

interface DistrictFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: DistrictRecord | null
}

const EMPTY: DistrictFormValues = { state: '', districtName: '' }

/** Add/edit dialog for a district master record. */
export function DistrictFormDialog({ open, onOpenChange, record }: DistrictFormDialogProps) {
  const isEdit = record !== null
  const { data: states } = useStates()
  const createDistrict = useCreateDistrict()
  const updateDistrict = useUpdateDistrict()
  const isPending = createDistrict.isPending || updateDistrict.isPending

  const stateOptions = useMemo(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: s.stateName })),
    [states],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DistrictFormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    reset(record ? { state: record.state, districtName: record.districtName } : EMPTY)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateDistrict.mutateAsync({ id: record.id, values })
      : createDistrict.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'District updated' : 'District added')
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
          <DialogTitle>{isEdit ? 'Edit District' : 'Add District'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>
              State<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  options={stateOptions}
                  placeholder="Select State"
                  searchPlaceholder="Search state"
                />
              )}
            />
            {errors.state && (
              <p className="text-xs text-destructive">{errors.state.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="districtName">
              District Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="districtName" placeholder="District Name" {...register('districtName')} />
            {errors.districtName && (
              <p className="text-xs text-destructive">{errors.districtName.message}</p>
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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add District'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
