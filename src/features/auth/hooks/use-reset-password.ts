import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useResetPassword as useResetPasswordMutation } from '../api/use-auth'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas'

/**
 * Forgot-password step 3 controller: sets a new password for the given email
 * and returns the user to the sign-in screen on success.
 */
export function useResetPassword(email: string) {
  const navigate = useNavigate()
  const reset = useResetPasswordMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit((v) =>
    reset.mutate(
      { email, password: v.password },
      {
        onSuccess: () => {
          toast.success('Password reset successfully. Please sign in.')
          navigate({ to: '/login' })
        },
      },
    ),
  )

  return {
    register,
    errors,
    onSubmit,
    isPending: reset.isPending,
    isError: reset.isError,
    error: reset.error,
  }
}
