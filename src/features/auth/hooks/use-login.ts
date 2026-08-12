import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthChallengeStore } from '@/stores/auth-challenge-store'
import { useLogin as useLoginMutation } from '../api/use-auth'
import { loginSchema, type LoginValues } from '../schemas'

/**
 * Sign-in form controller: owns the react-hook-form wiring, the login mutation
 * and the hand-off to the code screen when the API answers with a challenge
 * instead of a session. The page consumes this and only renders.
 *
 * The credentials go to `auth-challenge-store` along with the challenge because
 * both branches of that step need them again — the unverified-address branch
 * replays the whole login (verifying mints no token) and the second-factor
 * branch replays it for a fresh `challenge_token` when the user asks for
 * another code, since there is no resend endpoint for one.
 */
export function useLogin() {
  const navigate = useNavigate()
  const login = useLoginMutation()
  const startChallenge = useAuthChallengeStore((s) => s.start)

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

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (outcome) => {
        if (outcome.status === 'authenticated') {
          toast.success('Signed in')
          navigate({ to: '/dashboard' })
          return
        }
        // Right password, sign-in unfinished: the address needs verifying, or
        // the user holds a second factor. Both are the same screen.
        startChallenge(outcome.challenge, values)
        navigate({ to: '/verify-otp' })
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
  }
}
