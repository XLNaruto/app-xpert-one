import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'

/**
 * Keep the address bar in step with what the three panes have selected, so a
 * refresh — or a link handed to somebody with the same entitlement — comes back
 * to the same person and the same conversation.
 *
 * Only ids travel, inside the one encrypted `?data=` token every screen here
 * uses: `/talk/monitoring?data=…`, never `/talk/monitoring/7/chats/31`. The
 * token is written with the same key order every time and `encryptParams` is a
 * pure XOR, so the same selection always produces the same string — which is
 * what lets the effect below compare against the token already in the URL and
 * do nothing when they agree. Without that it would navigate on every render,
 * and each navigation would re-run it.
 *
 * `replace`, not a push: paging through the directory is not a history of pages
 * the reader wants a back button for. Back leaves the screen, the way it did
 * before the selection was in the URL at all.
 */
export function useMonitoringUrlSync({
  token,
  personId,
  chatId,
}: {
  /** The `?data=` token currently in the URL — compared, never decrypted here. */
  token: string | undefined
  personId: number | undefined
  chatId: number | undefined
}) {
  const navigate = useNavigate()

  useEffect(() => {
    // A chat cannot be addressed without the person it belongs to: the thread
    // endpoint checks the PAIR, so half a selection is not a state to restore.
    const next =
      personId == null
        ? undefined
        : encryptParams(chatId == null ? { p: personId } : { p: personId, c: chatId })

    if (next === token) return

    void navigate({
      to: '/talk/monitoring',
      search: next ? { data: next } : {},
      replace: true,
    })
  }, [chatId, navigate, personId, token])
}
