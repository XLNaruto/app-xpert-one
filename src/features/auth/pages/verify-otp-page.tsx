import { Controller } from 'react-hook-form'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AuthHeading } from '../components/auth-heading'
import { AuthBackLink } from '../components/auth-back-link'
import { OtpInput } from '../components/otp-input'
import { useVerifyOtp } from '../hooks/use-verify-otp'

/** Step 2 — verify the OTP sent to the email. */
export function VerifyOtpPage({ email }: { email: string }) {
  const { control, errors, onSubmit, isPending, isError, error } =
    useVerifyOtp(email)

  return (
    <div>
      <AuthHeading
        icon={ShieldCheck}
        title="Verify OTP"
        subtitle={
          email
            ? `Enter the 6-digit code sent to ${email}`
            : 'Enter the 6-digit code sent to your email'
        }
      />

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        {isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error?.message}
          </p>
        )}

        <div className="space-y-2">
          <Label className="block text-foreground/90">Verification Code</Label>
          <Controller
            control={control}
            name="otp"
            render={({ field }) => (
              <OtpInput
                value={field.value}
                onChange={field.onChange}
                length={6}
                hasError={!!errors.otp}
                autoFocus
              />
            )}
          />
          {errors.otp && (
            <p className="text-xs text-destructive">{errors.otp.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending}
        >
          {isPending ? 'Verifying…' : 'Verify OTP'}
        </Button>
      </form>

      <AuthBackLink to="/forgot-password" label="Use a different email" />
    </div>
  )
}
