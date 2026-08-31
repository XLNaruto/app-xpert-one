import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type {
  EmployeeAssetFormValues,
  EmployeeDocumentFormValues,
  EmployeeEducationFormValues,
  EmployeeExperienceFormValues,
  EmployeeFamilyFormValues,
  EmployeeKycFormValues,
  EmployeeServiceEditFormValues,
  EmployeeTransferFormValues,
  LeaveServiceFormValues,
} from '../schemas'
import {
  createEmployeeAsset,
  createEmployeeDocument,
  createEmployeeEducation,
  createEmployeeExperience,
  createEmployeeFamilyMember,
  deleteEmployeeAsset,
  deleteEmployeeDocument,
  deleteEmployeeEducation,
  deleteEmployeeExperience,
  deleteEmployeeFamilyMember,
  leaveEmployeeService,
  saveEmployeeKyc,
  transferEmployee,
  updateEmployeeAsset,
  updateEmployeeDocument,
  updateEmployeeEducation,
  updateEmployeeExperience,
  updateEmployeeFamilyMember,
  updateEmployeeKyc,
  updateEmployeeService,
  uploadEmployeeDocumentFile,
} from './employee-step-api'

/**
 * Write hooks for steps 2–8.
 *
 * Each one invalidates `queryKeys.employee.all`, not just its own collection.
 * That's deliberate: `completed_steps` lives on the employee record, so saving a
 * row in *any* step can flip a flag the wizard's progress ring and tab ticks
 * read — refreshing only the collection would leave the nav showing a step as
 * still open.
 *
 * Every collection is row-at-a-time, mirroring the API: there is no whole-step
 * save anywhere here.
 */

/** Refresh everything hung off one employee, the record itself included. */
function useInvalidateEmployee() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
}

/* ── Step 2 — KYC ────────────────────────────────────────────────────────── */

/**
 * The KYC save, POST or PATCH.
 *
 * There is no create/update pair for the caller to choose between — every KYC
 * field is a column on the employee, so the first save is a full-overwrite POST
 * and every later one a partial PATCH. `isFirstSave` (from `isKycEmpty()`) picks
 * which, so the screen just calls "save".
 */
export function useSaveEmployeeKyc(employeeId: number, isFirstSave: boolean) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (values: EmployeeKycFormValues) =>
      isFirstSave
        ? saveEmployeeKyc(employeeId, values)
        : updateEmployeeKyc(employeeId, values),
    onSuccess: invalidate,
  })
}

/* ── Step 4 — family ─────────────────────────────────────────────────────── */

export function useCreateEmployeeFamilyMember(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (values: EmployeeFamilyFormValues) =>
      createEmployeeFamilyMember(employeeId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeFamilyMember(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      memberId,
      values,
    }: {
      memberId: number
      values: EmployeeFamilyFormValues
    }) => updateEmployeeFamilyMember(employeeId, memberId, values),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployeeFamilyMember(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (memberId: number) => deleteEmployeeFamilyMember(employeeId, memberId),
    onSuccess: invalidate,
  })
}

/* ── Step 5a — education ─────────────────────────────────────────────────── */

export function useCreateEmployeeEducation(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (values: EmployeeEducationFormValues) =>
      createEmployeeEducation(employeeId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeEducation(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      educationId,
      values,
    }: {
      educationId: number
      values: EmployeeEducationFormValues
    }) => updateEmployeeEducation(employeeId, educationId, values),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployeeEducation(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (educationId: number) =>
      deleteEmployeeEducation(employeeId, educationId),
    onSuccess: invalidate,
  })
}

/* ── Step 5b — experience ────────────────────────────────────────────────── */

export function useCreateEmployeeExperience(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (values: EmployeeExperienceFormValues) =>
      createEmployeeExperience(employeeId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeExperience(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      experienceId,
      values,
    }: {
      experienceId: number
      values: EmployeeExperienceFormValues
    }) => updateEmployeeExperience(employeeId, experienceId, values),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployeeExperience(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (experienceId: number) =>
      deleteEmployeeExperience(employeeId, experienceId),
    onSuccess: invalidate,
  })
}

