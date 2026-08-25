import { useMutation } from '@tanstack/react-query'
import { verifyPasswordRequest } from './verify-password-api'
import type { PasswordCheck } from '../types'

/**
 * Confirm the signed-in user's own password. Nothing is cached and nothing is
 * invalidated — the call reads no state and changes none — so this is a plain
 * mutation with no `onSuccess`/`onError` of its own: a wrong password is a
 * *successful* response (`valid: false`) that the caller shows inline, and the
 * rate-limit failure is shown inline too rather than as a toast, since the user
 * is looking at the dialog that caused it.
 *
 * Screens don't normally call this directly — `usePasswordConfirm()` +
 * `<PasswordConfirmDialog />` wrap it into the gate.
 */
export function useVerifyPassword() {
  return useMutation<PasswordCheck, Error, string>({
    mutationFn: (password) => verifyPasswordRequest(password),
  })
}
