import { useMemo, useRef, useState } from 'react'
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
 * The two dropdowns cascade — type first, then the documents filed under it. The API
 * can narrow that itself (`?document_type_id=`), but both masters are already loaded
 * whole for the dropdowns, so the filter runs over what's in hand and changing type
 * costs no request.
 */
export function useEmployeeDocumentTab({
  employeeId,
  onSaved,
  onClose,
}: {
  employeeId: number
  onSaved: () => void
  onClose: () => void
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
  const closeAfterSaveRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  /** Which card is mid-upload — only that card's picker shows a spinner. */
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  // Seed from the server, and again after each save — but never mid-save.
  useRowSeed(list.data, isSaving, (attachments) => {
    reset({
      rows:
        attachments.length > 0
          ? attachments.map((document) => ({
              id: document.id,
              ...documentToFormValues(document),
            }))
          : [EMPTY_EMPLOYEE_DOCUMENT_FORM],
    })
    setRemovedIds([])
  })

  const typeOptions = useMemo(
    () => documentTypeOptions(documentTypes.data?.items ?? []),
    [documentTypes.data],
  )

  /** Documents of one type — the second dropdown cascades off the first. */
  const documentOptionsFor = (documentTypeId: string) => {
    if (!documentTypeId) return []
    const chosen = Number(documentTypeId)
    return (documents.data?.items ?? [])
      .filter((document) => document.documentTypeId === chosen)
      .map((document) => ({ label: document.documentName, value: String(document.id) }))
  }

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

  /** Upload one card's file and hold its object key on that row. */
  const uploadDocumentFile = async (index: number, file: File): Promise<string> => {
    setUploadingIndex(index)
    try {
      const key = await uploadFile.mutateAsync(file)
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
    const shouldClose = closeAfterSaveRef.current
    closeAfterSaveRef.current = false

    const savable = values.rows.filter(
      (row) => !isBlankRow(row as Record<string, unknown>, DOCUMENT_ROW_KEYS),
    )

    if (savable.length === 0 && removedIds.length === 0) {
      if (shouldClose) onClose()
      else onSaved()
      return
    }

    setIsSaving(true)
    try {
      await saveRows<EmployeeDocumentFormValues>(savable, removedIds, {
        create: (row) => createDocument.mutateAsync(row),
        update: (id, row) => updateDocument.mutateAsync({ documentId: id, values: row }),
        remove: (id) => deleteDocument.mutateAsync(id),
      })
      setRemovedIds([])
      toast.success('Documents saved')
      if (shouldClose) onClose()
      else onSaved()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the documents."))
    } finally {
      setIsSaving(false)
    }
  })

  const onSubmitAndClose = () => {
    closeAfterSaveRef.current = true
    void submit()
  }

  const isForbidden = isForbiddenError(list.error)

  return {
    form,
    fields: rows.fields,
    addRow,
    removeRow,
    typeOptions,
    documentOptionsFor,
    isOptionsLoading: documentTypes.isLoading || documents.isLoading,
    changeDocumentType,
    uploadDocumentFile,
    uploadingIndex,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,
    onSubmit: submit,
    onSubmitAndClose,
    onClose,
    isSaving,
  }
}
