import { createFileRoute } from '@tanstack/react-router'
import { ContractExpiryListPage } from '@/features/hr/contract-expiry'

export const Route = createFileRoute('/_authenticated/hr/contract-expiry/')({
  component: ContractExpiryListPage,
})
