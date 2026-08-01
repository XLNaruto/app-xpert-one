import { mockDelay } from '@/lib/utils'
import { ALL_ROWS, paginate, type PageParams, type Paginated } from '@/lib/pagination'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { DocumentFormValues } from '../schemas'
import type { Document } from '../types'

/**
 * In-memory document master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let documents: Document[] = [
  {
    id: 1,
    documentType: 'Identity Proof',
    documentName: 'Aadhaar Card',
    createdBy: 'Roman Rings',
    createdAt: '2026-03-05T08:15:41.220Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    documentType: 'Identity Proof',
    documentName: 'PAN Card',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-06T11:02:18.744Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-04-08T06:31:09.310Z',
  },
  {
    id: 3,
    documentType: 'Education',
    documentName: 'Degree Certificate',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-18T13:44:02.907Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return documents.reduce((max, d) => Math.max(max, d.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: DocumentFormValues) {
  return {
    documentType: values.documentType.trim(),
    documentName: values.documentName.trim(),
  }
}

/** Record fields the list screen's search box matches against. */
const SEARCH_FIELDS: readonly (keyof Document)[] = ['documentName', 'documentType']

export async function fetchDocuments(params: PageParams = ALL_ROWS): Promise<Paginated<Document>> {
  return mockDelay(paginate([...documents], params, SEARCH_FIELDS))
}

export async function fetchDocument(id: number): Promise<Document> {
  const found = documents.find((d) => d.id === id)
  if (!found) throw new Error('Document not found')
  return mockDelay({ ...found })
}

export async function createDocument(values: DocumentFormValues): Promise<Document> {
  const record: Document = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  documents = [record, ...documents]
  return mockDelay({ ...record })
}

export async function updateDocument(
  id: number,
  values: DocumentFormValues,
): Promise<Document> {
  const index = documents.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Document not found')
  const updated: Document = {
    ...documents[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  documents = documents.map((d) => (d.id === id ? updated : d))
  return mockDelay({ ...updated })
}

export async function deleteDocument(id: number): Promise<void> {
  documents = documents.filter((d) => d.id !== id)
  return mockDelay(undefined)
}
