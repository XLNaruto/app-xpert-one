import { useCallback, useRef, useState } from 'react'
import { ApiError, getApiErrorMessage } from '@/lib/api-error'
import { useVerifyPassword } from '@/features/auth'

/** The API's status for "you have used up this window's guesses". */
const TOO_MANY_REQUESTS_STATUS = 429

/** The action a confirmed password releases. May be async; may fail. */
type GatedAction = () => void | Promise<unknown>

export interface UsePasswordConfirmOptions {
  /**
   * The action to release when no action was handed to `request()`. Use this for
   * a screen with a single gated button; pass the action to `request()` instead
   * when one dialog guards several (a row's Delete, say).
   */
  onConfirmed?: GatedAction
  /** Called when the user closes the dialog without confirming. */
  onCancel?: () => void
}

/**
 * The "confirm your password" gate: hold a sensitive action behind
 * `POST /user/me/verify-password` and only run it once the signed-in user has
 * re-entered their own password.
 *
 * The hook owns the dialog's whole state — open, in-flight, the inline error and
 * the remaining-guess count — and hands it to `<PasswordConfirmDialog />` as
 * `dialogProps`, so a screen only writes the two lines it cares about:
 *
 * ```tsx
 * const gate = usePasswordConfirm({ onConfirmed: () => submit(values) })
 *
 * <Button onClick={gate.request}>Save</Button>
 * <PasswordConfirmDialog {...gate.dialogProps} title="Confirm your password" />
 * ```
 *
 * The gated action runs *after* the dialog closes, so a failure inside it
 * surfaces on the screen (a toast, a field error) rather than inside a dialog
 * the user has already answered. A wrong password never closes the dialog and
 * never signs the user out — it is a `200` the field answers inline.
 */
export function usePasswordConfirm({ onConfirmed, onCancel }: UsePasswordConfirmOptions = {}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  /**
   * True once the API has answered 429. The field stays disabled from then on:
   * the window is minutes long, so letting the user keep typing would only earn
   * another refusal.
   */
  const [locked, setLocked] = useState(false)

  // A ref, not state: the action is set as the dialog opens and read once as it
  // confirms, and re-rendering the screen for it would be noise.
  const actionRef = useRef<GatedAction | undefined>(undefined)
  const verifyPassword = useVerifyPassword()

  /** Open the gate, optionally for this one action. */
  const request = useCallback((action?: GatedAction) => {
    actionRef.current = typeof action === 'function' ? action : undefined
    setError(null)
    setAttemptsRemaining(null)
    setLocked(false)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    actionRef.current = undefined
    setOpen(false)
    setError(null)
    setAttemptsRemaining(null)
    setLocked(false)
  }, [])

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setOpen(true)
        return
      }
      // Never let a click-away cancel a check that is already on the wire.
      if (verifyPassword.isPending) return
      close()
      onCancel?.()
    },
    [close, onCancel, verifyPassword.isPending],
  )

  const confirm = useCallback(
    async (password: string) => {
      if (locked || verifyPassword.isPending) return
      setError(null)

      try {
        const check = await verifyPassword.mutateAsync(password)

        if (!check.valid) {
          setAttemptsRemaining(check.attemptsRemaining)
          setError(check.message || 'That password is not correct.')
          return
        }

        const action = actionRef.current ?? onConfirmed
        close()
        await action?.()
      } catch (err) {
        // 429 — the guesses for this window are gone. The API puts the wait in
        // its own message, so it is shown as-is.
        if (err instanceof ApiError && err.status === TOO_MANY_REQUESTS_STATUS) {
          setLocked(true)
          setAttemptsRemaining(0)
        }
        setError(getApiErrorMessage(err, "Couldn't confirm your password. Please try again."))
      }
    },
    [close, locked, onConfirmed, verifyPassword],
  )

  return {
    /** Open the gate — pass an action when one dialog guards several buttons. */
    request,
    /** Close it from outside the dialog (e.g. the screen navigated away). */
    close,
    open,
    /** Spread straight onto `<PasswordConfirmDialog />`. */
    dialogProps: {
      open,
      onOpenChange,
      onConfirm: confirm,
      pending: verifyPassword.isPending,
      error,
      attemptsRemaining,
      locked,
    },
  }
}

/** What `usePasswordConfirm().dialogProps` carries — the dialog's wiring half. */
export type PasswordConfirmDialogState = ReturnType<typeof usePasswordConfirm>['dialogProps']
