import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { downloadFile } from '@/lib/downloads'
import { uploadFile } from '@/lib/uploads'
import type { PageParams } from '@/lib/pagination'
import { PAYMENT_DOCUMENT_CONTENT_TYPES } from '../constants'
import {
  payBatchResponseSchema,
  paymentBatchResponseSchema,
  paymentHistoryResponseSchema,
  salaryPaymentsResponseSchema,
  type BankTransferSheetParams,
  type PayBatchPayload,
  type PaymentHistoryFilters,
  type PaySalaryFilters,
} from '../schemas'
import {
  toPayBatchResult,
  toPaymentBatchDetail,
  toPaymentHistory,
  toPaySalaryList,
} from '../lib/pay-salary-mappers'
import type {
  PayBatchResult,
  PaymentBatchDetail,
  PaymentHistory,
  PaySalaryList,
} from '../types'

/**
 * `GET /user/salary/payments` — one page of the period, on the tab asked for.
 *
 * Only employees whose salary has been CALCULATED are on either side: this reads
 * salary rows, not the roster. Who is still unpriced is the register's question.
 *
 * The endpoint takes no `sort`, so the order is the server's and the screen's
 * columns aren't sortable; `search` matches the name, code or mobile number.
 * The company is passed in rather than read from the session because the query
 * key needs the same value.
 */
export async function fetchSalaryPayments(
  filters: PaySalaryFilters,
  { limit, offset, search }: PageParams,
): Promise<PaySalaryList> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.PAYMENTS, {
      params: {
        company_id: filters.companyId,
        month: filters.month,
        year: filters.year,
        status: filters.status,
        ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
        limit,
        offset,
      },
    })
    return toPaySalaryList(salaryPaymentsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the salary payments.")
  }
}

/**
 * Confirm & Pay — the proof documents, then the batch, as one call for the UI.
 *
 * 1. Each file gets its own presigned PUT (`POST /user/uploads/salary-payment-document`)
 *    and goes straight to storage; nothing is written to the database, so a
 *    dialog cancelled before this leaves no half-recorded batch.
 * 2. `POST /user/salary/payments` records ONE batch and stamps every salary it
 *    settles. `file_name` is sent alongside the key because the key keeps only a
 *    slug of it — `sample_23 (3).pdf` can't be recovered from the key alone.
 *
 * The uploads run in parallel: ten files each waiting on the last would make the
 * dialog sit on a spinner far longer than the batch itself takes.
 *
 * A row failing one of the endpoint's checks comes back in `skipped` while the
 * rest of the batch lands, so the caller must read the result rather than treat
 * a 201 as "everything selected was paid".
 */
export async function createSalaryPayment(
  payload: PayBatchPayload,
): Promise<PayBatchResult> {
  const documents = await Promise.all(
    payload.documents.map(async (file) => ({
      key: await uploadFile(
        endpoints.UPLOADS.SALARY_PAYMENT_DOCUMENT,
        file,
        PAYMENT_DOCUMENT_CONTENT_TYPES,
      ),
      file_name: file.name.slice(0, 255),
    })),
  )

  try {
    const raw = await http.post<unknown>(endpoints.SALARY.PAYMENTS, {
      company_id: payload.companyId,
      month: payload.month,
      year: payload.year,
      ...(payload.departmentId ? { department_id: payload.departmentId } : {}),
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode,
      documents,
      payments: payload.payments.map((row) => ({
        salary_id: row.salaryId,
        employee_id: row.employeeId,
      })),
    })
    return toPayBatchResult(payBatchResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't record the payment.")
  }
}

/**
 * `GET /user/salary/payments/history` — every Confirm & Pay of this period and
 * scope, newest first, with the three counters over the whole filter.
 */
export async function fetchPaymentHistory(
  filters: PaymentHistoryFilters,
  { limit, offset }: PageParams,
): Promise<PaymentHistory> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.PAYMENT_HISTORY, {
      params: {
        company_id: filters.companyId,
        month: filters.month,
        year: filters.year,
        ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
        limit,
        offset,
      },
    })
    return toPaymentHistory(paymentHistoryResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the payment history.")
  }
}

/**
 * One batch expanded. The employees are paged inside it — a batch may hold five
 * hundred — and the figures come from the salary rows themselves, so what the
 * batch settled can't drift from what those rows say.
 */
export async function fetchPaymentBatch(
  id: number,
  { limit, offset }: PageParams,
): Promise<PaymentBatchDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.PAYMENT(id), {
      params: { limit, offset },
    })
    return toPaymentBatchDetail(paymentBatchResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the payment batch.")
  }
}

/**
 * The bank's bulk-transfer sheet for what is still outstanding.
 *
 * Scoped by the period and department the screen is reading, deliberately *not*
 * by the tick-box selection: the sheet is the file the bank's portal ingests and
 * it describes every unpaid salary of the scope, so re-downloading it after a
 * partial payment always gives what is still owed.
 *
 * 404 when nothing of the period is outstanding — which `downloadFile` surfaces
 * as the API's own message rather than saving an error body as a spreadsheet.
 */
export async function downloadBankTransferSheet({
  companyId,
  month,
  year,
  departmentId,
  paymentMode,
  debitAccountNumber,
}: BankTransferSheetParams): Promise<void> {
  await downloadFile(endpoints.SALARY.BANK_TRANSFER_SHEET, {
    params: {
      company_id: companyId,
      month,
      year,
      ...(departmentId ? { department_id: departmentId } : {}),
      payment_mode: paymentMode,
      debit_account_number: debitAccountNumber.trim(),
    },
    fallbackName: `bank-transfer-${year}-${String(month).padStart(2, '0')}-${paymentMode}.xlsx`,
    errorMessage: "Couldn't download the bank transfer sheet.",
  })
}
