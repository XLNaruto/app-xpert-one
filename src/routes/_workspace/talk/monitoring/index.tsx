import { createFileRoute } from '@tanstack/react-router'
import { TalkMonitoringPage } from '@/features/talk/monitoring'

export const Route = createFileRoute('/_workspace/talk/monitoring/')({
  component: TalkMonitoringPage,
})
