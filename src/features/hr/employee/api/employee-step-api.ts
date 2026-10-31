import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { uploadFile } from '@/lib/uploads'
import { DOCUMENT_CONTENT_TYPES } from '../constants'
import {
  employeeAssetListResponseSchema,
  employeeAssetResponseSchema,
  employeeDocumentListResponseSchema,
  employeeDocumentResponseSchema,
  employeeEducationListResponseSchema,
  employeeEducationResponseSchema,
  employeeExperienceListResponseSchema,
  employeeExperienceResponseSchema,
  employeeFamilyListResponseSchema,
  employeeFamilyResponseSchema,
  employeeKycResponseSchema,
  employeeTransferDetailResponseSchema,
  employeeRejoinEligibilityResponseSchema,
  employeeTransferListResponseSchema,
  employeeWageStructureResponseSchema,
} from '../schemas'
import {
  assetToPayload,
  documentToPayload,
  educationToPayload,
  experienceToPayload,
  familyToPayload,
  kycToPayload,
  leaveServiceToPayload,
  rejoinToPayload,
  toEmployeeRejoinEligibility,
  serviceEditToPayload,
  toEmployeeAsset,
  toEmployeeDocument,
  toEmployeeEducation,
  toEmployeeExperience,
  toEmployeeFamilyMember,
  toEmployeeKyc,
  toEmployeeTransfer,
  toEmployeeTransferDetail,
  toEmployeeWageStructure,
  transferToPayload,
} from '../lib/employee-step-mappers'
import type {
  EmployeeAssetFormValues,
  EmployeeAssetPayload,
  EmployeeDocumentFormValues,
  EmployeeDocumentPayload,
  EmployeeEducationFormValues,
  EmployeeEducationPayload,
  EmployeeExperienceFormValues,
  EmployeeExperiencePayload,
  EmployeeFamilyFormValues,
  EmployeeFamilyPayload,
  EmployeeKycFormValues,
  EmployeeKycPayload,
  EmployeeServiceEditFormValues,
  EmployeeServiceEditPayload,
  EmployeeTransferFormValues,
  EmployeeTransferPayload,
  LeaveServiceFormValues,
  LeaveServicePayload,
  EmployeeRejoinFormValues,
  EmployeeRejoinPayload,
} from '../schemas'
import type {
  EmployeeAsset,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFamilyMember,
  EmployeeKyc,
  EmployeeTransfer,
  EmployeeTransferDetail,
  EmployeeRejoinEligibility,
  EmployeeWageStructure,
} from '../types'

/**
 * Steps 2 through 8 — the sub-resources hung off one employee.
 *
 * Every collection here is **row-at-a-time**: the API has no whole-step save, so
 * a tab's Add/Edit dialog issues one POST or PATCH and its bin icon one DELETE.
 * That's why steps 4–7 are tables with dialogs rather than repeating form blocks
 * — the screen shape follows the endpoint shape.
 *
 * The collection reads take no pagination: each answers every row of one
 * employee, which is a handful.
 */

/* ── Step 2 — KYC ────────────────────────────────────────────────────────── */

/**
 * GET /user/employees/:id/kyc — the KYC columns. An untouched step comes back as
 * a record of nulls rather than a 404, so this never throws for "not saved yet";
 * `isKycEmpty()` is what tells the two apart.
 */
export async function fetchEmployeeKyc(employeeId: number): Promise<EmployeeKyc> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.KYC(employeeId))
    return toEmployeeKyc(employeeKycResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Load the KYC Detail.")
  }
}

/**
 * POST /user/employees/:id/kyc — the screen's first save. A full overwrite: an
 * omitted field is stored as `null`, so the record ends up matching exactly what
 * the form showed.
 */
export async function saveEmployeeKyc(
  employeeId: number,
  values: EmployeeKycFormValues,
): Promise<EmployeeKyc> {
  try {
    const raw = await http.post<unknown, EmployeeKycPayload>(
      endpoints.EMPLOYEES.KYC(employeeId),
      kycToPayload(values),
    )
    return toEmployeeKyc(employeeKycResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Save the KYC Detail.")
  }
}

/** PATCH /user/employees/:id/kyc — every save after the first. */
export async function updateEmployeeKyc(
  employeeId: number,
  values: EmployeeKycFormValues,
): Promise<EmployeeKyc> {
  try {
    const raw = await http.patch<unknown, EmployeeKycPayload>(
      endpoints.EMPLOYEES.KYC(employeeId),
      kycToPayload(values),
    )
    return toEmployeeKyc(employeeKycResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the KYC Detail.")
  }
}

/* ── Step 3 — the inherited wage structure ───────────────────────────────── */

/**
 * GET /user/employees/:id/wage-structure — read-only. The structure comes from
 * the designation on the employee's current posting; nothing is stored per
 * employee, so there is no write counterpart at all.
 */
export async function fetchEmployeeWageStructure(
  employeeId: number,
): Promise<EmployeeWageStructure> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.WAGE_STRUCTURE(employeeId))
    return toEmployeeWageStructure(employeeWageStructureResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Wage Structure.")
  }
}

