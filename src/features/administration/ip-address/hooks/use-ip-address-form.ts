import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { ipAddressSchema, type IpAddressFormValues } from '../schemas'
import { EMPTY_IP_ADDRESS_FORM } from '../constants'
import {
  useCreateIpAddress,
  useUpdateIpAddress,
} from '../api/use-ip-address-mutations'
import { ipAddressToFormValues } from '../lib/ip-address-mappers'
import type { IpAddress } from '../types'

interface UseIpAddressFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** The entry being edited, or `null` to add a new one. */
  record: IpAddress | null
  /** Called after a successful save (closes the dialog). */
  onSaved: () => void
}

/**
 * Owns the IP entry form for both create and edit: validation, seeding from the
 * edited row and the POST/PATCH on submit. The row the list already holds is the
 * whole record, so edit mode needs no separate read. The dialog only lays out
 * fields.
 */
export function useIpAddressForm({ open, record, onSaved }: UseIpAddressFormArgs) {
  const isEdit = record !== null
  const createIpAddress = useCreateIpAddress()
  const updateIpAddress = useUpdateIpAddress()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IpAddressFormValues>({
    resolver: zodResolver(ipAddressSchema),
    defaultValues: EMPTY_IP_ADDRESS_FORM,
  })

  // Sync the form to the row whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return
    reset(record ? ipAddressToFormValues(record) : EMPTY_IP_ADDRESS_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const saved = isEdit
      ? updateIpAddress.mutateAsync({ id: record.id, values })
      : createIpAddress.mutateAsync(values)

    saved
      .then(() => {
        toast.success(isEdit ? 'IP address updated' : 'IP address added')
        onSaved()
      })
      // A duplicate on the same list, or a change that would strand a
      // RESTRICTED company, comes back 409 — show the server's own wording.
      .catch((err) =>
        toast.error(
          getApiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'add'} IP address`),
        ),
      )
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: createIpAddress.isPending || updateIpAddress.isPending,
  }
}
