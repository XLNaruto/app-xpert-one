import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { TALK_CREDENTIAL_DEFAULT_SORT } from '../constants'
import {
  talkCredentialResponseSchema,
  talkCredentialsResponseSchema,
} from '../schemas'
import {
  talkCredentialToPayload,
  talkCredentialToUpdatePayload,
  toTalkCredential,
} from '../lib/talk-credential-mappers'
import type {
  TalkCredentialFormValues,
  TalkCredentialPayload,
  TalkCredentialUpdatePayload,
} from '../schemas'
import type { TalkCredential } from '../types'

/**
 * Talk credentials — `/user/talk-credentials`. Offset-paginated
 * (`?limit=&offset=`, limit capped at 100) answering `{ items, total }`, with
 * `search` matched server-side against the LOGIN ADDRESS alone and `sort`
 * accepting `email`, `created_at` or `updated_at`.
 *
 * EMPLOYEE credentials only — the back-office Talk identities live in the same
 * table but belong to `/user/admin-users`, and this resource 404s on one.
 *
 * ACCOUNT-scoped, unlike every tenant master: `company_id` is a FILTER here, not
 * a requirement, and it narrows to the credentials that reach that company by
 * EITHER kind of grant — a whole-company chip or a department inside it.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * `search` / `sort` / `sort_by` as the endpoint spells them, plus the company
 * filter when one is applied. Order is always sent — left off, the server's own
 * default decides it, and a list whose order isn't pinned can repeat or skip
 * rows as the user pages.
 */
function queryParams(params: PageParams, companyId?: number) {
  return {
    ...(companyId ? { company_id: companyId } : {}),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? TALK_CREDENTIAL_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (TALK_CREDENTIAL_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/talk-credentials — one page of the account's Talk logins.
 *
 * `ALL_ROWS` (a negative limit) means "every credential": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchTalkCredentials(
  params: PageParams = ALL_ROWS,
  companyId?: number,
): Promise<Paginated<TalkCredential>> {
  try {
    const query = queryParams(params, companyId)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.TALK_CREDENTIALS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = talkCredentialsResponseSchema.parse(raw)
      return { items: items.map(toTalkCredential), total }
    }

    const collected: TalkCredential[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.TALK_CREDENTIALS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = talkCredentialsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toTalkCredential))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load Talk credentials.")
  }
}

/**
 * GET /user/talk-credentials/:id — one credential, as the edit form loads it.
 *
 * The whole form in a single call: `companies` and `departments` come back
 * RESOLVED TO NAMES, so no chip needs a second read. A company or department
 * soft-deleted since the grant was authored is omitted rather than returned as a
 * nameless id — no picker offers it and no save would accept it.
 */
export async function fetchTalkCredential(id: number): Promise<TalkCredential> {
  try {
    const raw = await http.get<unknown>(endpoints.TALK_CREDENTIALS.GET(id))
    return toTalkCredential(talkCredentialResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Talk credential not found')
  }
}

/**
 * POST /user/talk-credentials — issue one employee their Talk login.
 *
 * Two 409s to expect, both surfaced verbatim: the address is already a Talk
 * login somewhere on the PLATFORM (Talk is one deployment and resolves the
 * account from the address), or the employee already holds a credential — one
 * person, one login. A company or department outside this account answers 404.
 */
export async function createTalkCredential(
  values: TalkCredentialFormValues,
): Promise<TalkCredential> {
  try {
    const raw = await http.post<unknown, TalkCredentialPayload>(
      endpoints.TALK_CREDENTIALS.POST,
      talkCredentialToPayload(values),
    )
    return toTalkCredential(talkCredentialResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't issue the Talk credential.")
  }
}

/**
 * PATCH /user/talk-credentials/:id — a partial update.
 *
 * Sending `password` ROTATES the credential; omitting it leaves the stored one
 * alone. `status` suspends or restores the login without deleting it. The two
 * reach lists REPLACE what is stored rather than merging, and are re-validated
 * together whenever either arrives — so the form sends both.
 */
export async function updateTalkCredential(
  id: number,
  values: TalkCredentialFormValues,
): Promise<TalkCredential> {
  try {
    const raw = await http.patch<unknown, TalkCredentialUpdatePayload>(
      endpoints.TALK_CREDENTIALS.PATCH(id),
      talkCredentialToUpdatePayload(values),
    )
    return toTalkCredential(talkCredentialResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the Talk credential.")
  }
}

/**
 * DELETE /user/talk-credentials/:id — soft-delete the credential and drop its
 * grants.
 *
 * The ADDRESS IS RELEASED (every uniqueness index here is partial on
 * `deleted_at is null`), so the same employee can be issued a new credential at
 * the same address afterwards. That's the difference from suspending one, which
 * keeps the address taken and the login recoverable — prefer suspension while an
 * investigation is open.
 */
export async function deleteTalkCredential(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.TALK_CREDENTIALS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the Talk credential.")
  }
}
