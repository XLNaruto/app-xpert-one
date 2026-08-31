import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import {
  ASSET_VARIANT_DEFAULT_SORT,
  STOCK_MOVEMENT_DEFAULT_SORT,
} from '../constants'
import {
  assetVariantResponseSchema,
  assetVariantsResponseSchema,
  stockChangeResponseSchema,
  stockMovementsResponseSchema,
} from '../schemas'
import {
  stockChangeToPayload,
  toAssetVariant,
  toStockMovement,
  variantToPayload,
} from '../lib/asset-variant-mappers'
import type {
  AssetVariantFormValues,
  AssetVariantPayload,
  AssetVariantUpdatePayload,
  StockChangeFormValues,
  StockChangePayload,
} from '../schemas'
import type { AssetVariant, StockMovement } from '../types'

/**
 * Asset variants and their stock ledger — `/user/assets/:assetId/variants`.
 *
 * Every call carries the owning asset id: a variant is only ever addressed
 * through its asset, and a correct variant id under the wrong asset answers
 * `404`. The endpoints page the same way the rest of the product does
 * (`?limit=&offset=`, `{ items, total }`), and scope themselves by the asset in
 * the URL — there's no `company_id` to send.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/** `limit`/`offset`/`search`/`sort` for one request, order always pinned. */
function pageQuery(params: PageParams, defaultSort: { id: string; desc: boolean }) {
  return {
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? defaultSort.id,
    sort_by: params.sortBy ?? (defaultSort.desc ? 'desc' : 'asc'),
  }
}

/**
 * One paged read, or — when `limit` is negative (`ALL_ROWS`) — every page walked
 * until `total` is covered, since the API caps a request at 100.
 */
async function readPage<TRaw, TItem>(
  url: string,
  params: PageParams,
  defaultSort: { id: string; desc: boolean },
  parse: (raw: unknown) => { items: TRaw[]; total: number },
  map: (row: TRaw) => TItem,
): Promise<Paginated<TItem>> {
  const query = pageQuery(params, defaultSort)

  if (params.limit > 0) {
    const raw = await http.get<unknown>(url, {
      params: { limit: Math.min(params.limit, MAX_LIMIT), offset: params.offset, ...query },
    })
    const { items, total } = parse(raw)
    return { items: items.map(map), total }
  }

  const collected: TItem[] = []
  let total = 0

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const raw = await http.get<unknown>(url, {
      params: { limit: MAX_LIMIT, offset: params.offset + page * MAX_LIMIT, ...query },
    })
    const parsed = parse(raw)
    total = parsed.total
    collected.push(...parsed.items.map(map))
    if (parsed.items.length === 0 || collected.length >= total) break
  }

  return { items: collected, total }
}

/**
 * GET /user/assets/:assetId/variants — one page of an asset's variants.
 *
 * Called with no params it returns the whole set, which is what the employee
 * wizard's variant dropdown wants.
 */
export async function fetchAssetVariants(
  assetId: number,
  params: PageParams = ALL_ROWS,
): Promise<Paginated<AssetVariant>> {
  try {
    return await readPage(
      endpoints.ASSET_VARIANTS.LIST(assetId),
      params,
      ASSET_VARIANT_DEFAULT_SORT,
      (raw) => assetVariantsResponseSchema.parse(raw),
      toAssetVariant,
    )
  } catch (error) {
    throw toApiError(error, "Couldn't load the variants.")
  }
}

/** GET /user/assets/:assetId/variants/:id — one variant. */
export async function fetchAssetVariant(
  assetId: number,
  id: number,
): Promise<AssetVariant> {
  try {
    const raw = await http.get<unknown>(endpoints.ASSET_VARIANTS.GET(assetId, id))
    return toAssetVariant(assetVariantResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Asset variant not found')
  }
}

/**
 * POST /user/assets/:assetId/variants — add a variant.
 *
 * The asset comes from the URL; an `asset_id` in the body is ignored, so none is
 * sent. A non-zero opening quantity writes an `OPENING` line to the ledger.
 */
export async function createAssetVariant(
  assetId: number,
  values: AssetVariantFormValues,
): Promise<AssetVariant> {
  try {
    const raw = await http.post<unknown, AssetVariantPayload>(
      endpoints.ASSET_VARIANTS.POST(assetId),
      variantToPayload(values),
    )
    return toAssetVariant(assetVariantResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the variant.")
  }
}

/**
 * PATCH /user/assets/:assetId/variants/:id.
 *
 * `quantity` is the absolute new level, and the server records the difference as
 * an `ADJUSTMENT` movement — the form sends what its box shows, never a delta.
 */
export async function updateAssetVariant(
  assetId: number,
  id: number,
  values: AssetVariantFormValues,
): Promise<AssetVariant> {
  try {
    const raw = await http.patch<unknown, AssetVariantUpdatePayload>(
      endpoints.ASSET_VARIANTS.PATCH(assetId, id),
      variantToPayload(values),
    )
    return toAssetVariant(assetVariantResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the variant.")
  }
}

/** DELETE /user/assets/:assetId/variants/:id — soft delete, frees the name. */
export async function deleteAssetVariant(assetId: number, id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.ASSET_VARIANTS.DELETE(assetId, id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the variant.")
  }
}

/**
 * POST /user/assets/:assetId/variants/:id/stock — refill or write off.
 *
 * `change` is a signed delta: `5` takes five in, `-2` writes two off. The reason
 * is derived from the sign, never sent. The answer carries both the new variant
 * and the movement it wrote, so the caller can update the row and prepend the
 * history line without re-fetching.
 */
export async function changeVariantStock(
  assetId: number,
  id: number,
  values: StockChangeFormValues,
): Promise<{ variant: AssetVariant; movement: StockMovement }> {
  try {
    const raw = await http.post<unknown, StockChangePayload>(
      endpoints.ASSET_VARIANTS.STOCK(assetId, id),
      stockChangeToPayload(values),
    )
    const parsed = stockChangeResponseSchema.parse(raw)
    return {
      variant: toAssetVariant(parsed.variant),
      movement: toStockMovement(parsed.movement),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't update the stock.")
  }
}

/** GET .../stock-movements — the variant's ledger, newest first by default. */
export async function fetchStockMovements(
  assetId: number,
  id: number,
  params: PageParams = ALL_ROWS,
): Promise<Paginated<StockMovement>> {
  try {
    return await readPage(
      endpoints.ASSET_VARIANTS.MOVEMENTS(assetId, id),
      params,
      STOCK_MOVEMENT_DEFAULT_SORT,
      (raw) => stockMovementsResponseSchema.parse(raw),
      toStockMovement,
    )
  } catch (error) {
    throw toApiError(error, "Couldn't load the stock history.")
  }
}
