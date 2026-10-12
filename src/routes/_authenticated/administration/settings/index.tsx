import { createFileRoute } from '@tanstack/react-router'
import { SettingsListPage } from '@/features/administration/settings'

export const Route = createFileRoute('/_authenticated/administration/settings/')({
  component: SettingsListPage,
})