/* ── Step 4 — family ─────────────────────────────────────────────────────── */

export async function fetchEmployeeFamily(
  employeeId: number,
): Promise<EmployeeFamilyMember[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.FAMILY(employeeId))
    return employeeFamilyListResponseSchema.parse(raw).items.map(toEmployeeFamilyMember)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Family Detail.")
  }
}

export async function createEmployeeFamilyMember(
  employeeId: number,
  values: EmployeeFamilyFormValues,
): Promise<EmployeeFamilyMember> {
  try {
    const raw = await http.post<unknown, EmployeeFamilyPayload>(
      endpoints.EMPLOYEES.FAMILY(employeeId),
      familyToPayload(values),
    )
    return toEmployeeFamilyMember(employeeFamilyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Add the Family Member.")
  }
}

export async function updateEmployeeFamilyMember(
  employeeId: number,
  memberId: number,
  values: EmployeeFamilyFormValues,
): Promise<EmployeeFamilyMember> {
  try {
    const raw = await http.patch<unknown, EmployeeFamilyPayload>(
      endpoints.EMPLOYEES.FAMILY_MEMBER(employeeId, memberId),
      familyToPayload(values),
    )
    return toEmployeeFamilyMember(employeeFamilyResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Family Member.")
  }
}

export async function deleteEmployeeFamilyMember(
  employeeId: number,
  memberId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.FAMILY_MEMBER(employeeId, memberId))
  } catch (error) {
    throw toApiError(error, "Couldn't Remove the Family Member.")
  }
}

/* ── Step 5a — education ─────────────────────────────────────────────────── */

export async function fetchEmployeeEducations(
  employeeId: number,
): Promise<EmployeeEducation[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.EDUCATIONS(employeeId))
    return employeeEducationListResponseSchema.parse(raw).items.map(toEmployeeEducation)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Education Detail.")
  }
}

export async function createEmployeeEducation(
  employeeId: number,
  values: EmployeeEducationFormValues,
): Promise<EmployeeEducation> {
  try {
    const raw = await http.post<unknown, EmployeeEducationPayload>(
      endpoints.EMPLOYEES.EDUCATIONS(employeeId),
      educationToPayload(values),
    )
    return toEmployeeEducation(employeeEducationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Add the Qualification.")
  }
}

export async function updateEmployeeEducation(
  employeeId: number,
  educationId: number,
  values: EmployeeEducationFormValues,
): Promise<EmployeeEducation> {
  try {
    const raw = await http.patch<unknown, EmployeeEducationPayload>(
      endpoints.EMPLOYEES.EDUCATION(employeeId, educationId),
      educationToPayload(values),
    )
    return toEmployeeEducation(employeeEducationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Qualification.")
  }
}

export async function deleteEmployeeEducation(
  employeeId: number,
  educationId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.EDUCATION(employeeId, educationId))
  } catch (error) {
    throw toApiError(error, "Couldn't Remove the Qualification.")
  }
}

/* ── Step 5b — experience ────────────────────────────────────────────────── */

export async function fetchEmployeeExperiences(
  employeeId: number,
): Promise<EmployeeExperience[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.EXPERIENCES(employeeId))
    return employeeExperienceListResponseSchema.parse(raw).items.map(toEmployeeExperience)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Experience Detail.")
  }
}

