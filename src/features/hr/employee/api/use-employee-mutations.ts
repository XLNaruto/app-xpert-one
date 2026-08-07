import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { EmployeeBasicFormValues } from '../schemas'
import {
  createEmployee,
  deleteEmployeeFace,
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
