import { useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { documentTypeOptions, useDocumentTypes } from '@/features/master/document-type'
import { useDocuments } from '@/features/master/document'
import {
  DOCUMENT_ROW_KEYS,
  employeeDocumentListSchema,
  type EmployeeDocumentFormValues,
  type EmployeeDocumentListFormValues,
} from '../schemas'
import { EMPTY_EMPLOYEE_DOCUMENT_FORM } from '../constants'
import { useEmployeeDocuments } from '../api/use-employee-steps'
import {
  useCreateEmployeeDocument,
  useDeleteEmployeeDocument,
  useUpdateEmployeeDocument,
  useUploadEmployeeDocumentFile,
} from '../api/use-employee-step-mutations'
import { documentToFormValues } from '../lib/employee-step-mappers'
import { isBlankRow, saveRows } from '../lib/save-rows'
import { useRowSeed } from './use-row-seed'

/**
 * Step 6 — attachments, as one card list with one Save.
 *
 * **Files are uploaded as they're picked, not on Save.** A presigned PUT sends the
 * bytes straight to storage and the card holds the returned object key — which is
 * all the attachment row stores. So the upload is immediate and durable while the
 * row it belongs to is still a draft; an abandoned card leaves a stray object and no
 * half-saved record. Replacing a file is a fresh upload and a new key; the old
 * object stays where it is, since the API exposes no way to remove one.
 *
 * The type gates the file too, not just the name: the presign files the object key
 * under the chosen document type, so a card's picker stays disabled until it has one.
 *
 * The two dropdowns cascade — type first, then the documents filed under it. The API
 * can narrow that itself (`?document_type_id=`), but both masters are already loaded
 * whole for the dropdowns, so the filter runs over what's in hand and changing type
 * costs no request.
 *
 * Documents the master marks `isRequired` are not something the user picks: every one
 * of them gets its own card up front, with the type and name already filled in and
 * locked, so the only thing left to do is upload the file. That's also why seeding
 * waits for the document master — a list seeded before it lands would be missing the
 * mandatory cards, and reseeding would throw away whatever was typed meanwhile.
 */
export function useEmployeeDocumentTab({
  employeeId,
  onSaved,
}: {
  employeeId: number
  onSaved: () => void
}) {
  const list = useEmployeeDocuments(employeeId)
  const createDocument = useCreateEmployeeDocument(employeeId)
  const updateDocument = useUpdateEmployeeDocument(employeeId)
  const deleteDocument = useDeleteEmployeeDocument(employeeId)
  const uploadFile = useUploadEmployeeDocumentFile()

  const documentTypes = useDocumentTypes()
  const documents = useDocuments()

  const form = useForm<EmployeeDocumentListFormValues>({
    resolver: zodResolver(employeeDocumentListSchema),
    defaultValues: { rows: [EMPTY_EMPLOYEE_DOCUMENT_FORM] },
  })
  const { control, handleSubmit, reset, setValue } = form
  const rows = useFieldArray({ control, name: 'rows' })

  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)
  /** Which card is mid-upload — only that card's picker shows a spinner. */
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)


  /** Documents every employee must file — one locked card each. */
  const requiredDocuments = useMemo(
    () => (documents.data?.items ?? []).filter((document) => document.isRequired),
    [documents.data],
  )

  const typeOptions = useMemo(
    () => documentTypeOptions(documentTypes.data?.items ?? []),
    [documentTypes.data],
  )

  /**
   * Nothing to seed from until the document master is in hand — the required
   * cards are built from it, so seeding early would render a list without them.
   */
  const seed = useMemo(
    () =>
      list.data === undefined || documents.isPending
        ? undefined
        : { attachments: list.data, requiredDocuments },
    [list.data, documents.isPending, requiredDocuments],
  )

  // Seed from the server, and again after each save — but never mid-save.
  useRowSeed(seed, isSaving, ({ attachments, requiredDocuments: required }) => {
    const saved = attachments.map((document) => ({
      id: document.id,
      ...documentToFormValues(document),
    }))

    // Every required document holds the top of the list, carrying its saved row
    // when there is one so the file and expiry already on file stay put.
    const requiredRows = required.map((document) => {
      const filed = saved.find((row) => row.documentId === String(document.id))
      return (
        filed ?? {
          ...EMPTY_EMPLOYEE_DOCUMENT_FORM,
          documentTypeId: String(document.documentTypeId),
          documentId: String(document.id),
        }
      )
    })

    // Only the rows actually pulled into a locked card are removed from the rest.
    // A second saved row for the same required document keeps its own card rather
    // than vanishing from a list it still exists in — so it can be deleted.
    const claimed = new Set(requiredRows.map((row) => row.id).filter((id) => id !== undefined))
    const extraRows = saved.filter((row) => !claimed.has(row.id))
    const rows = [...requiredRows, ...extraRows]

    reset({ rows: rows.length > 0 ? rows : [EMPTY_EMPLOYEE_DOCUMENT_FORM] })
    setRemovedIds([])
  })

  /**
   * Documents of one type — the second dropdown cascades off the first.
   *
   * Required documents are left out: each already has its own locked card, so
   * offering one here only invites a duplicate row for a document that's
   * already accounted for.
   */
  const documentOptionsFor = (documentTypeId: string) => {
    if (!documentTypeId) return []
    const chosen = Number(documentTypeId)
    return (documents.data?.items ?? [])
      .filter((document) => document.documentTypeId === chosen && !document.isRequired)
      .map((document) => ({ label: document.documentName, value: String(document.id) }))
  }

  /**
   * A document's name from the whole master, required ones included — the locked
   * cards need their title even though the dropdown no longer lists them.
   */
  const documentNameFor = (documentId: string) =>
    (documents.data?.items ?? []).find((document) => String(document.id) === documentId)
      ?.documentName

  /**
   * Is this row one of the mandatory documents? Its two dropdowns are locked, and
   * so is its remove control — dropping the card would drop the requirement.
   */
  const isRequiredRow = (documentId: string) =>
    documentId !== '' && requiredDocuments.some((document) => String(document.id) === documentId)

  const addRow = () => rows.append({ ...EMPTY_EMPLOYEE_DOCUMENT_FORM })

  const removeRow = (index: number) => {
    const row = form.getValues(`rows.${index}`)
    if (row?.id !== undefined) setRemovedIds((previous) => [...previous, row.id as number])

    if (rows.fields.length === 1) {
      rows.update(0, { ...EMPTY_EMPLOYEE_DOCUMENT_FORM })
      return
    }
    rows.remove(index)
  }

  /** Pick a type and clear that card's document — it isn't filed under the new type. */
  const changeDocumentType = (
    index: number,
    value: string,
    onChange: (value: string) => void,
  ) => {
    onChange(value)
    setValue(`rows.${index}.documentId`, '')
  }

  /**
   * Upload one card's file and hold its object key on that row.
   *
   * The presign files the object key under the document type, so the type has to be
   * chosen first. That's caught here as a field error rather than sent as a presign
   * the API would reject.
   */
  const uploadDocumentFile = async (index: number, file: File): Promise<string> => {
    const documentTypeId = Number(form.getValues(`rows.${index}.documentTypeId`))
    if (!documentTypeId) {
      form.setError(`rows.${index}.documentTypeId`, {
        message: 'Choose a document type before uploading the file.',
      })
      toast.error('Choose a document type before uploading the file.')
      throw new Error('documentTypeId is required to presign the upload')
    }

    setUploadingIndex(index)
    try {
      const key = await uploadFile.mutateAsync({ file, documentTypeId })
      setValue(`rows.${index}.document`, key, { shouldValidate: true })
      return key
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload the file."))
      throw error
    } finally {
      setUploadingIndex(null)
    }
  }

  const submit = handleSubmit(async (values) => {
    const savable = values.rows.filter(
      (row) => !isBlankRow(row as Record<string, unknown>, DOCUMENT_ROW_KEYS),
    )

    setIsSaving(true)
    try {
      await saveRows<EmployeeDocumentFormValues>(savable, removedIds, {
        create: (row) => createDocument.mutateAsync(row),
        update: (id, row) => updateDocument.mutateAsync({ documentId: id, values: row }),
        remove: (id) => deleteDocument.mutateAsync(id),
      })
      setRemovedIds([])
      toast.success('Documents saved')
      onSaved()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the documents."))
    } finally {
      setIsSaving(false)
    }
  })

  const isForbidden = isForbiddenError(list.error)

  return {
    form,
    fields: rows.fields,
    addRow,
    removeRow,
    typeOptions,
    documentOptionsFor,
    documentNameFor,
    isRequiredRow,
    isOptionsLoading: documentTypes.isLoading || documents.isLoading,
    changeDocumentType,
    uploadDocumentFile,
    uploadingIndex,
    isLoading: list.isLoading || documents.isPending,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,
    onSubmit: submit,
    isSaving,
  }
}
