import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSetTwoFactor } from '../api/use-two-factor'

/**
 * The second-factor switch on My Profile. It governs the *next* sign-in, not
 * this one: with it on, the password alone stops being enough and a six-digit
 * code is mailed to the account's address to finish the login.
 *
 * The state comes off the auth session rather than a query — nothing on the API
 * reports the flag, so it is inferred at sign-in and moved by these two calls
 * (see `AuthState.twoFactorEnabled`). Turning it *off* weakens the account, so
 * that direction asks first; turning it on doesn't.
 */
export function TwoFactorCard() {
  const enabled = useAuthStore((s) => s.twoFactorEnabled)
  const email = useAuthStore((s) => s.user?.email)
  const setTwoFactor = useSetTwoFactor()
  const [confirmOff, setConfirmOff] = useState(false)

  const handleChange = (next: boolean) => {
    if (!next) {
      setConfirmOff(true)
      return
    }
    setTwoFactor.mutate(true)
  }

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-full',
              enabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            {enabled ? (
              <ShieldCheck className="size-5" />
            ) : (
              <ShieldAlert className="size-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Two-Factor Authentication
              </h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {enabled ? 'On' : 'Off'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {enabled
                ? `Every sign-in asks for a six-digit code sent to ${email ?? 'your email address'}.`
                : 'Add a second step to your sign-in — a six-digit code emailed to you each time you log in.'}
            </p>
          </div>

          <Switch
            checked={enabled}
            onCheckedChange={handleChange}
            disabled={setTwoFactor.isPending}
            aria-label="Two-factor authentication"
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        variant="destructive"
        icon={ShieldAlert}
        title="Turn off two-factor authentication?"
        description="Your password alone will be enough to sign in. You can turn it back on at any time."
        confirmLabel="Turn off"
        loading={setTwoFactor.isPending}
        onConfirm={() => setTwoFactor.mutate(false)}
      />
    </>
  )
}
