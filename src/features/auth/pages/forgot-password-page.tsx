import { KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthHeading } from '../components/auth-heading'
import { AuthBackLink } from '../components/auth-back-link'
import { useForgotPassword } from '../hooks/use-forgot-password'

const fieldClasses =
  'h-11 border border-border bg-white/80 pl-10 text-foreground shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0 dark:border-white/15 dark:bg-white/5 dark:focus-visible:border-primary'

/** Step 1 — request an OTP. */
export function ForgotPasswordPage() {
  const { register, errors, onSubmit, isPending, isError, error } =
    useForgotPassword()

  return (
    <div>
      <AuthHeading
        icon={KeyRound}
        title="Forgot Password?"
        subtitle="Enter your email and we'll send you a verification code"
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

        <div className="space-y-2">
          <Label htmlFor="email" className="block text-foreground/90">
            Email
          </Label>
          <div className="group relative">
            <Mail
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="email"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Enter your email address"
              className={fieldClasses}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending}
        >
          {isPending ? 'Sending…' : 'Send OTP'}
        </Button>
      </form>

      <AuthBackLink to="/login" label="Back to sign in" />
    </div>
  )
}
