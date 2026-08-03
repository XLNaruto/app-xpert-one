export { DepartmentListPage } from './pages/department-list-page'
export { DepartmentCreatePage } from './pages/department-create-page'
export { useDepartments } from './api/use-departments'
export { useDepartment } from './api/use-department'
export {
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from './api/use-department-mutations'
export { departmentOptions } from './lib/department-mappers'
export type { Department } from './types'
