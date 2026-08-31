import { createFileRoute } from '@tanstack/react-router'
import { AssetListPage } from '@/features/master/asset'
import { validateDataSearch } from '@/lib/route-search'

/**
 * No token in the ordinary case — the list needs none. It only carries one on
 * the way BACK from an employee record that was opened out of a stock ledger
 * here: `{ id, history: true }` names the asset whose ledger should be reopened.
 */
export const Route = createFileRoute('/_authenticated/master/asset/')({
  validateSearch: validateDataSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = Route.useSearch()
  return <AssetListPage data={data} />
}
