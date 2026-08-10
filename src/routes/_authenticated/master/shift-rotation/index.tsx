import { createFileRoute } from '@tanstack/react-router'
import { ShiftRotationListPage } from '@/features/master/shift-rotation'

export const Route = createFileRoute('/_authenticated/master/shift-rotation/')({
  component: ShiftRotationListPage,
})
