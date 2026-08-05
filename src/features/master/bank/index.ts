/**
 * The bank master — a read-only, cross-tenant lookup behind the KYC screen's
 * Bank Name field. There is no list or create screen: `/user/banks` is
 * maintained by the super admin, so this module is just the api layer and the
 * scroll-lazy dropdown adapter over it.
 */
export { useBanksInfinite } from './api/use-banks-infinite'
export { useBankSelect, type BankSelect } from './hooks/use-bank-select'
export { fetchBank, fetchBanks } from './api/bank-api'
export type { BankRecord } from './types'
