import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { DocumentTypeFormValues } from '../schemas'
import type { DocumentType } from '../types'

/**
 * In-memory document type master store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let documentTypes: DocumentType[] = [
  {
    id: 1,
    typeName: 'Identity Proof',
    createdBy: 'Roman Rings',
    createdAt: '2026-03-04T09:12:33.104Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    typeName: 'Address Proof',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-04T09:18:47.522Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 3,
    typeName: 'Education',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-17T12:40:19.771Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-04-02T07:22:51.008Z',
  },
]

function nextId(): number {
  return documentTypes.reduce((max, d) => Math.max(max, d.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: DocumentTypeFormValues) {
  return {
    typeName: values.typeName.trim(),
  }
}

export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  return mockDelay([...documentTypes])
}

export async function fetchDocumentType(id: number): Promise<DocumentType> {
  const found = documentTypes.find((d) => d.id === id)
  if (!found) throw new Error('Document type not found')
  return mockDelay({ ...found })
}

export async function createDocumentType(
  values: DocumentTypeFormValues,
): Promise<DocumentType> {
  const record: DocumentType = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  documentTypes = [record, ...documentTypes]
  return mockDelay({ ...record })
}

export async function updateDocumentType(
  id: number,
  values: DocumentTypeFormValues,
): Promise<DocumentType> {
  const index = documentTypes.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Document type not found')
  const updated: DocumentType = {
    ...documentTypes[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  documentTypes = documentTypes.map((d) => (d.id === id ? updated : d))
  return mockDelay({ ...updated })
}

export async function deleteDocumentType(id: number): Promise<void> {
  documentTypes = documentTypes.filter((d) => d.id !== id)
  return mockDelay(undefined)
}
