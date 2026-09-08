import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EMPTY_CONTRACT_RENEW_FORM } from '../constants'
import { addPeriod, previewReviewDate } from '../lib/contract-format'
import { contractRenewSchema, type ContractRenewFormValues } from '../schemas'
import type { ContractPeriodType, ExpiringContract } from '../types'

/**
 * The renew dialog's form.
 *
 * It opens pre-filled with the row's CURRENT period and unit, because most
 * renewals are for the same term — the two inputs are the same pair the Service
 * Details section already carries.
 *
 * THE ONE THING THE UI HAS TO EXPLAIN: by default the new term starts AT THE END
 * OF THE TERM IN FORCE, not today. A one-year renewal of a contract ending
 * 14 Aug 2026 runs to 14 Aug 2027 whether it was signed in July or on the day
 * itself; a term measured from the moment somebody clicked would silently
 * shorten or lengthen every renewal by however late the paperwork was. So the
 * "new term starts" date is offered only where that default is genuinely wrong —
 * an `expired` row, renewed after the term already lapsed.
 *
 * The end date this hook computes is GUIDANCE ONLY, shown before the call. After
 * it, the screen quotes `contractEndsOn` off the response.
 */
export function useContractRenewForm(
  row: ExpiringContract | null,
  onValid: (values: ContractRenewFormValues) => void,
) {
  const form = useForm<ContractRenewFormValues>({
    resolver: zodResolver(contractRenewSchema),
    defaultValues: EMPTY_CONTRACT_RENEW_FORM,
  })

  const { control, reset } = form

  // Re-seed whenever the dialog opens on a different row.
  useEffect(() => {
    if (!row) return
    reset({
      contractPeriod: String(row.contractPeriod ?? 1),
      contractPeriodType: row.contractPeriodType ?? 'YEAR',
      // Left blank on purpose: blank means "the end of the term in force",
      // which is the right answer for every row that has not lapsed.
      effectiveFrom: '',
      renewalDate: '',
    })
  }, [row, reset])

  const period = useWatch({ control, name: 'contractPeriod' })
  const periodType = useWatch({ control, name: 'contractPeriodType' })
  const effectiveFrom = useWatch({ control, name: 'effectiveFrom' })
  const renewalDate = useWatch({ control, name: 'renewalDate' })

  /**
   * Where the new term starts: the override if the desk set one, otherwise the
   * end of the term in force — which is exactly what the API will do.
   */
  const startsOn = effectiveFrom?.trim() || row?.contractEndsOn || null

  const preview = useMemo(() => {
    const count = Number(period)
    if (!startsOn || !Number.isInteger(count) || count <= 0) return null
    const endsOn = addPeriod(startsOn, count, periodType as ContractPeriodType)
    if (!endsOn) return null
    return {
      startsOn,
      endsOn,
      reviewOn:
        renewalDate?.trim() ||
        previewReviewDate(endsOn, periodType as ContractPeriodType),
    }
  }, [startsOn, period, periodType, renewalDate])

  /**
   * Whether to offer the "new term starts" date. On an `expired` row the default
   * — the end of a term that has already passed — may genuinely be wrong, and
   * the desk needs to be able to move it to today.
   */
  const showEffectiveFrom = row?.status === 'expired'

  return {
    ...form,
    /** The computed term, for the dialog's guidance line. Never rendered after a save. */
    preview,
    showEffectiveFrom,
    onSubmit: form.handleSubmit(onValid),
  }
}
