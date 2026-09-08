export { ContractExpiryListPage } from './pages/contract-expiry-list-page'
/**
 * The dashboard's card. The only other thing that crosses this boundary — it is
 * the same live list as the screen, cut to five rows, and it carries both
 * actions so the dashboard is a place work gets done rather than only reported.
 */
export { ContractExpiryPanel } from './components/contract-expiry-panel'

export type {
  ExpiringContract,
  ContractPosting,
  ContractStatus,
  ContractPeriodType,
  ContractExpiryFilters,
} from './types'
