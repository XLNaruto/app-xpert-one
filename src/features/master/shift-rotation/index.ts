/**
 * Shift Rotation — the module's public surface.
 *
 * Two screens (the master list and the one create/edit form behind it) plus the
 * reads the employee shift tab needs to put someone on a cycle. Cross-feature
 * imports come through here, never through a deep path.
 */
export { ShiftRotationListPage } from './pages/shift-rotation-list-page'
export { ShiftRotationCreatePage } from './pages/shift-rotation-create-page'

export { useShiftRotations, useShiftRotation } from './api/use-shift-rotations'
export {
  useCreateShiftRotation,
  useUpdateShiftRotation,
  useDeleteShiftRotation,
} from './api/use-shift-rotation-mutations'

export { shiftRotationOptions, rotationSummary } from './lib/shift-rotation-mappers'

export type { ShiftRotation, RotationWeek } from './types'
