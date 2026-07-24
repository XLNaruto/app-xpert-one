import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSendOtp } from '../api/use-auth'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'

/**
 * Forgot-password step 1 controller: collects the email, requests an OTP, then
 * routes to the verify screen carrying the email in the URL search params.
 */
export function useForgotPassword() {
  const navigate = useNavigate()
  const sendOtp = useSendOtp()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit((v) =>
    sendOtp.mutate(v, {
      onSuccess: () => {
        toast.success('OTP sent to your email')
        navigate({ to: '/verify-otp', state: { email: v.email } })
      },
    }),
  )

  return {
    register,
    errors,
    onSubmit,
    isPending: sendOtp.isPending,
    isError: sendOtp.isError,
    error: sendOtp.error,
  }
}
