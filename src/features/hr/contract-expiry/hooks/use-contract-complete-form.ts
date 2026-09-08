import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DEFAULT_LEAVING_REASON } from '../constants'
import { contractCompleteSchema, type ContractCompleteFormValues } from '../schemas'
import type { ExpiringContract } from '../types'

/**
 * The "not renewed" dialog's form.
 *
 * Both fields are optional to the API — `{}` is a valid one-click call — so both
 * are pre-filled with what the API would have chosen anyway (the end of the term,
 * and "Contract completed — not renewed"), shown rather than hidden so the desk
 * can see what is about to be recorded and change it.
 *
 * This is LEAVE SERVICE reached from the panel: the posting is closed with a
 * leaving date and a reason, every history row stays, and nothing else is
 * flipped — the employee record is not deactivated, because "currently working"
 * is the ABSENCE of a leaving date, not a status column.
 */
export function useContractCompleteForm(
  row: ExpiringContract | null,
  onValid: (values: ContractCompleteFormValues) => void,
) {
  const form = useForm<ContractCompleteFormValues>({
    resolver: zodResolver(contractCompleteSchema),
    defaultValues: { leavingDate: '', leavingReason: DEFAULT_LEAVING_REASON },
  })

  const { reset } = form

  useEffect(() => {
    if (!row) return
    reset({
      // The API's own default, shown rather than left blank. Where the term
      // can't be placed on a calendar it stays empty and the API uses today.
      leavingDate: row.contractEndsOn ?? '',
      leavingReason: DEFAULT_LEAVING_REASON,
    })
  }, [row, reset])

  return { ...form, onSubmit: form.handleSubmit(onValid) }
}
