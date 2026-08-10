import axios from 'axios'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { presignUpload } from '@/lib/uploads'
import { downloadFile } from '@/lib/downloads'
import type { PageParams } from '@/lib/pagination'
import { toPeriod, toSalaryRegister } from '../lib/salary-mappers'
import {
  salaryDeleteResponseSchema,
  salaryImportResponseSchema,
  salaryRegisterResponseSchema,
  salarySaveResponseSchema,
  type SalaryImportPayload,
  type SalaryRegisterFilters,
  type SalarySavePayload,
} from '../schemas'
import type {
  SalaryDeleteResult,
  SalaryImportResult,
  SalaryRegister,
  SalarySaveResult,
} from '../types'

/**
 * The payroll calls — the register, and the two writes that process or discard a
 * month.
 *
 * The register hands over the *inputs* — the attendance, the wage structure in
 * force, that structure's head configuration and the PF / ESIC / PT / LWF rate
 * masters for the period — and the save takes back the full snapshot the screen
 * priced each row at. It no longer answers the pay itself: **the client decides
 * it**, and every figure is stored as sent, because payroll may override any of
 * it at salary time and no override is recoverable from the designation's wage
 * structure afterwards. So the API takes the screen's word for the money and
 * checks only that the row adds up.
 */

/**
 * GET /user/salary/register — one page of the month's register.
 *
 * `status` splits it in SQL: `pending` is the postings with no salary row for
 * the period, `complete` the ones already processed, whose stored figures come
 * back filled in. `total` counts the side being read, while `totals` always
 * describes the whole company.
 *
 * `designation_id` is the screen's own filter — the grid's allowance and
 * deduction columns are the designation's heads, so a register is read one
 * designation at a time. The company is passed in rather than read from the
 * session here because the query key needs the same value.
 */
export async function fetchSalaryRegister(
  filters: SalaryRegisterFilters,
  { limit, offset, search }: PageParams,
): Promise<SalaryRegister> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.REGISTER, {
      params: {
        company_id: filters.companyId,
        month: filters.month,
        year: filters.year,
        status: filters.status,
        ...(filters.designationId ? { designation_id: filters.designationId } : {}),
        ...(search?.trim() ? { term: search.trim() } : {}),
        limit,
        offset,
      },
    })
    return toSalaryRegister(salaryRegisterResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the salary register.")
  }
}

/**
 * POST /user/salary/bulk-save — commit the run for many postings at once, in one
 * transaction.
 *
 * A row is upserted on `(employee_service_id, year, month)`: never processed is
 * created, already processed is revised. A paid month, a posting that isn't on
 * this register, a head outside the company's catalog and a row whose totals
 * disagree with its own breakdown are refused into `skipped` — the rest of the
 * batch still lands, so the caller has to report what didn't rather than assume
 * it all did.
 */
