import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { ASSET_DEFAULT_SORT } from '../constants'
import { assetResponseSchema, assetsResponseSchema } from '../schemas'
import { assetToPayload, toAsset } from '../lib/asset-mappers'
import type { AssetFormValues, AssetPayload, AssetUpdatePayload } from '../schemas'
import type { AssetRecord } from '../types'

/**
 * Assets — `/user/assets`. The endpoint is offset-paginated (`?limit=&offset=`,
 * limit capped at 100) and answers `{ items, total }`, which is exactly the
 * shape the list screen pages in. `search` is matched server-side against the
 * asset name, and `sort` accepts `name` or `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/assets — one page of the company's asset master, in the requested
 * order (newest first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchAssets(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<AssetRecord>> {
  try {
    const query = {
      company_id: activeCompanyId('assets'),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? ASSET_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (ASSET_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ASSETS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = assetsResponseSchema.parse(raw)
      return { items: items.map(toAsset), total }
    }

    const collected: AssetRecord[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ASSETS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = assetsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toAsset))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load assets.")
  }
}

/** GET /user/assets/:id — one asset. */
export async function fetchAsset(id: number): Promise<AssetRecord> {
  try {
    const raw = await http.get<unknown>(endpoints.ASSETS.GET(id))
    return toAsset(assetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Asset not found')
  }
}

/** POST /user/assets — add an asset to the active company's master. */
export async function createAsset(values: AssetFormValues): Promise<AssetRecord> {
  try {
    const raw = await http.post<unknown, AssetPayload>(endpoints.ASSETS.POST, {
      company_id: activeCompanyId('assets'),
      ...assetToPayload(values),
    })
    return toAsset(assetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the asset.")
  }
}

/** PATCH /user/assets/:id — rename an asset. */
export async function updateAsset(
  id: number,
  values: AssetFormValues,
): Promise<AssetRecord> {
  try {
    const raw = await http.patch<unknown, AssetUpdatePayload>(
      endpoints.ASSETS.PATCH(id),
      assetToPayload(values),
    )
    return toAsset(assetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the asset.")
  }
}

/** DELETE /user/assets/:id — remove an asset from the master. */
export async function deleteAsset(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.ASSETS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the asset.")
  }
}
