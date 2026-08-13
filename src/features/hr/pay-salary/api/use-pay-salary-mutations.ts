import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createSalaryPayment, downloadBankTransferSheet } from './pay-salary-api'
import type { BankTransferSheetParams, PayBatchPayload } from '../schemas'

/**
 * Confirm & Pay — record one batch and settle the salaries it names.
 *
 * Invalidates the whole salary feature rather than this screen's own key. A
 * payment stamps `is_paid` on the salary rows themselves, so the rows move from
 * the unpaid tab to the paid one, a new batch appears in the history, and View
 * Salary's Payment Status column changes for the same rows — every one of which
 * is stale the moment this succeeds.
 *
 * It invalidates on a **partly** refused batch too: whatever did settle is
 * already stale on screen, and the refusals are the caller's to report.
 */
export function usePaySalary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PayBatchPayload) => createSalaryPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salary.all })
      /* The reports read the same salary rows from their own key family, so the
         `salary` invalidation doesn't reach them — a statement left on screen
         would still be quoting the month as it was before this write. */
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}

/**
 * Download the bank's bulk-transfer sheet for what is outstanding.
 *
 * A mutation although it only reads: it is a click with a file as its effect,
 * not state the screen holds, and nothing about it should be cached — the
 * outstanding list moves as batches are recorded, and yesterday's sheet is the
 * wrong one to hand back.
 */
export function useDownloadBankTransferSheet() {
  return useMutation({
    mutationFn: (params: BankTransferSheetParams) => downloadBankTransferSheet(params),
  })
}
