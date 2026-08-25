import { Globe, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PasswordInput } from '@/components/ui/password-input'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import type { useIpAccessModeSwitch } from '../hooks/use-ip-access-mode-switch'

/**
 * The access-mode header: which rule the company is on, what each list holds,
 * and the one control that changes it.
 *
 * The counts sit beside the mode because the mode alone is misleading — a
 * `PUBLIC` company with a populated allow list is enforcing nothing by it, and
 * that's only visible if both are stated together.
 */
export function IpAccessModeCard({
  access,
  canUpdate,
}: {
  access: ReturnType<typeof useIpAccessModeSwitch>
  /** Whether this role may flip the mode (`ip-addresses:update`). */
  canUpdate: boolean
}) {
  const restricted = access.mode === 'RESTRICTED'

  if (access.isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-5">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  // The mode read failing shouldn't take the list down with it. The entries
  // below are still readable and editable, so say nothing rather than error or
  // state a mode nobody answered.
  if (access.isError || !access.hasMode) return null

  return (
    <>
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={
                restricted
                  ? 'rounded-lg bg-success/12 p-2 text-success'
                  : 'rounded-lg bg-warning/15 p-2 text-warning'
              }
            >
              {restricted ? (
                <Lock className="size-5" />
              ) : (
                <Globe className="size-5" />
              )}
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-base font-semibold tracking-tight">
                  {restricted ? 'Restricted access' : 'Public access'}
                </p>
                <Badge variant={restricted ? 'success' : 'warning'}>
                  {access.mode}
                </Badge>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {restricted
                  ? 'Only the addresses on the allowed list can reach the panel.'
                  : 'Every network can reach the panel except the addresses on the blocked list.'}
              </p>

              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-success" />
                  {access.allowedCount} allowed
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="size-3.5 text-destructive" />
                  {access.blockedCount} blocked
                </span>
                {/*
                  A full allow list on a PUBLIC company reads like protection and
                  isn't — nothing consults it until the mode is switched.
                */}
                {!restricted && access.allowedCount > 0 && (
                  <span className="text-warning">
                    The allowed list is ignored while access is public.
                  </span>
                )}
              </p>
            </div>
          </div>

          {canUpdate &&
            (() => {
              const button = (
                <Button
                  variant="outline"
                  onClick={access.startSwitch}
                  disabled={access.wouldLockEveryoneOut || access.isSwitching}
                >
                  {restricted ? (
                    <Globe className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {restricted ? 'Make Public' : 'Restrict Access'}
                </Button>
              )

              // The server refuses this move too; saying why beats a dead button.
              // A disabled button swallows pointer events, so the trigger is the
              // span around it rather than the button itself.
              return access.wouldLockEveryoneOut ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{button}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 text-pretty font-normal">
                    Add at least one allowed address before restricting access.
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              )
            })()}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={access.pendingMode !== null}
        onOpenChange={(open) => !open && access.cancelSwitch()}
        icon={access.pendingMode === 'RESTRICTED' ? Lock : Globe}
        variant={access.pendingMode === 'RESTRICTED' ? 'default' : 'destructive'}
        title={
          access.pendingMode === 'RESTRICTED'
            ? 'Restrict access to the allowed list?'
            : 'Open access to every network?'
        }
        description={
          access.pendingMode === 'RESTRICTED'
            ? `Only the ${access.allowedCount} allowed address${
                access.allowedCount === 1 ? '' : 'es'
              } will be able to reach the panel — including you. Make sure your own network is on the list before continuing.`
            : `Every network will be able to reach the panel except the ${access.blockedCount} blocked address${
                access.blockedCount === 1 ? '' : 'es'
              }. The blocked list is kept as it is.`
        }
        confirmLabel={
          access.pendingMode === 'RESTRICTED' ? 'Restrict Access' : 'Make Public'
        }
        cancelLabel="Cancel"
        loading={access.isSwitching}
        confirmDisabled={!access.canConfirmSwitch}
        keepOpenOnConfirm
        onConfirm={access.confirmSwitch}
      >
        {/*
          The endpoint verifies the caller's password before it will move the
          mode — this switch can shut out the administrators themselves, so the
          account holder confirms it rather than whoever holds the session.
        */}
        <Field
          label="Your Password"
          required
          hint="Confirms it's you making the change. It is sent with this request only and never stored."
          error={access.passwordError}
        >
          <PasswordInput
            value={access.password}
            onChange={(event) => access.setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && access.canConfirmSwitch) {
                event.preventDefault()
                access.confirmSwitch()
              }
            }}
            placeholder="Enter your password"
            /*
              No autofill here. This field exists to prove the person at the
              keyboard is the account holder — a saved password dropped in by the
              browser would confirm nothing. Chrome ignores `off` on password
              inputs, so `new-password` is what actually suppresses it, and the
              unguessable `name` keeps heuristic managers off it too.
            */
            name="ip-access-mode-confirm"
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            autoFocus
            disabled={access.isSwitching}
          />
        </Field>
      </ConfirmDialog>
    </>
  )
}
