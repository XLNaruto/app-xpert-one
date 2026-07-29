import { useState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLogin } from '../hooks/use-login'

const fieldClasses =
  'h-11 border border-border bg-white/80 pl-10 text-foreground shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0 dark:border-white/15 dark:bg-white/5 dark:focus-visible:border-primary'

/** Username · password sign-in. */
export function LoginPage() {
  const { register, errors, onSubmit, isPending, isError, error } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {/* Lock badge */}
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/10">
        <Lock className="size-7 text-primary" />
      </div>

      <h1 className="mt-5 text-center font-heading text-3xl font-bold tracking-tight text-foreground">
        Welcome Back!
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        Sign in to continue to XpertOne
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        autoComplete="off"
        className="mt-7 space-y-5"
      >
        {isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error?.message}
          </p>
        )}

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username" className="block text-foreground/90">
            Username
          </Label>
          <div className="group relative">
            <User
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="username"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Enter your username"
              className={fieldClasses}
              {...register('username')}
            />
          </div>
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="block text-foreground/90">
            Password
          </Label>
          <div className="group relative">
            <Lock
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Enter your password"
              className={cn(fieldClasses, 'pr-10')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Remember */}
        <div className="flex items-center gap-2.5 text-sm">
          <Checkbox
            id="remember"
            className="border-border shadow-none"
            {...register('remember')}
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer select-none font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        {/* Sign in */}
        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending}
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
