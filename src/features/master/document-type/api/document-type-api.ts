import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { DOCUMENT_TYPE_DEFAULT_SORT } from '../constants'
import {
  documentTypeResponseSchema,
  documentTypesResponseSchema,
} from '../schemas'
import { documentTypeToPayload, toDocumentType } from '../lib/document-type-mappers'
import type {
  DocumentTypeFormValues,
  DocumentTypePayload,
  DocumentTypeUpdatePayload,
} from '../schemas'
import type { DocumentType } from '../types'

/**
 * Document types — `/user/document-types`. The company's document categories and
 * the parent of the document master: one exists before anything can be filed
 * under it.
 *
 * The endpoint is offset-paginated (`?limit=&offset=`, limit capped at 200) and
 * answers `{ items, total }`, which is exactly the shape the list screen pages
 * in. `search` matches the type name server-side and `sort` accepts `name`,
 * `created_at` or `updated_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 200

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/document-types — one page of the company's types, in the requested
 * order (name A→Z unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master" — what the Document
 * form's type dropdown asks for. The API caps a request at 200, so that case
 * walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchDocumentTypes(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<DocumentType>> {
  try {
    const query = {
      company_id: activeCompanyId('document types'),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? DOCUMENT_TYPE_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (DOCUMENT_TYPE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.DOCUMENT_TYPES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = documentTypesResponseSchema.parse(raw)
      return { items: items.map(toDocumentType), total }
    }

    const collected: DocumentType[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.DOCUMENT_TYPES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = documentTypesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toDocumentType))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load document types.")
  }
}

/** GET /user/document-types/:id — one type, for the edit form. */
export async function fetchDocumentType(id: number): Promise<DocumentType> {
  try {
    const raw = await http.get<unknown>(endpoints.DOCUMENT_TYPES.GET(id))
    return toDocumentType(documentTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Document type not found')
  }
}

/**
 * POST /user/document-types — add a type to the active company's master. The
 * name must be unique within the company; a repeat comes back 409 and the form
 * shows the server's message.
 */
export async function createDocumentType(
  values: DocumentTypeFormValues,
): Promise<DocumentType> {
  try {
    const raw = await http.post<unknown, DocumentTypePayload>(
      endpoints.DOCUMENT_TYPES.POST,
      {
        company_id: activeCompanyId('document types'),
        ...documentTypeToPayload(values),
      },
    )
    return toDocumentType(documentTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the document type.")
  }
}

/** PATCH /user/document-types/:id — rename a type; the owning company is fixed. */
export async function updateDocumentType(
  id: number,
  values: DocumentTypeFormValues,
): Promise<DocumentType> {
  try {
    const raw = await http.patch<unknown, DocumentTypeUpdatePayload>(
      endpoints.DOCUMENT_TYPES.PATCH(id),
      documentTypeToPayload(values),
    )
    return toDocumentType(documentTypeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the document type.")
  }
}

/**
 * DELETE /user/document-types/:id — remove a type from the master.
 *
 * Refused with 409 while documents are still filed under it; that message comes
 * from the server and is what the delete dialog surfaces.
 */
export async function deleteDocumentType(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.DOCUMENT_TYPES.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the document type.")
  }
}
