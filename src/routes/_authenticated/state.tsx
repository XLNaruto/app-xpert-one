import { createFileRoute } from '@tanstack/react-router'
import { StateListPage } from '@/features/master/state'

export const Route = createFileRoute('/_authenticated/state')({
  component: StateListPage,
})
