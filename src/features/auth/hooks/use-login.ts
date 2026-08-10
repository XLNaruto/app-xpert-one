import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      companyCode: '',
      remember: false,
    },
  })

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
    onSubmit,
    isPending: login.isPending,
    isError: login.isError,
    error: login.error,
  }
}
