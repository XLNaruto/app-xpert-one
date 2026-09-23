import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useDocumentTypeSelect } from '@/features/master/document-type'
import { documentSchema, type DocumentFormValues } from '../schemas'
import { EMPTY_DOCUMENT_FORM } from '../constants'
import { useDocument } from '../api/use-document'
import { useCreateDocument, useUpdateDocument } from '../api/use-document-mutations'
import { documentToFormValues } from '../lib/document-mappers'

/**
 * Owns the document form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. The page consumes this and only lays out fields.
 */
export function useDocumentForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useDocument(id ?? Number.NaN)
  const createDocument = useCreateDocument()
  const updateDocument = useUpdateDocument(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: EMPTY_DOCUMENT_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(documentToFormValues(detail.data))
  }, [detail.data, reset])

  // The Document Type dropdown pages through the document type master as it's
  // scrolled. The saved record already names its type, so that label is used
  // while the field still holds it — no by-id read.
  const documentTypeId = useWatch({ control, name: 'documentTypeId' })
  const saved = detail.data
  const typeSelect = useDocumentTypeSelect({
    selected: documentTypeId,
    selectedLabel:
      saved && documentTypeId === String(saved.documentTypeId)
        ? saved.documentTypeName || undefined
        : undefined,
  })

  const goToList = () => navigate({ to: '/master/document' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateDocument : createDocument
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Document updated' : 'Document created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} document`,
        ),
    })
  })

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    typeSelect,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateDocument.isPending : createDocument.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
  }
}
