import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IP_ADDRESS_LABELS, IP_ADDRESS_TYPES } from '../constants'
import { useIpAddressForm } from '../hooks/use-ip-address-form'
import type { IpAddressType } from '../schemas'
import type { IpAddress } from '../types'

interface IpAddressFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The entry being edited, or `null` to add a new one. */
  record: IpAddress | null
}

/**
 * Add/edit dialog for one IP access entry — layout only. Two fields is not a
 * screen's worth of work, so the form stays over the list instead of navigating
 * away from it.
 */
export function IpAddressFormDialog({
  open,
  onOpenChange,
  record,
}: IpAddressFormDialogProps) {
  const { register, control, errors, onSubmit, isEdit, isPending } = useIpAddressForm({
    open,
    record,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit IP Address' : 'Add IP Address'}</DialogTitle>
          <DialogDescription>
            A single host or a CIDR range, on the allowed or the blocked list.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field
            label={IP_ADDRESS_LABELS.ipAddresses}
            required
            error={errors.ipAddresses?.message}
            hint="One host (203.0.113.4, 2001:db8::1) or a range (10.0.0.0/8) — a range covers every address inside it."
          >
            <Input
              className="font-mono"
              placeholder="203.0.113.4 or 10.0.0.0/8"
              autoComplete="off"
              spellCheck={false}
              {...register('ipAddresses')}
            />
          </Field>

          <Field
            label={IP_ADDRESS_LABELS.type}
            required
            error={errors.type?.message}
            hint="An address on both lists is blocked — blocked always wins at the door."
          >
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={(value) => field.onChange(value as IpAddressType)}
                  options={IP_ADDRESS_TYPES}
                  placeholder="Select list"
                />
              )}
            />
          </Field>

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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add IP Address'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
