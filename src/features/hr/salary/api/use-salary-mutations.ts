import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  deleteSalaries,
  downloadSalaryImportTemplate,
  importSalaries,
  saveSalaries,
} from './salary-api'
import type { SalarySavePayload } from '../schemas'

/**
 * Process the month for the rows sent — one request, whichever button sent it.
 *
 * Invalidates the whole salary feature rather than the page's own key: a save
 * moves rows from the pending side of the register to the processed one, so the
 * tab that wasn't looked at is exactly the one that went stale. The company's
 * `totals` move with it.
 */
export function useSaveSalaries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SalarySavePayload) => saveSalaries(payload),
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
 * Import a month from a filled-in sheet: upload, then process.
 *
 * Invalidated like a save, and for the same reason — every row the sheet created
 * has moved from the pending side of the register to the processed one. It is
 * invalidated even on a *partly* refused import, because whatever did land is
 * already stale on screen.
 */
export function useImportSalaries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      companyId,
      month,
      year,
    }: {
      file: File
      companyId: number
      month: number
      year: number
    }) => importSalaries(file, { companyId, month, year }),
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
 * Download the sheet to fill in for the month on screen.
 *
 * A mutation rather than a query although it only reads: it is a click with a
 * file as its effect, not state the screen holds, and nothing about it should be
 * cached or refetched — the register moves under it, and yesterday's sheet is
 * the wrong one to hand back.
 */
export function useDownloadSalaryTemplate() {
  return useMutation({
    mutationFn: (filters: {
      companyId: number
      month: number
      year: number
      designationId?: number | null
    }) => downloadSalaryImportTemplate(filters),
  })
}

/**
 * Discard processed salaries so the month can be run again — the same
 * invalidation, in the other direction: the rows return to the pending side.
 */
export function useDeleteSalaries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (salaryIds: number[]) => deleteSalaries(salaryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salary.all })
      /* The reports read the same salary rows from their own key family, so the
         `salary` invalidation doesn't reach them — a statement left on screen
         would still be quoting the month as it was before this write. */
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}
