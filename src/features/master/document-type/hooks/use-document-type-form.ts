import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { documentTypeSchema, type DocumentTypeFormValues } from '../schemas'
import { EMPTY_DOCUMENT_TYPE_FORM } from '../constants'
import { useDocumentType } from '../api/use-document-type'
import {
  useCreateDocumentType,
  useUpdateDocumentType,
} from '../api/use-document-type-mutations'
import { documentTypeToFormValues } from '../lib/document-type-mappers'

/**
 * Owns the document type form for both create and edit. In edit mode (`id` set)
 * it loads the record, seeds the form and saves via PATCH; create mode POSTs a
 * fresh record. The page consumes this and only lays out fields.
 */
export function useDocumentTypeForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useDocumentType(id ?? Number.NaN)
  const createDocumentType = useCreateDocumentType()
  const updateDocumentType = useUpdateDocumentType(id ?? Number.NaN)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentTypeFormValues>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: EMPTY_DOCUMENT_TYPE_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(documentTypeToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/document-type' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateDocumentType : createDocumentType
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Document type updated' : 'Document type created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} document type`,
        ),
    })
  })

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateDocumentType.isPending : createDocumentType.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
  }
}
