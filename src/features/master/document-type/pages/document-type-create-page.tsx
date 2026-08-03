import { ArrowLeft, FileType2 } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { DOCUMENT_TYPE_LABELS } from '../constants'
import { useDocumentTypeForm } from '../hooks/use-document-type-form'

interface DocumentTypeCreatePageProps {
  /**
   * Encrypted document type id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit a document type record. One screen for both: a `?data=` token
 * edits the record it carries, no token creates a new one.
 */
export function DocumentTypeCreatePage({ data }: DocumentTypeCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const documentTypeId = decryptId(data)

  const {
    register,
    errors,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    isForbidden,
    forbiddenMessage,
    goToList,
  } = useDocumentTypeForm(documentTypeId)

  // Reading this record was refused — show the 403 screen, not a broken form.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Document Type' : 'Add Document Type'}
        description="Configure document type details."
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this document type."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={FileType2}
                title="Document Type Detail"
                description="The category documents are filed under"
                className="mt-0"
              />

              <Field
                label={DOCUMENT_TYPE_LABELS.typeName}
                required
                error={errors.typeName?.message}
              >
                <Input
                  placeholder={DOCUMENT_TYPE_LABELS.typeName}
                  {...register('typeName')}
                />
              </Field>

              <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToList}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? 'Saving…'
                    : isEdit
                      ? 'Save Changes'
                      : 'Create Document Type'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
