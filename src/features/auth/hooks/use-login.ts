import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { isEmailVerificationRequired } from '../api/auth-api'
import { useLogin as useLoginMutation } from '../api/use-auth'
import { loginSchema, type LoginValues } from '../schemas'

/**
 * Sign-in form controller: owns the react-hook-form wiring and the login
 * mutation, and navigates to the dashboard on success. The page consumes this
 * and only renders.
 */
export function useLogin() {
  const navigate = useNavigate()
  const login = useLoginMutation()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      isOwner: true,
      companyCode: '',
      remember: false,
    },
  })

  const isOwner = watch('isOwner')

  /**
   * Switching tabs swaps which API login form the submit uses, so the company
   * code is dropped along with any error it left behind — the owner form never
   * sends it.
   */
  const setIsOwner = (next: boolean) => {
    setValue('isOwner', next)
    setValue('companyCode', '')
    clearErrors('companyCode')
  }

  const onSubmit = handleSubmit((v) =>
    login.mutate(v, {
      onSuccess: () => {
        toast.success('Signed in')
        navigate({ to: '/dashboard' })
      },
    }),
  )

  return {
    register,
    errors,
    isOwner,
    setIsOwner,
    onSubmit,
    isPending: login.isPending,
    isError: login.isError,
    error: login.error,
    /**
     * The credentials were accepted but the address is unverified — the API's
     * message is guidance ("we sent you a code"), not a failure, so the page
     * shows it as a notice rather than a red error.
     */
    needsEmailVerification: isEmailVerificationRequired(login.error),
  }
}
