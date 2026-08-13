import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useSupportTicket } from '../api/use-support-tickets'
import {
  useCloseSupportTicket,
  useReopenSupportTicket,
} from '../api/use-support-ticket-mutations'
import { canClose, canEditWording, canReopen } from '../lib/support-ticket-mappers'

/**
 * Owns the ticket detail screen — the read, and the two transitions this side of
 * the desk owns.
 *
 * Which of the three actions exist is decided by the ticket's own status, not by
 * hope: the wording is amendable only until the desk first touches it, reopen
 * needs a finished ticket, and close needs a resolved one. Each of those is a
 * 409 if sent anyway, so the button simply isn't offered.
 */
export function useSupportTicketDetail(id?: number) {
  const navigate = useNavigate()

  const { data: ticket, isLoading, isError, error } = useSupportTicket(id ?? Number.NaN)

  const reopenTicket = useReopenSupportTicket()
  const closeTicket = useCloseSupportTicket()

  const [isReopenOpen, setIsReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [isCloseOpen, setIsCloseOpen] = useState(false)

  const goToList = () => navigate({ to: '/support/ticket' })
  const goToEdit = () => {
    if (!ticket) return
    navigate({ to: '/support/ticket/create', search: { data: encryptId(ticket.id) } })
  }

  const openReopen = () => {
    setReopenReason('')
    setIsReopenOpen(true)
  }

  const confirmReopen = () => {
    if (!ticket || !reopenReason.trim()) return
    reopenTicket.mutate(
      { id: ticket.id, reason: reopenReason },
      {
        onSuccess: () => {
          toast.success('Ticket reopened')
          // The resolution is cleared and the clock is NOT re-bought — both are
          // surprising enough to state rather than leave to be discovered.
          toast.info('The deadline is unchanged — reopening does not re-buy the clock.')
          setIsReopenOpen(false)
          setReopenReason('')
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't reopen the ticket.")),
      },
    )
  }

  const confirmClose = () => {
    if (!ticket) return
    closeTicket.mutate(ticket.id, {
      onSuccess: () => {
        toast.success('Ticket closed')
        setIsCloseOpen(false)
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't close the ticket.")),
    })
  }

  const isForbidden = isForbiddenError(error)

  return {
    ticket,
    isLoading,
    isError: (isError && !isForbidden) || (!isLoading && !isError && !ticket),
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,

    /** Which actions the ticket's own status allows. */
    canEdit: Boolean(ticket && canEditWording(ticket)),
    canReopen: Boolean(ticket && canReopen(ticket)),
    canClose: Boolean(ticket && canClose(ticket)),

    goToList,
    goToEdit,

    isReopenOpen,
    setIsReopenOpen,
    openReopen,
    reopenReason,
    setReopenReason,
    confirmReopen,
    isReopening: reopenTicket.isPending,

    isCloseOpen,
    setIsCloseOpen,
    confirmClose,
    isClosing: closeTicket.isPending,
  }
}
