import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  employeeTicketReplySchema,
  employeeTicketResolveSchema,
  type EmployeeTicketReplyFormValues,
  type EmployeeTicketResolveFormValues,
} from '../schemas'
import { useEmployeeTicket } from '../api/use-employee-tickets'
import {
  useReplyToEmployeeTicket,
  useUpdateEmployeeTicketStatus,
} from '../api/use-employee-ticket-mutations'
import {
  canCloseTicket,
  canPickUp,
  canReply,
  canResolve,
} from '../lib/employee-ticket-mappers'

/**
 * Owns one employee ticket: the thread, the reply composer and the three
 * transitions the office can make.
 *
 * **Replying and resolving are different acts.** A reply keeps the conversation
 * going (and, first time round, quietly picks the ticket up); resolving answers
 * it and pushes the note to the employee's device, after which they either
 * accept it or reopen it. That's why the note is a deliberate dialog rather than
 * a checkbox on the composer.
 *
 * Which transitions exist is decided by the ticket's own status — each is a 409
 * if sent from the wrong one, so the button simply isn't offered.
 */
export function useEmployeeTicketDetail(id?: number) {
  const navigate = useNavigate()
  const ticketId = id ?? Number.NaN

  const { data: ticket, isLoading, isError, error } = useEmployeeTicket(ticketId)

  const reply = useReplyToEmployeeTicket(ticketId)
  const changeStatus = useUpdateEmployeeTicketStatus(ticketId)

  /** The reply's file, held until send — nothing is uploaded while typing. */
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)

  const replyForm = useForm<EmployeeTicketReplyFormValues>({
    resolver: zodResolver(employeeTicketReplySchema),
    defaultValues: { body: '' },
  })

  const resolveForm = useForm<EmployeeTicketResolveFormValues>({
    resolver: zodResolver(employeeTicketResolveSchema),
    defaultValues: { resolutionNote: '' },
  })

  const goToList = () => navigate({ to: '/support/employee-ticket' })

  const onReply = replyForm.handleSubmit((values) => {
    if (!ticket) return
    reply.mutate(
      { body: values.body, attachment },
      {
        onSuccess: () => {
          toast.success('Reply sent')
          // The server moves an open or reopened ticket to `in_progress` when
          // the office answers — say so, or the status silently changing under
          // them reads as a bug.
          if (ticket.status === 'open' || ticket.status === 'reopened') {
            toast.info('The ticket is now in progress — answering is picking it up.')
          }
          replyForm.reset({ body: '' })
          setAttachment(null)
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't send the reply.")),
      },
    )
  })

  const onPickUp = () => {
    changeStatus.mutate(
      { status: 'in_progress' },
      {
        onSuccess: () => toast.success('Ticket picked up'),
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't pick up the ticket.")),
      },
    )
  }

  const onResolve = resolveForm.handleSubmit((values) => {
    changeStatus.mutate(
      { status: 'resolved', resolution_note: values.resolutionNote.trim() },
      {
        onSuccess: () => {
          toast.success('Ticket resolved')
          toast.info('The employee has been notified on their device.')
          setIsResolveOpen(false)
          resolveForm.reset({ resolutionNote: '' })
        },
        // Already resolved answers 409 rather than silently overwriting — the
        // way to say more is to reply, or to wait for them to reopen it.
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't resolve the ticket.")),
      },
    )
  })

  const onClose = () => {
    changeStatus.mutate(
      { status: 'closed' },
      {
        onSuccess: () => {
          toast.success('Ticket closed')
          setIsCloseOpen(false)
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't close the ticket.")),
      },
    )
  }

  const isForbidden = isForbiddenError(error)

  return {
    ticket,
    messages: ticket?.messages ?? [],
    isLoading,
    isError: (isError && !isForbidden) || (!isLoading && !isError && !ticket),
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,

    /** Which transitions the ticket's own status allows. */
    canPickUp: Boolean(ticket && canPickUp(ticket)),
    canResolve: Boolean(ticket && canResolve(ticket)),
    canClose: Boolean(ticket && canCloseTicket(ticket)),
    canReply: Boolean(ticket && canReply(ticket)),

    goToList,

    /* Reply composer */
    replyForm,
    replyError: replyForm.formState.errors.body?.message,
    onReply,
    attachment,
    setAttachment,
    isReplying: reply.isPending,

    /* Transitions */
    onPickUp,
    isResolveOpen,
    setIsResolveOpen,
    resolveForm,
    resolveError: resolveForm.formState.errors.resolutionNote?.message,
    onResolve,
    isCloseOpen,
    setIsCloseOpen,
    onClose,
    isTransitioning: changeStatus.isPending,
  }
}
