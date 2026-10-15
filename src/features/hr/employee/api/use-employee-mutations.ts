import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Paginated } from '@/lib/pagination'
import type { EmployeeBasicFormValues } from '../schemas'
import type { Employee } from '../types'
import {
  createEmployee,
  deleteEmployee,
  deleteEmployeeFace,
  setEmployeeGeoFence,
  updateEmployee,
  uploadEmployeePhoto,
} from './employee-api'

/**
 * Step 1's mutations.
 *
 * Both invalidate `employee.all` rather than just the list: `completed_steps`
 * rides on the employee record, so a step-1 save changes what the wizard's
 * progress ring and tab locks read — and the detail entry has to be refetched for
 * that, not only the page of rows behind it.
 */

/** POST /user/employees — the person plus their opening posting. */
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeBasicFormValues) => createEmployee(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/**
 * PATCH /user/employees/:id — the person plus the CURRENT posting. The transfer
 * queries are invalidated too, since the Service section writes onto the same row
 * step 8's history lists.
 */
export function useUpdateEmployee(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeBasicFormValues) => updateEmployee(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/**
 * DELETE /user/employees/:id — soft delete. The detail entry is dropped rather
 * than refetched: it would only answer 404 now.
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.employee.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/**
 * DELETE /user/employees/:id/face — de-register the employee's face and its
 * captured images. `employee_faces` rides on the list row itself, so the whole
 * employee scope is invalidated and the row's face count drops on the next read.
 */
export function useDeleteEmployeeFace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEmployeeFace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/**
 * Presign + PUT a profile photo, answering the object key to hold on the form.
 * Nothing is written to the employee until step 1 is saved with that key, so this
 * invalidates nothing.
 */
export function useUploadEmployeePhoto() {
  return useMutation({ mutationFn: (file: File) => uploadEmployeePhoto(file) })
}

/**
 * PUT /user/employees/:id/geo-fence — the list's per-row switch.
 *
 * The answered value is written straight into every cached page and the detail
 * entry, so the row settles on what the server holds without a refetch of the
 * whole page. A failure (a 404 for an employee gone or out of scope) refetches
 * the employee scope instead, so a stale row doesn't linger.
 */
export function useSetEmployeeGeoFence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      setEmployeeGeoFence(id, enabled),
    onSuccess: (isGeoFenceEnabled, { id }) => {
      const patch = (employee: Employee) =>
        employee.id === id ? { ...employee, isGeoFenceEnabled } : employee
      queryClient.setQueriesData<Paginated<Employee>>(
        { queryKey: queryKeys.employee.list() },
        (page) => (page ? { ...page, items: page.items.map(patch) } : page),
      )
      queryClient.setQueryData<Employee>(queryKeys.employee.detail(id), (employee) =>
        employee ? patch(employee) : employee,
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}
