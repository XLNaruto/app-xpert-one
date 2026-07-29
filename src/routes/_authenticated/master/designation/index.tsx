import { createFileRoute } from '@tanstack/react-router'
import { DesignationListPage } from '@/features/master/designation'

export const Route = createFileRoute('/_authenticated/master/designation/')({
  component: DesignationListPage,
})
