import { createFileRoute } from '@tanstack/react-router'
import { SopGroupListPage } from '@/features/office-task/sop-group'

export const Route = createFileRoute('/_authenticated/office-task/sop-group/')({
  component: SopGroupListPage,
})