/* ── Step 6 — documents ──────────────────────────────────────────────────── */

/**
 * Presign + PUT one attachment, answering the object key. The row itself is saved
 * separately with that key, so nothing is invalidated here. The presign files the
 * key under the card's document type, which is why the id travels with the file.
 */
export function useUploadEmployeeDocumentFile() {
  return useMutation({
    mutationFn: ({ file, documentTypeId }: { file: File; documentTypeId: number }) =>
      uploadEmployeeDocumentFile(file, documentTypeId),
  })
}

export function useCreateEmployeeDocument(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (values: EmployeeDocumentFormValues) =>
      createEmployeeDocument(employeeId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeDocument(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      documentId,
      values,
    }: {
      documentId: number
      values: EmployeeDocumentFormValues
    }) => updateEmployeeDocument(employeeId, documentId, values),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployeeDocument(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: (documentId: number) => deleteEmployeeDocument(employeeId, documentId),
    onSuccess: invalidate,
  })
}

/* ── Step 7 — assets ─────────────────────────────────────────────────────── */

/**
 * A handout moves stock, so the variant caches it touched are no longer true.
 * Cheaper to drop the whole variant tree than to work out which asset moved.
 */
function useInvalidateEmployeeAsset() {
  const invalidateEmployee = useInvalidateEmployee()
  const queryClient = useQueryClient()
  return () => {
    invalidateEmployee()
    queryClient.invalidateQueries({ queryKey: queryKeys.assetVariant.all })
  }
}

export function useCreateEmployeeAsset(employeeId: number) {
  const invalidate = useInvalidateEmployeeAsset()
  return useMutation({
    mutationFn: (values: EmployeeAssetFormValues) =>
      createEmployeeAsset(employeeId, values),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployeeAsset(employeeId: number) {
  const invalidate = useInvalidateEmployeeAsset()
  return useMutation({
    mutationFn: ({
      assetId,
      values,
    }: {
      assetId: number
      values: EmployeeAssetFormValues
    }) => updateEmployeeAsset(employeeId, assetId, values),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployeeAsset(employeeId: number) {
  const invalidate = useInvalidateEmployeeAsset()
  return useMutation({
    mutationFn: (assetId: number) => deleteEmployeeAsset(employeeId, assetId),
    onSuccess: invalidate,
  })
}

/* ── Step 8 — transfers ──────────────────────────────────────────────────── */

/**
 * POST …/transfers — close the current posting and open the new one. This changes
 * which designation the employee sits under, so the inherited wage structure moves
 * with it; invalidating `employee.all` picks that up on step 3 as well.
 */
export function useTransferEmployee(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      values,
      currentCompanyId,
    }: {
      values: EmployeeTransferFormValues
      /** The company being left — what tells a company move from a branch one. */
      currentCompanyId?: number
    }) => transferEmployee(employeeId, values, currentCompanyId),
    onSuccess: invalidate,
  })
}

/** PATCH …/transfers/:serviceId — correct the latest posting in place. */
export function useUpdateEmployeeService(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      serviceId,
      values,
    }: {
      serviceId: number
      values: EmployeeServiceEditFormValues
    }) => updateEmployeeService(employeeId, serviceId, values),
    onSuccess: invalidate,
  })
}

/**
 * POST …/leave-service — close the open posting without opening another. This is
 * the nearest thing the API has to deactivating an employee: with no open posting
 * they stop being on strength.
 */
export function useLeaveEmployeeService(employeeId: number) {
  const invalidate = useInvalidateEmployee()
  return useMutation({
    mutationFn: ({
      serviceId,
      values,
    }: {
      serviceId: number
      values: LeaveServiceFormValues
    }) => leaveEmployeeService(employeeId, serviceId, values),
    onSuccess: invalidate,
  })
}