export async function createEmployeeExperience(
  employeeId: number,
  values: EmployeeExperienceFormValues,
): Promise<EmployeeExperience> {
  try {
    const raw = await http.post<unknown, EmployeeExperiencePayload>(
      endpoints.EMPLOYEES.EXPERIENCES(employeeId),
      experienceToPayload(values),
    )
    return toEmployeeExperience(employeeExperienceResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Add the Experience.")
  }
}

export async function updateEmployeeExperience(
  employeeId: number,
  experienceId: number,
  values: EmployeeExperienceFormValues,
): Promise<EmployeeExperience> {
  try {
    const raw = await http.patch<unknown, EmployeeExperiencePayload>(
      endpoints.EMPLOYEES.EXPERIENCE(employeeId, experienceId),
      experienceToPayload(values),
    )
    return toEmployeeExperience(employeeExperienceResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Experience.")
  }
}

export async function deleteEmployeeExperience(
  employeeId: number,
  experienceId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.EXPERIENCE(employeeId, experienceId))
  } catch (error) {
    throw toApiError(error, "Couldn't Remove the Experience.")
  }
}

/* ── Step 6 — documents ──────────────────────────────────────────────────── */

export async function fetchEmployeeDocuments(
  employeeId: number,
): Promise<EmployeeDocument[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.DOCUMENTS(employeeId))
    return employeeDocumentListResponseSchema.parse(raw).items.map(toEmployeeDocument)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Documents.")
  }
}

/**
 * Upload an attachment and answer the object key to store as `document`. The
 * bytes go straight to storage on a presigned PUT; replacing a file is a fresh
 * upload plus a PATCH with the new key.
 *
 * The presign files the object key under the document type, so `documentTypeId`
 * is required by the API and the card's type has to be chosen before its file.
 */
export async function uploadEmployeeDocumentFile(
  file: File,
  documentTypeId: number,
): Promise<string> {
  return uploadFile(endpoints.UPLOADS.EMPLOYEE_DOCUMENT, file, DOCUMENT_CONTENT_TYPES, {
    document_type_id: documentTypeId,
  })
}

export async function createEmployeeDocument(
  employeeId: number,
  values: EmployeeDocumentFormValues,
): Promise<EmployeeDocument> {
  try {
    const raw = await http.post<unknown, EmployeeDocumentPayload>(
      endpoints.EMPLOYEES.DOCUMENTS(employeeId),
      documentToPayload(values),
    )
    return toEmployeeDocument(employeeDocumentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Attach the Document.")
  }
}

export async function updateEmployeeDocument(
  employeeId: number,
  employeeDocumentId: number,
  values: EmployeeDocumentFormValues,
): Promise<EmployeeDocument> {
  try {
    const raw = await http.patch<unknown, EmployeeDocumentPayload>(
      endpoints.EMPLOYEES.DOCUMENT(employeeId, employeeDocumentId),
      documentToPayload(values),
    )
    return toEmployeeDocument(employeeDocumentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Document.")
  }
}

export async function deleteEmployeeDocument(
  employeeId: number,
  employeeDocumentId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(
      endpoints.EMPLOYEES.DOCUMENT(employeeId, employeeDocumentId),
    )
  } catch (error) {
    throw toApiError(error, "Couldn't Remove the Document.")
  }
}

/* ── Step 7 — assets ─────────────────────────────────────────────────────── */

export async function fetchEmployeeAssets(employeeId: number): Promise<EmployeeAsset[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.ASSETS(employeeId))
    return employeeAssetListResponseSchema.parse(raw).items.map(toEmployeeAsset)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Assets.")
  }
}

export async function createEmployeeAsset(
  employeeId: number,
  values: EmployeeAssetFormValues,
): Promise<EmployeeAsset> {
  try {
    const raw = await http.post<unknown, EmployeeAssetPayload>(
      endpoints.EMPLOYEES.ASSETS(employeeId),
      assetToPayload(values),
    )
    return toEmployeeAsset(employeeAssetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Assign the Asset.")
  }
}

/** A returned asset is an edit — flip the status — not a delete. */
export async function updateEmployeeAsset(
  employeeId: number,
  employeeAssetId: number,
  values: EmployeeAssetFormValues,
): Promise<EmployeeAsset> {
  try {
    const raw = await http.patch<unknown, EmployeeAssetPayload>(
      endpoints.EMPLOYEES.ASSET(employeeId, employeeAssetId),
      assetToPayload(values),
    )
    return toEmployeeAsset(employeeAssetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Asset.")
  }
}

export async function deleteEmployeeAsset(
  employeeId: number,
  employeeAssetId: number,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.EMPLOYEES.ASSET(employeeId, employeeAssetId))
  } catch (error) {
    throw toApiError(error, "Couldn't Remove the Asset.")
  }
}

/* ── Step 8 — transfers ──────────────────────────────────────────────────── */

