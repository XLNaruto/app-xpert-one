import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError, getApiErrorMessage } from '@/lib/api-error'
import type { ComboboxOption } from '@/components/ui/combobox'
import { supportTicketSchema, type SupportTicketFormValues } from '../schemas'
import { EMPTY_SUPPORT_TICKET_FORM } from '../constants'
import { useSupportSubCategories, useSupportTicket } from '../api/use-support-tickets'
import {
  useCreateSupportTicket,
  useUpdateSupportTicket,
} from '../api/use-support-ticket-mutations'
import {
  canEditWording,
  supportTicketToFormValues,
} from '../lib/support-ticket-mappers'

/**
 * Owns the Raise / Edit Ticket screen.
 *
 * **The desk and the severity are a one-time choice.** Together they select one
 * cell of the subscription's support promise, and that cell becomes the ticket's
 * deadline the moment it's raised. The API refuses to change either afterwards
 * at any point, so on edit both controls are locked and only the wording moves —
 * a ticket filed against the wrong desk is replaced, not amended.
 *
 * Each desk takes an optional sub-category from its own list on the platform;
 * switching desk clears it. It doesn't touch the deadline — that is still
 * desk + severity alone.
 *
 * The edit window itself closes when the desk first picks the ticket up (409
 * after that), so an edit that arrives too late is caught here as a message
 * rather than shown as a form that can't save.
 */
export function useSupportTicketForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useSupportTicket(id ?? Number.NaN)

  const createTicket = useCreateSupportTicket()
  const updateTicket = useUpdateSupportTicket(id ?? Number.NaN)

  const form = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: EMPTY_SUPPORT_TICKET_FORM,
  })
  const { control, reset, handleSubmit, setValue, setError } = form

  const ticketType = useWatch({ control, name: 'ticketType' }) ?? 'technical'
  const priority = useWatch({ control, name: 'priority' }) ?? 'normal'

  // Each desk has its own list, so it's read for the desk picked. Only while
  // raising — on an edit the pick is fixed and shown by name from the ticket.
  const subCategories = useSupportSubCategories(ticketType, undefined, { enabled: !isEdit })
  const subCategoryOptions = useMemo<ComboboxOption[]>(
    () =>
      (subCategories.data?.items ?? []).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    [subCategories.data],
  )

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(supportTicketToFormValues(detail.data))
  }, [detail.data, reset])

  const subCategoryId = useWatch({ control, name: 'subCategoryId' }) ?? ''

  const setTicketType = (value: string) => {
    const next = value === 'billing' ? 'billing' : 'technical'
    if (next === ticketType) return
    setValue('ticketType', next, { shouldValidate: true, shouldDirty: true })
    // A sub-category belongs to one desk's list — the old pick means nothing
    // on the new desk.
    setValue('subCategoryId', '', { shouldDirty: true })
  }

  const setSubCategoryId = (value: string) =>
    setValue('subCategoryId', value, { shouldValidate: true, shouldDirty: true })

  const setPriority = (value: string) =>
    setValue(
      'priority',
      value === 'medium' || value === 'high' || value === 'critical' ? value : 'normal',
      { shouldValidate: true, shouldDirty: true },
    )

  const goToList = () => navigate({ to: '/support/ticket' })

  /**
   * The desk has already picked this one up, so the wording is frozen. Shown as
   * a banner with the form read-only rather than as a 409 after a save.
   */
  const isLocked = Boolean(detail.data && !canEditWording(detail.data))

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      if (!detail.data || isLocked) return

      updateTicket.mutate(values, {
        onSuccess: () => {
          toast.success('Ticket updated')
          goToList()
        },
        // A 409 here means the desk picked it up between load and save.
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't update the ticket.")),
      })
      return
    }

    createTicket.mutate(values, {
      onSuccess: (ticket) => {
        toast.success(`Ticket ${ticket.code} raised`)
        // The promise may simply not cover this desk at this severity — say so
        // now rather than leaving them waiting on a deadline that was never made.
        if (ticket.dueAt === null) {
          toast.info('Your plan states no response time for this desk and severity.')
        }
        goToList()
      },
      onError: (err) => {
        const message = getApiErrorMessage(err, "Couldn't raise the ticket.")
        // A stale pick — the platform deleted that sub-category (or moved it
        // to the other desk) after the dropdown loaded. Reload the list and put the complaint on the field.
        if (
          err instanceof ApiError &&
          err.status === 400 &&
          /sub-category/i.test(message)
        ) {
          setValue('subCategoryId', '')
          setError('subCategoryId', { message })
          void subCategories.refetch()
        }
        toast.error(message)
      },
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    goToList,

    /** The ticket being edited — undefined while loading, and in create mode. */
    ticket: detail.data,
    /**
     * The desk and the severity priced the deadline, so they're read-only on an
     * edit. Only the wording is ever amendable.
     */
    isTypeLocked: isEdit,
    /** The desk has started answering — the wording is frozen too. */
    isLocked,

    ticketType,
    setTicketType,
    subCategoryId,
    setSubCategoryId,
    subCategoryOptions,
    isSubCategoriesLoading: subCategories.isLoading,
    subCategoriesError: subCategories.error,
    priority,
    setPriority,

    isPending: isEdit ? updateTicket.isPending : createTicket.isPending,
    isLoading: isEdit ? detail.isLoading : false,
    isError: isEdit ? detail.isError || (!detail.isLoading && !detail.data) : false,
    loadError: detail.error,
  }
}
