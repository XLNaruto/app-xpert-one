import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useVerifyOtp as useVerifyOtpMutation } from '../api/use-auth'
import { verifyOtpSchema, type VerifyOtpValues } from '../schemas'

/**
 * Forgot-password step 2 controller: verifies the OTP for the given email and
 * routes to the reset screen on success.
 */
export function useVerifyOtp(email: string) {
  const navigate = useNavigate()
  const verify = useVerifyOtpMutation()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: '' },
  })

  const onSubmit = handleSubmit((v) =>
    verify.mutate(
      { email, otp: v.otp },
      {
        onSuccess: () => {
          toast.success('OTP verified')
          navigate({ to: '/reset-password', state: { email } })
        },
      },
    ),
  )

  return {
    control,
    errors,
    onSubmit,
    isPending: verify.isPending,
    isError: verify.isError,
    error: verify.error,
  }
}