export async function saveSalaries(
  payload: SalarySavePayload,
): Promise<SalarySaveResult> {
  try {
    const raw = await http.post<unknown, SalarySavePayload>(
      endpoints.SALARY.BULK_SAVE,
      payload,
    )
    const { saved, skipped } = salarySaveResponseSchema.parse(raw)
    return {
      saved: saved.map((row) => ({
        employeeServiceId: row.employee_service_id,
        salaryId: row.salary_id,
        action: row.action,
      })),
      skipped: skipped.map((row) => ({
        employeeServiceId: row.employee_service_id,
        reason: row.reason,
      })),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't save the salary register.")
  }
}

/**
 * GET /user/salary/exports/import-template — the sheet the import reads back.
 *
 * Sent for the register as it stands on screen, so the file holds the same
 * people the grid does: pending postings only, one row each, Present Days
 * pre-filled from attendance and everything else locked. A period already
 * processed is left out — the import refuses it, so those rows would be
 * guaranteed skips.
 *
 * The workbook comes back as the response body rather than a link, which is why
 * this goes through `downloadFile` instead of `http`.
 */
export async function downloadSalaryImportTemplate({
  companyId,
  month,
  year,
  designationId,
}: {
  companyId: number
  month: number
  year: number
  designationId?: number | null
}): Promise<void> {
  await downloadFile(endpoints.SALARY.IMPORT_TEMPLATE, {
    params: {
      company_id: companyId,
      month,
      year,
      ...(designationId ? { designation_id: designationId } : {}),
    },
    fallbackName: `salary-import-template-${year}-${String(month).padStart(2, '0')}.xlsx`,
    errorMessage: "Couldn't download the salary import template.",
  })
}

/**
 * The two spreadsheet formats the import endpoint signs for. A browser reports
 * `.csv` as anything from `text/csv` to `application/vnd.ms-excel` to nothing at
 * all, so the type is taken from the extension rather than from the file.
 */
const IMPORT_CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

/** Whether a picked file is one the import can read at all. */
export function salaryImportContentType(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return IMPORT_CONTENT_TYPES[extension] ?? null
}

/**
 * Import a month from a filled-in sheet — the two calls it takes, as one.
 *
 * 1. `POST /user/uploads/salary-import` presigns a PUT and answers the object
 *    `key`; the workbook goes straight to storage, never through the API.
 * 2. `POST /user/salary/imports` reads the sheet at that key, prices every row
 *    and saves it — one transaction, and the response is the report the screen
 *    shows.
 *
 * Rows are only ever created. A period already processed for a posting is
 * reported in `skipped` rather than overwritten, and **the period written in the
 * sheet wins** over the month sent here, which is why the answer echoes the
 * period it actually ran for.
 */
export async function importSalaries(
  file: File,
  { companyId, month, year }: { companyId: number; month: number; year: number },
): Promise<SalaryImportResult> {
  const contentType = salaryImportContentType(file)
  if (!contentType) {
    throw toApiError(
      new Error('Unsupported file type'),
      'Pick an .xlsx or .csv sheet — those are the two the import reads.',
    )
  }

  /* Presign against the extension's type rather than the browser's guess, and
     PUT with the same one — the signature covers the header. */
  const { uploadUrl, key } = await presignUpload(
    endpoints.UPLOADS.SALARY_IMPORT,
    contentType,
    { fileName: file.name },
  )

  try {
    // Bare axios: the presigned URL authenticates itself, and our bearer header
    // would make the storage host reject the request.
    await axios.put(uploadUrl, file, { headers: { 'Content-Type': contentType } })
  } catch (error) {
    throw toApiError(error, "Couldn't upload the sheet.")
  }

  try {
    const raw = await http.post<unknown, SalaryImportPayload>(endpoints.SALARY.IMPORTS, {
      company_id: companyId,
      month,
      year,
      file_key: key,
    })
    const parsed = salaryImportResponseSchema.parse(raw)
    return {
      period: toPeriod(parsed.period),
      saved: parsed.saved.map((row) => ({
        employeeCode: row.employee_code,
        reason: '',
        salaryId: row.salary_id,
      })),
      skipped: parsed.skipped.map((row) => ({
        employeeCode: row.employee_code,
        reason: row.reason,
      })),
      errors: parsed.errors.map((row) => ({
        employeeCode: row.employee_code,
        reason: row.reason,
      })),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't import the salary sheet.")
  }
}

/**
 * POST /user/salary/bulk-delete — discard processed salaries so the month can be
 * run again. A POST rather than a DELETE because the ids travel in a body: this
 * is the register's "discard selected", not the removal of one addressed row.
 *
 * The rows are soft-deleted, which is what makes re-processing possible. A paid
 * salary is refused into `skipped`; a partly-refused selection is still a
 * success, and only a request where nothing could be deleted fails outright.
 */
export async function deleteSalaries(
  salaryIds: number[],
): Promise<SalaryDeleteResult> {
  try {
    const raw = await http.post<unknown, { salary_ids: number[] }>(
      endpoints.SALARY.BULK_DELETE,
      { salary_ids: salaryIds },
    )
    const { deleted, skipped } = salaryDeleteResponseSchema.parse(raw)
    return {
      deleted,
      skipped: skipped.map((row) => ({ salaryId: row.salary_id, reason: row.reason })),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't discard the processed salaries.")
  }
}
