import type {
  PayBatchResponse,
  PaymentBatchResponse,
  PaymentHistoryResponse,
  SalaryPaymentsResponse,
} from '../schemas'
import type {
  PayBatchResult,
  PaymentBatch,
  PaymentBatchCard,
  PaymentBatchDetail,
  PaymentDocument,
  PaymentHistory,
  PaySalaryList,
} from '../types'

/**
 * Wire → screen. Pure: no React, no hooks.
 *
 * Every nullable number lands as `0` and every nullable string as `''`, because
 * a salary that reached this screen has been *processed* — a missing net pay is
 * a row with nothing to pay, not an unknown, and the cells that render these
 * want a value they can format rather than a branch each.
 */

const num = (value: number | null | undefined): number => value ?? 0
const str = (value: string | null | undefined): string => value ?? ''

/** The raw batch fields, shared by the card, the detail and the create result. */
function toBatch(raw: PayBatchResponse['batch']): PaymentBatch {
  return {
    id: raw.id,
    companyId: raw.company_id,
    departmentId: raw.department_id,
    designationId: raw.designation_id,
    month: raw.month,
    year: raw.year,
    paymentDate: raw.payment_date,
    paymentMode: raw.payment_mode,
    totalEmployees: raw.total_employees,
    totalAmount: raw.total_amount,
  }
}

/** A batch as the history screen carries it — minus its list position. */
function toBatchCard(
  raw: PaymentHistoryResponse['items'][number]['batch'],
): Omit<PaymentBatchCard, 'batchNumber'> {
  return {
    ...toBatch(raw),
    documentCount: raw.document_count,
    recordedBy: raw.audit_person_name,
    recordedAt: raw.recorded_at,
  }
}

function toDocument(raw: { id: number; document: string; file_name: string | null }): PaymentDocument {
  return {
    id: raw.id,
    /* The storage KEY, not a url — the component resolves it against the media
       base, the same as any other stored file. */
    key: raw.document,
    /* The key keeps only a slugified form of the name, so a batch filed without
       one has nothing better to print than the key's own tail. */
    fileName: raw.file_name || raw.document.split('/').pop() || 'Document',
  }
}

/** One page of either tab. */
export function toPaySalaryList(raw: SalaryPaymentsResponse): PaySalaryList {
  return {
    period: raw.period,
    status: raw.status,
    totals: {
      totalEmployees: raw.totals.total_employees,
      totalNetPay: raw.totals.total_net_pay,
    },
    items: raw.items.map((item) => ({
      salaryId: item.salary_id,
      employeeId: item.employee_id,
      employeeName: str(item.name),
      employeeCode: str(item.employee_code),
      mobile: str(item.primary_mobile),
      grossPay: num(item.gross_pay),
      netPay: num(item.net_pay),
      isPaid: item.is_paid,
      paymentDate: item.payment_date,
      batchId: item.salary_batch_id,
    })),
    total: raw.total,
  }
}

/** What Confirm & Pay came back with, refusals included. */
export function toPayBatchResult(raw: PayBatchResponse): PayBatchResult {
  return {
    batch: toBatch(raw.batch),
    documents: raw.documents.map(toDocument),
    paid: raw.paid.map((item) => ({
      salaryId: item.salary_id,
      employeeId: item.employee_id,
      employeeName: str(item.name),
      employeeCode: str(item.employee_code),
      netPay: num(item.net_pay),
    })),
    skipped: raw.skipped.map((item) => ({
      salaryId: item.salary_id,
      reason: item.reason,
    })),
  }
}

/** The period's batches, newest first. */
export function toPaymentHistory(raw: PaymentHistoryResponse): PaymentHistory {
  return {
    period: raw.period,
    totals: {
      paymentBatches: raw.totals.payment_batches,
      employeesPaid: raw.totals.employees_paid,
      totalAmountPaid: raw.totals.total_amount_paid,
    },
    items: raw.items.map((item) => ({
      ...toBatchCard(item.batch),
      batchNumber: item.batch_number,
    })),
    total: raw.total,
  }
}

/** One batch expanded. */
export function toPaymentBatchDetail(raw: PaymentBatchResponse): PaymentBatchDetail {
  return {
    batch: toBatchCard(raw.batch),
    documents: raw.documents.map(toDocument),
    employees: {
      items: raw.employees.items.map((item) => ({
        salaryId: item.salary_id,
        employeeId: item.employee_id,
        employeeName: str(item.name),
        employeeCode: str(item.employee_code),
        grossPay: num(item.gross_pay),
        netPay: num(item.net_pay),
      })),
      total: raw.employees.total,
    },
  }
}
