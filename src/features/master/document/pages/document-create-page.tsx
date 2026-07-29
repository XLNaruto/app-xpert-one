import { Controller } from 'react-hook-form'
import { ArrowLeft, FileText } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DOCUMENT_LABELS } from '../constants'
import { useDocumentForm } from '../hooks/use-document-form'

interface DocumentCreatePageProps {
  /**
   * Encrypted document id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit a document record. One screen for both: a `?data=` token edits
 * the record it carries, no token creates a new one.
 */
export function DocumentCreatePage({ data }: DocumentCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const documentId = decryptId(data)

  const {
    register,
    control,
    errors,
    typeOptions,
    isTypesLoading,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    goToList,
  } = useDocumentForm(documentId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Document' : 'Add Document'}
        description="Configure document details."
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
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this document."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={FileText}
                title="Document Detail"
                description="Document type and name"
                className="mt-0"
              />

              <Field
                label={DOCUMENT_LABELS.documentType}
                required
                error={errors.documentType?.message}
              >
                <Controller
                  control={control}
                  name="documentType"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={typeOptions}
                      placeholder={
                        isTypesLoading
                          ? 'Loading…'
                          : `Select ${DOCUMENT_LABELS.documentType}`
                      }
                      searchPlaceholder="Search document type"
                    />
                  )}
                />
              </Field>

              <Field
                label={DOCUMENT_LABELS.documentName}
                required
                error={errors.documentName?.message}
              >
                <Input
                  placeholder={DOCUMENT_LABELS.documentName}
                  {...register('documentName')}
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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Document'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
