import { createFileRoute } from '@tanstack/react-router'
import { DistrictListPage } from '@/features/master/district'

export const Route = createFileRoute('/_authenticated/district')({
  component: DistrictListPage,
})
