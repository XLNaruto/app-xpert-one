import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchEmployeeAssets,
  fetchEmployeeDocuments,
  fetchEmployeeEducations,
  fetchEmployeeExperiences,
  fetchEmployeeFamily,
  fetchEmployeeKyc,
  fetchEmployeeTransferDetail,
  fetchEmployeeTransfers,
  fetchEmployeeWageStructure,
} from './employee-step-api'

/**
 * Read hooks for steps 2–8.
 *
 * Every one is gated on a real employee id: until step 1 has been saved there is
 * nothing to address, and the wizard keeps those tabs locked anyway — `enabled`
 * makes sure a mounted-but-locked tab can't fire a request at `/employees/NaN/…`.
 *
 * The collection reads are unpaged because each endpoint answers every row of one
 * employee, which is a handful.
 */

/** Is this an employee id we can actually read by? */
function canRead(employeeId: number): boolean {
  return Number.isFinite(employeeId) && employeeId > 0
}

/** Step 2 — GET /user/employees/:id/kyc. Never 404s: an untouched step is nulls. */
export function useEmployeeKyc(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.kyc(employeeId),
    queryFn: () => fetchEmployeeKyc(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 3 — GET /user/employees/:id/wage-structure. Read-only, no write pairs it. */
export function useEmployeeWageStructure(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.wageStructure(employeeId),
    queryFn: () => fetchEmployeeWageStructure(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 4 — GET /user/employees/:id/family. */
export function useEmployeeFamily(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.family(employeeId),
    queryFn: () => fetchEmployeeFamily(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 5a — GET /user/employees/:id/educations. */
export function useEmployeeEducations(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.educations(employeeId),
    queryFn: () => fetchEmployeeEducations(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 5b — GET /user/employees/:id/experiences. Dates come back as `YYYY-MM`. */
export function useEmployeeExperiences(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.experiences(employeeId),
    queryFn: () => fetchEmployeeExperiences(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 6 — GET /user/employees/:id/documents. */
export function useEmployeeDocuments(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.documents(employeeId),
    queryFn: () => fetchEmployeeDocuments(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 7 — GET /user/employees/:id/assets. */
export function useEmployeeAssets(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.assets(employeeId),
    queryFn: () => fetchEmployeeAssets(employeeId),
    enabled: canRead(employeeId),
  })
}

/** Step 8 — GET /user/employees/:id/transfers. Newest posting first. */
export function useEmployeeTransfers(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.employee.transfers(employeeId),
    queryFn: () => fetchEmployeeTransfers(employeeId),
    enabled: canRead(employeeId),
  })
}

/**
 * Step 8 — one posting expanded, for the row's Details dialog and to seed the
 * restricted edit form. Only read while a dialog is actually open.
 */
export function useEmployeeTransferDetail(employeeId: number, serviceId?: number) {
  return useQuery({
    queryKey: queryKeys.employee.transfer(employeeId, serviceId ?? 0),
    queryFn: () => fetchEmployeeTransferDetail(employeeId, serviceId as number),
    enabled: canRead(employeeId) && serviceId !== undefined,
  })
}