/**
 * GET /user/employees/:id/transfers — every posting, newest first. The first row
 * is the current posting (the one step 1 shows); the rest are closed history.
 */
export async function fetchEmployeeTransfers(
  employeeId: number,
): Promise<EmployeeTransfer[]> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.TRANSFERS(employeeId))
    return employeeTransferListResponseSchema.parse(raw).items.map(toEmployeeTransfer)
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Transfer History.")
  }
}

/** GET one posting expanded — its service detail plus the wage structure it was held under. */
export async function fetchEmployeeTransferDetail(
  employeeId: number,
  serviceId: number,
): Promise<EmployeeTransferDetail> {
  try {
    const raw = await http.get<unknown>(
      endpoints.EMPLOYEES.TRANSFER(employeeId, serviceId),
    )
    return toEmployeeTransferDetail(employeeTransferDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Load the Posting Detail.")
  }
}

/**
 * POST /user/employees/:id/transfers — one atomic move: the open posting is
 * closed with the leaving details and the new one inserted, so the old row
 * survives as history. Answers the NEW posting with the wage structure it now
 * inherits.
 */
export async function transferEmployee(
  employeeId: number,
  values: EmployeeTransferFormValues,
  currentCompanyId?: number,
): Promise<EmployeeTransferDetail> {
  try {
    const raw = await http.post<unknown, EmployeeTransferPayload>(
      endpoints.EMPLOYEES.TRANSFERS(employeeId),
      transferToPayload(values, currentCompanyId),
    )
    return toEmployeeTransferDetail(employeeTransferDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Transfer the Employee.")
  }
}

/**
 * PATCH /user/employees/:id/transfers/:serviceId — correct the latest posting in
 * place. The history is append-only, so a `serviceId` from closed history is
 * refused; the screen only offers Edit on the latest row for that reason.
 */
export async function updateEmployeeService(
  employeeId: number,
  serviceId: number,
  values: EmployeeServiceEditFormValues,
  /** What the form was seeded with — only fields that differ from it are sent. */
  initial?: EmployeeServiceEditFormValues,
): Promise<EmployeeTransferDetail> {
  try {
    const raw = await http.patch<unknown, Partial<EmployeeServiceEditPayload>>(
      endpoints.EMPLOYEES.TRANSFER(employeeId, serviceId),
      serviceEditToPayload(values, initial),
    )
    return toEmployeeTransferDetail(employeeTransferDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Update the Posting.")
  }
}

/**
 * POST …/leave-service — close the open posting without opening another: the
 * employee exits. Only the latest, still-open posting can be left.
 */
export async function leaveEmployeeService(
  employeeId: number,
  serviceId: number,
  values: LeaveServiceFormValues,
): Promise<EmployeeTransferDetail> {
  try {
    const raw = await http.post<unknown, LeaveServicePayload>(
      endpoints.EMPLOYEES.LEAVE_SERVICE(employeeId, serviceId),
      leaveServiceToPayload(values),
    )
    return toEmployeeTransferDetail(employeeTransferDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Close the Posting.")
  }
}

/**
 * GET /user/employees/:id/rejoin — may this de-active employee rejoin, and into
 * which of their earlier companies. Guarded by `employees:read`.
 */
export async function fetchEmployeeRejoinEligibility(
  employeeId: number,
): Promise<EmployeeRejoinEligibility> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.REJOIN(employeeId))
    return toEmployeeRejoinEligibility(employeeRejoinEligibilityResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Check Whether This Employee Can Rejoin.")
  }
}

/**
 * POST /user/employees/:id/rejoin — open a new spell of service in a company the
 * employee worked in before. Old postings are untouched; a company other than the
 * record's moves the record to it, as a company transfer does. Answers the NEW
 * posting with the wage structure it inherits. Guarded by `employees:create`.
 *
 * Refused 409 while their service runs anywhere (or another live record with the
 * same Aadhaar / PAN / UAN does) — the message names where, for the form's banner.
 */
export async function rejoinEmployee(
  employeeId: number,
  values: EmployeeRejoinFormValues,
): Promise<EmployeeTransferDetail> {
  try {
    const raw = await http.post<unknown, EmployeeRejoinPayload>(
      endpoints.EMPLOYEES.REJOIN(employeeId),
      rejoinToPayload(values),
    )
    return toEmployeeTransferDetail(employeeTransferDetailResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't Rejoin the Employee.")
  }
}
