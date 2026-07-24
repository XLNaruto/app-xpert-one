import { useState } from 'react'
import { Eye, EyeOff, Lock, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AuthHeading } from '../components/auth-heading'
import { AuthBackLink } from '../components/auth-back-link'
import { useResetPassword } from '../hooks/use-reset-password'

const fieldClasses =
  'h-11 border border-border bg-white/80 pl-10 pr-10 text-foreground shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0 dark:border-white/15 dark:bg-white/5 dark:focus-visible:border-primary'

/** Step 3 — set a new password. */
export function ResetPasswordPage({ email }: { email: string }) {
  const { register, errors, onSubmit, isPending, isError, error } =
    useResetPassword(email)
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div>
      <AuthHeading
        icon={LockKeyhole}
        title="Reset Password"
        subtitle="Create a new password for your account"
      />

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

        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="block text-foreground/90">
            New Password
          </Label>
          <div className="group relative">
            <Lock
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Enter new password"
              className={fieldClasses}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              title={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="block text-foreground/90">
            Confirm New Password
          </Label>
          <div className="group relative">
            <Lock
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Re-enter new password"
              className={cn(fieldClasses)}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              title={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending}
        >
          {isPending ? 'Resetting…' : 'Reset Password'}
        </Button>
      </form>

      <AuthBackLink to="/login" label="Back to sign in" />
    </div>
  )
}
