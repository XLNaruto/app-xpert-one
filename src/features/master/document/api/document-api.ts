import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { DOCUMENT_DEFAULT_SORT } from '../constants'
import { documentResponseSchema, documentsResponseSchema } from '../schemas'
import { documentToPayload, toDocument } from '../lib/document-mappers'
import type {
  DocumentFormValues,
  DocumentPayload,
  DocumentUpdatePayload,
} from '../schemas'
import type { Document } from '../types'

/**
 * Documents — `/user/documents`. The company's document master, each row filed
 * under a document type and carrying that type's name on list reads.
 *
 * The endpoint is offset-paginated (`?limit=&offset=`, limit capped at 200) and
 * answers `{ items, total }`, which is exactly the shape the list screen pages
 * in. `search` matches the document name server-side and `sort` accepts `name`,
 * `document_type`, `created_at` or `updated_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active. `documentTypeId` narrows a read
 * to one category — an unknown type answers 404 rather than an empty page.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 200

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * GET /user/documents — one page of the company's documents, in the requested
 * order (name A→Z unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 200, so that case walks the pages until `total` is covered.
 *
 * Order is always sent — left off, the server's own default decides it, and a
 * list whose order isn't pinned can repeat or skip rows as the user pages.
 */
export async function fetchDocuments(
  params: PageParams = ALL_ROWS,
  documentTypeId?: number,
): Promise<Paginated<Document>> {
  try {
    const query = {
      company_id: activeCompanyId('documents'),
      ...(documentTypeId ? { document_type_id: documentTypeId } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      sort: params.sort ?? DOCUMENT_DEFAULT_SORT.id,
      sort_by: params.sortBy ?? (DOCUMENT_DEFAULT_SORT.desc ? 'desc' : 'asc'),
    }

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.DOCUMENTS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = documentsResponseSchema.parse(raw)
      return { items: items.map(toDocument), total }
    }

    const collected: Document[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.DOCUMENTS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = documentsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toDocument))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load documents.")
  }
}

/** GET /user/documents/:id — one document, for the edit form. */
export async function fetchDocument(id: number): Promise<Document> {
  try {
    const raw = await http.get<unknown>(endpoints.DOCUMENTS.GET(id))
    return toDocument(documentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Document not found')
  }
}

/**
 * POST /user/documents — file a document under one of the company's types. The
 * name must be unique within the company; a repeat comes back 409 and the form
 * shows the server's message.
 */
export async function createDocument(values: DocumentFormValues): Promise<Document> {
  try {
    const raw = await http.post<unknown, DocumentPayload>(endpoints.DOCUMENTS.POST, {
      company_id: activeCompanyId('documents'),
      ...documentToPayload(values),
    })
    return toDocument(documentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the document.")
  }
}

/**
 * PATCH /user/documents/:id — the endpoint accepts a partial body, but the form
 * always submits every field, so we send the full record. It may be re-filed
 * under another type of the same company.
 */
export async function updateDocument(
  id: number,
  values: DocumentFormValues,
): Promise<Document> {
  try {
    const raw = await http.patch<unknown, DocumentUpdatePayload>(
      endpoints.DOCUMENTS.PATCH(id),
      documentToPayload(values),
    )
    return toDocument(documentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the document.")
  }
}

/**
 * DELETE /user/documents/:id — remove a document from the master and the
 * employee dropdown. Attachments already uploaded against it are left untouched.
 */
export async function deleteDocument(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.DOCUMENTS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the document.")
  }
}
