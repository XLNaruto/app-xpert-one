import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isConflictError, toApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { useUpdateMyProfile } from '../api/use-profile-mutations'
import { EMAIL_IN_USE_MESSAGE, MOBILE_IN_USE_MESSAGE } from '../constants'
import {
  profileErrorField,
  toProfileEditFormValues,
  toUpdateMyProfileBody,
} from '../lib/profile-mappers'
import {
  profileEditSchema,
  type ProfileEditFormValues,
  type UpdateMyProfileBody,
} from '../schemas'
import type { ProfileUser } from '../types'

const BAD_REQUEST_STATUS = 400

interface UseProfileEditFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  user: ProfileUser
  /** Called after a successful save (closes the dialog). */
  onSaved: () => void
}

/**
 * Owns the "Edit User Details" form: prefill from `GET /user/me`, the diff that
 * keeps the PATCH to changed fields only, and the email-change confirmation.
 *
 * The email is the login and a change takes effect at once, with no code sent to
 * prove the new address — so it's confirmed first. A rejected field (a taken
 * email or mobile, a server-side format failure) lands inline on that field.
 */
export function useProfileEditForm({ open, user, onSaved }: UseProfileEditFormArgs) {
  const updateProfile = useUpdateMyProfile()
  const twoFactorEnabled = useAuthStore((s) => s.twoFactorEnabled)
  /** A body that changes the email, held while the user confirms it. */
  const [pendingEmailBody, setPendingEmailBody] = useState<UpdateMyProfileBody | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: toProfileEditFormValues(user),
  })

  useEffect(() => {
    if (!open) return
    reset(toProfileEditFormValues(user))
    setPendingEmailBody(null)
  }, [open, user, reset])

  const save = async (body: UpdateMyProfileBody) => {
    try {
      await updateProfile.mutateAsync(body)
      toast.success('Profile Updated')
      onSaved()
    } catch (error) {
      const apiError = toApiError(error)
      const message = getApiErrorMessage(apiError, "Couldn't Save Your Profile.")
      const field = profileErrorField(message, body)

      if (isConflictError(apiError) && field && field !== 'name') {
        setError(field, {
          message: field === 'email' ? EMAIL_IN_USE_MESSAGE : MOBILE_IN_USE_MESSAGE,
        })
        return
      }
      if (apiError.status === BAD_REQUEST_STATUS && field) {
        setError(field, { message })
        return
      }
      toast.error(message)
    }
  }

  const onSubmit = handleSubmit((values) => {
    const body = toUpdateMyProfileBody(values, user)
    // Nothing changed — there's nothing to send.
    if (Object.keys(body).length === 0) {
      onSaved()
      return
    }
    if (body.email !== undefined) {
      setPendingEmailBody(body)
      return
    }
    void save(body)
  })

  return {
    register,
    errors,
    onSubmit,
    isPending: updateProfile.isPending,
    emailConfirm: {
      open: pendingEmailBody !== null,
      newEmail: pendingEmailBody?.email ?? '',
      twoFactorEnabled,
      onOpenChange: (next: boolean) => {
        if (!next) setPendingEmailBody(null)
      },
      onConfirm: () => {
        if (!pendingEmailBody) return
        const body = pendingEmailBody
        setPendingEmailBody(null)
        void save(body)
      },
    },
  }
}
