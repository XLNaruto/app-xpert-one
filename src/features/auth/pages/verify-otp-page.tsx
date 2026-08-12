import { ArrowLeft, MailCheck, ShieldCheck, TimerOff } from 'lucide-react'
import { OtpInput } from '@/components/common/otp-input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVerifyOtp } from '../hooks/use-verify-otp'

/** `120` → `2:00`, for the countdown dial. */
function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
  return `${mins}:${String(seconds % 60).padStart(2, '0')}`
}

/** Ring geometry — the radius the dash array below is measured against. */
const RING_RADIUS = 9
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/**
 * The code's remaining life as a draining ring around its own figure. The dial
 * is the point: it turns "1:50" from a number you have to think about into
 * something readable at a glance, and it warns before it runs out by going
 * amber under a quarter left.
 */
function CountdownRing({
  progress,
  seconds,
}: {
  /** Fraction of the code's life left, `1` → `0`. */
  progress: number
  seconds: number
}) {
  const low = progress <= 0.25

  return (
    <span className="inline-flex items-center gap-2 pl-1 pr-1">
      <span className="relative grid size-6 place-items-center">
        <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
          <circle
            cx="12"
            cy="12"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            className="stroke-border"
          />
          <circle
            cx="12"
            cy="12"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            // Drains clockwise from full. The transition matches the tick, so
            // it sweeps continuously rather than jumping once a second.
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            className={cn(
              'transition-[stroke-dashoffset,stroke] duration-1000 ease-linear',
              low ? 'stroke-amber-500' : 'stroke-primary',
            )}
          />
        </svg>
      </span>
      <span
        className={cn(
          'text-xs font-semibold tabular-nums',
          low ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
        )}
      >
        {formatCountdown(seconds)}
      </span>
    </span>
  )
}

/**
 * The code step of a sign-in, on its own route — one screen for both
 * challenges, since the user is doing the same thing either way: reading a
 * six-digit code out of their mail. Only the heading and the endpoints behind
 * it differ (see `useVerifyOtp`).
 *
 * The route guard sends anyone here without a pending challenge back to
 * `/login`, so `challenge` is only ever null for the frame between finishing
 * and the redirect landing.
 */
export function VerifyOtpPage() {
  const {
    challenge,
    code,
    setCode,
    codeLength,
    error,
    secondsLeft,
    progress,
    isTwoFactor,
    isPending,
    isResending,
    canResend,
    submit,
    resend,
    cancel,
  } = useVerifyOtp()

  if (!challenge) return null

  const Icon = isTwoFactor ? ShieldCheck : MailCheck
  const expired = secondsLeft <= 0

  return (
    <div>
      {/* Step badge */}
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/10">
        <Icon className="size-7 text-primary" />
      </div>

      <h1 className="mt-5 text-center font-heading text-3xl font-bold tracking-tight text-foreground">
        {isTwoFactor ? 'Two-Step Verification' : 'Verify Your Email'}
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        {challenge.message}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        noValidate
        className="mt-7 space-y-5"
      >
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <OtpInput
          value={code}
          onChange={setCode}
          // The last digit is the whole input, so there is nothing left to
          // press a button for — it submits itself.
          onComplete={(value) => void submit(value)}
          length={codeLength}
          disabled={isPending}
          invalid={Boolean(error)}
          autoFocus
          aria-label={
            isTwoFactor ? 'Two-factor code' : 'Email verification code'
          }
        />

        {/* One clock, one control, one pill. The dial *is* the wait for the
            resend — a new code replaces the live one, so the button only opens
            as the ring empties, and the two halves read as the single
            cause-and-effect they are rather than two loose bits of text. */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white/70 p-1 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/5">
            {expired ? (
              <span className="inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-destructive">
                <TimerOff className="size-4" strokeWidth={2.25} />
                Expired
              </span>
            ) : (
              <CountdownRing progress={progress} seconds={secondsLeft} />
            )}

            <span aria-hidden className="h-5 w-px bg-border dark:bg-white/15" />

            <button
              type="button"
              onClick={() => void resend()}
              disabled={!canResend || isPending || isResending}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                canResend && !isPending && !isResending
                  ? // Live: it's now the only thing left to do here.
                    'cursor-pointer bg-primary text-white shadow-sm shadow-primary/25 hover:opacity-90'
                  : 'cursor-not-allowed text-muted-foreground/70',
              )}
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending || code.length < codeLength}
        >
          {isPending ? 'Verifying…' : 'Verify & Continue'}
        </Button>

        {/* Back to sign in — a bordered pill whose arrow slides out of its own
            circle on hover, so leaving the step reads as a deliberate way out
            rather than a link tucked under the button that finishes it. */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-border bg-white/70 py-1.5 pl-1.5 pr-4 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5"
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-x-0.5">
              <ArrowLeft className="size-4" strokeWidth={2.5} />
            </span>
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  )
}
