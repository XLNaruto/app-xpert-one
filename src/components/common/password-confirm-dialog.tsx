import { useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { cn } from '@/lib/utils'

export interface PasswordConfirmDialogProps {
  /** Controlled open state — comes from `usePasswordConfirm().dialogProps`. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hands the typed password to the gate. Closing on success is the gate's job. */
  onConfirm: (password: string) => void
  /** A check is on the wire. */
  pending?: boolean
  /** Inline message under the field — a wrong password or a refused window. */
  error?: string | null
  /** Guesses left in this window; hidden until the first wrong one. */
  attemptsRemaining?: number | null
  /** The window's guesses are used up: the field and confirm button stay shut. */
  locked?: boolean
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `destructive` paints the icon + confirm button red (deletes, sign-outs). */
  variant?: 'default' | 'destructive'
  icon?: LucideIcon
}

/**
 * The app-wide "confirm your password" dialog: the last step before a sensitive
 * save, edit or delete goes through. It asks `POST /user/me/verify-password`
 * about the signed-in user's own password (the user comes out of the token —
 * there is no address to type), and the action behind it only runs once that
 * answer is `valid`.
 *
 * It is never used on its own: `usePasswordConfirm()` owns the verification and
 * every piece of state below, so a screen wires it in two lines.
 *
 * @example
 * const gate = usePasswordConfirm({ onConfirmed: () => remove(row.id) })
 *
 * <Button variant="destructive" onClick={gate.request}>Delete</Button>
 * <PasswordConfirmDialog
 *   {...gate.dialogProps}
 *   variant="destructive"
 *   title="Confirm your password"
 *   description="Enter your password to delete this branch."
 *   confirmLabel="Delete"
 * />
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
  error = null,
  attemptsRemaining = null,
  locked = false,
  title = 'Confirm your password',
  description = 'For your security, enter your password to continue.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon: Icon = ShieldCheck,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState('')
  const isDestructive = variant === 'destructive'

  // The field never survives a close: the next sensitive action asks again from
  // scratch, and a password has no business sitting in state between dialogs.
  useEffect(() => {
    if (!open) setPassword('')
  }, [open])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!password || pending || locked) return
    onConfirm(password)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-6">
        <DialogHeader className="items-center text-center">
          <span
            className={cn(
              'mb-4 flex size-14 items-center justify-center rounded-full',
              isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-6" />
          </span>
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-center leading-relaxed">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <Label htmlFor="confirm-password">Password</Label>
          <PasswordInput
            id="confirm-password"
            // A browser-managed autofill would defeat the point of asking.
            autoComplete="off"
            autoFocus
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending || locked}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'confirm-password-error' : undefined}
          />
          {error ? (
            <p id="confirm-password-error" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {!locked && attemptsRemaining !== null && attemptsRemaining > 0 ? (
            <p className="text-xs text-muted-foreground">
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          ) : null}

          <DialogFooter className="mt-6 grid grid-cols-2 gap-3 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={isDestructive ? 'destructive' : 'default'}
              className="w-full cursor-pointer"
              disabled={pending || locked || !password}
            >
              {pending ? 'Verifying…' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
