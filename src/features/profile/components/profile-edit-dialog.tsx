import { Mail } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useProfileEditForm } from '../hooks/use-profile-edit-form'
import type { ProfileUser } from '../types'

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ProfileUser
}

/**
 * Edit the signed-in user's own name, email and mobile — layout only. There is
 * deliberately no password field: this API can't change it.
 */
export function ProfileEditDialog({ open, onOpenChange, user }: ProfileEditDialogProps) {
  const { register, errors, onSubmit, isPending, emailConfirm } = useProfileEditForm({
    open,
    user,
    onSaved: () => onOpenChange(false),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Your Name and Contact Details. Your Email Is Also Your Sign-In.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
            <Field label="Name" required error={errors.name?.message}>
              <Input autoComplete="name" maxLength={200} {...register('name')} />
            </Field>

            <Field
              label="Email"
              required
              error={errors.email?.message}
              hint="This Is the Address You Sign In With — and Where Two-Factor Codes Are Sent."
            >
              <Input
                type="email"
                autoComplete="email"
                spellCheck={false}
                {...register('email')}
              />
            </Field>

            <Field label="Mobile Number" error={errors.mobileNumber?.message}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="10-Digit Mobile Number"
                {...register('mobileNumber')}
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
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={emailConfirm.open}
        onOpenChange={emailConfirm.onOpenChange}
        icon={Mail}
        title="Change Your Sign-In Email?"
        description={
          <>
            You will sign in with <strong>{emailConfirm.newEmail}</strong> from next time.
            {emailConfirm.twoFactorEnabled
              ? ' Two-factor sign-in codes will be sent to this address too.'
              : ''}
          </>
        }
        confirmLabel="Change Email"
        cancelLabel="Cancel"
        onConfirm={emailConfirm.onConfirm}
      />
    </>
  )
}
