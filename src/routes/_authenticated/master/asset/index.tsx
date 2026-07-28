import { createFileRoute } from '@tanstack/react-router'
import { AssetListPage } from '@/features/master/asset'

export const Route = createFileRoute('/_authenticated/master/asset/')({
  component: AssetListPage,
})
