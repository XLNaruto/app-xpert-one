/**
 * Administration → Settings — the module's public surface. One screen: the
 * active company's behaviour switches (task submission mode today).
 */
export { SettingsListPage } from './pages/settings-list-page'
export { useCompanySettings } from './api/use-company-settings'
export { useUpdateCompanySettings } from './api/use-company-settings-mutations'
export type { CompanySettings } from './types'
