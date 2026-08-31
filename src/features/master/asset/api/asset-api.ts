import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { ASSET_DEFAULT_SORT, STOCK_MOVEMENT_DEFAULT_SORT } from '../constants'
import {
  assetResponseSchema,
  assetsResponseSchema,
  assetStockChangeResponseSchema,
  stockMovementsResponseSchema,
} from '../schemas'
import { assetToPayload, toAsset } from '../lib/asset-mappers'
import { stockChangeToPayload, toStockMovement } from '../lib/asset-variant-mappers'
import type {
  AssetFormValues,
  AssetPayload,
  AssetUpdatePayload,
  StockChangeFormValues,
  StockChangePayload,
} from '../schemas'
import type { AssetRecord, StockMovement } from '../types'

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
      // A brand-new asset has no variants, so its own stock is always its to
      // hold. A non-zero opening quantity writes an OPENING line to the ledger.
      ...assetToPayload(values),
    } as AssetPayload)
    return toAsset(assetResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the asset.")
  }
}

/**
 * PATCH /user/assets/:id — rename an asset, and set its own stock level.
 *
 * `withStock` is false for an asset that HAS variants: quantity and returnable
 * are set per variant from the moment the first one exists, and sending either
 * for such an asset is refused with a 409. `quantity` is an absolute new level;
 * the server records the difference as an ADJUSTMENT.
 */
export async function updateAsset(
  id: number,
  values: AssetFormValues,
  withStock = true,
): Promise<AssetRecord> {
  try {
    const raw = await http.patch<unknown, AssetUpdatePayload>(
      endpoints.ASSETS.PATCH(id),
      assetToPayload(values, withStock),
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

/**
 * POST /user/assets/:id/stock — refill or write off the asset's OWN stock.
 *
 * The asset-level twin of the variant call, with the same semantics: `change` is
 * a signed delta, never a new level, and the reason is derived from its sign.
 * Refused with a 409 on an asset that has variants — stock is held per variant
 * from then on — and on any change that would take the balance below zero.
 */
export async function changeAssetStock(
  id: number,
  values: StockChangeFormValues,
): Promise<{ asset: AssetRecord; movement: StockMovement }> {
  try {
    const raw = await http.post<unknown, StockChangePayload>(
      endpoints.ASSETS.STOCK(id),
      stockChangeToPayload(values),
    )
    const parsed = assetStockChangeResponseSchema.parse(raw)
    return {
      asset: toAsset(parsed.asset),
      movement: toStockMovement(parsed.movement),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't update the stock.")
  }
}

/**
 * GET /user/assets/:id/stock-movements — the asset's WHOLE ledger: its own
 * lines and its variants', newest first. `variant_id` is null on a line about
 * the asset itself.
 */
export async function fetchAssetStockMovements(
  id: number,
  params: PageParams = ALL_ROWS,
): Promise<Paginated<StockMovement>> {
  try {
    const query = {
      sort: params.sort ?? STOCK_MOVEMENT_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (STOCK_MOVEMENT_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.ASSETS.MOVEMENTS(id), {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = stockMovementsResponseSchema.parse(raw)
      return { items: items.map(toStockMovement), total }
    }

    const collected: StockMovement[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.ASSETS.MOVEMENTS(id), {
        params: { limit: MAX_LIMIT, offset: params.offset + page * MAX_LIMIT, ...query },
      })
      const parsed = stockMovementsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toStockMovement))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the stock history.")
  }
}
