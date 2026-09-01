import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ALL_ROWS } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminUsers } from '@/features/administration/admin-user'
import {
  employeeTicketReplySchema,
  employeeTicketResolveSchema,
  type EmployeeTicketReplyFormValues,
  type EmployeeTicketResolveFormValues,
} from '../schemas'
import {
  useEmployeeTicket,
  useEmployeeTicketWorkSessions,
} from '../api/use-employee-tickets'
import {
  useAssignEmployeeTicket,
  useReplyToEmployeeTicket,
  useUpdateEmployeeTicketStatus,
} from '../api/use-employee-ticket-mutations'
import { ALL_FILTER } from '../constants'
import {
  canCloseTicket,
  canPickUp,
  canReassign,
  canRelease,
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
 *
 * **Picking up and assigning are different acts too.** There is no router on this
 * desk: picking a ticket up self-claims it and starts a work stretch, which is
 * the ordinary way one becomes yours. Handing it over is the deliberate one —
 * it moves the ticket without touching its status, and closes any open stretch
 * so the outgoing handler keeps the minutes they actually spent.
 */
export function useEmployeeTicketDetail(id?: number) {
  const navigate = useNavigate()
  const ticketId = id ?? Number.NaN

  const { data: ticket, isLoading, isError, error } = useEmployeeTicket(ticketId)

  const reply = useReplyToEmployeeTicket(ticketId)
  const changeStatus = useUpdateEmployeeTicketStatus(ticketId)
  const assign = useAssignEmployeeTicket(ticketId)

  /** Whose plate this is being read from — drives the "assigned to you" wording. */
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)

  /** The reply's file, held until send — nothing is uploaded while typing. */
  const [attachment, setAttachment] = useState<File | null>(null)

  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)

  /** The hand-over dialog, and the person picked in it (`''` is "nobody"). */
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assigneeId, setAssigneeId] = useState<string>(ALL_FILTER)

  /**
   * The work-session panel is opened, not loaded with the screen — a ticket
   * shouldn't pay for a round trip nobody looked at. Once opened it stays
   * mounted, so the query keeps itself fresh with the rest.
   */
  const [isWorkSessionsOpen, setIsWorkSessionsOpen] = useState(false)
  const workSessions = useEmployeeTicketWorkSessions(ticketId, isWorkSessionsOpen)

  /**
   * The assignee picker, from the account's existing user list — there is no
   * support-specific roster endpoint and no desk to filter by. Inactive people
   * are SHOWN and refused rather than hidden: the server answers 409 for one,
   * and a greyed row saying why beats a name that silently isn't there.
   *
   * Whether the target holds `employee-helpdesk:update` is deliberately not
   * checked — parking a ticket with a colleague whose role is still being set
   * up is legitimate.
   */
  const { data: users } = useAdminUsers(ALL_ROWS)

  const assigneeOptions = useMemo(
    () =>
      (users?.items ?? []).map((user) => ({
        label: user.id === currentUserId ? `${user.name} (you)` : user.name,
        value: String(user.id),
        disabled: user.status !== 'active',
        hint: user.status !== 'active' ? 'Inactive' : (user.roleName ?? undefined),
      })),
    [users?.items, currentUserId],
  )

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

  /** Seed the picker with whoever holds it, so a hand-over starts from the truth. */
  const openAssign = () => {
    setAssigneeId(ticket?.assignedToUserId ? String(ticket.assignedToUserId) : ALL_FILTER)
    setIsAssignOpen(true)
  }

  /**
   * Hand it over, or release it. `''` in the picker means nobody — sent as a
   * real `null`, which is the release, not an omitted field.
   *
   * The status is deliberately untouched by this route: an `in_progress` ticket
   * stays in progress with somebody else, and only the "being worked" light
   * goes dark until the new handler picks it up.
   */
  const onAssign = () => {
    const nextId = assigneeId ? Number(assigneeId) : null
    assign.mutate(nextId, {
      onSuccess: (updated) => {
        toast.success(
          nextId === null
            ? 'Released back to the unassigned queue'
            : `Handed to ${updated.assignedToName ?? 'your colleague'}`,
        )
        if (nextId !== null && updated.status === 'in_progress') {
          toast.info(
            'Still in progress — the clock stops until the new handler picks it up.',
          )
        }
        setIsAssignOpen(false)
      },
      // 404 the target isn't a user of this account · 409 they're inactive, or
      // the ticket is closed. The API words each one; show what it said.
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't change who is handling this.")),
    })
  }

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
    /** Only a CLOSED ticket refuses a hand-over — a resolved one is fair game. */
    canReassign: Boolean(ticket && canReassign(ticket)),
    canRelease: Boolean(ticket && canRelease(ticket)),
    /** Whether the person reading this is the one carrying it. */
    isMine: Boolean(ticket && currentUserId && ticket.assignedToUserId === currentUserId),

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

    /* Hand-over */
    isAssignOpen,
    setIsAssignOpen,
    openAssign,
    assigneeId,
    setAssigneeId,
    assigneeOptions,
    onAssign,
    isAssigning: assign.isPending,

    /* The effort breakdown, loaded only once the panel is opened */
    isWorkSessionsOpen,
    setIsWorkSessionsOpen,
    workSessions: workSessions.data,
    isLoadingWorkSessions: workSessions.isLoading,
    workSessionsError: workSessions.isError ? workSessions.error : undefined,
  }
}
