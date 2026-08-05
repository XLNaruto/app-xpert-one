import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import type { BankRecord } from '../types'

/**
 * Banks — `/user/banks`. A read-only lookup shared across every tenant, so
 * unlike the company's own masters it takes no `company_id`.
 *
 * The master runs to a few hundred rows, which is why the KYC screen picks from
 * it through a scroll-lazy dropdown (`search` is applied server-side) rather
 * than pulling the whole list to render a field.
 */

const bankResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
})

const banksResponseSchema = z.object({
  items: z.array(bankResponseSchema),
  total: z.number(),
})

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

function toBank(response: z.infer<typeof bankResponseSchema>): BankRecord {
  return { id: response.id, bankName: response.name }
}

/**
 * GET /user/banks — one page of the bank master. `ALL_ROWS` (a negative limit)
 * walks the pages until `total` is covered.
 */
export async function fetchBanks(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<BankRecord>> {
  try {
    const query = params.search?.trim() ? { search: params.search.trim() } : {}

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.BANKS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = banksResponseSchema.parse(raw)
      return { items: items.map(toBank), total }
    }

    const collected: BankRecord[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.BANKS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = banksResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toBank))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load banks.")
  }
}

/**
 * GET /user/banks/:id — one bank. Used to label a saved `bank_id` the loaded
 * dropdown pages don't reach, so an edit form opens showing its own selection.
 */
export async function fetchBank(id: number): Promise<BankRecord> {
  try {
    const raw = await http.get<unknown>(endpoints.BANKS.GET(id))
    return toBank(bankResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Bank not found')
  }
}
