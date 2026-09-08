import { createFileRoute } from '@tanstack/react-router'
import { TalkMonitoringPage } from '@/features/talk/monitoring'
import { validateDataSearch } from '@/lib/route-search'

/**
 * `?data=` carries the selection — which person is being read and which of
 * their conversations — so a refresh comes back to the same thread. Static
 * path, ids in the token: see the page.
 */
export const Route = createFileRoute('/_workspace/talk/monitoring/')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <TalkMonitoringPage data={data} />
}
