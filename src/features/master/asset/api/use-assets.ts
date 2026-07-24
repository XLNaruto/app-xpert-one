import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchAssets } from './asset-api'

/** GET /assets — the asset master list. */
export function useAssets() {
  return useQuery({
    queryKey: queryKeys.asset.list(),
    queryFn: fetchAssets,
  })
}
