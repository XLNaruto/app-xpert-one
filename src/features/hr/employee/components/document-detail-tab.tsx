import { Controller } from 'react-hook-form'
import { FileStack } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Forbidden } from '@/features/error'
import { useEmployeeDocumentTab } from '../hooks/use-employee-document-tab'
import { DocumentFileField } from './document-file-field'
import { RepeatCard, RepeatCardBadge, RepeatSection } from './repeat-card'
import { StepFormFooter } from './step-form-footer'

/** Has this expiry date passed? An undated document never expires. */
function isExpired(expiryDate: string): boolean {
  if (!expiryDate) return false
  return expiryDate.slice(0, 10) < new Date().toISOString().slice(0, 10)
}

/**
 * Step 6 — Documents, as a list of inline cards.
 *
 * A card's file uploads the moment it's picked and the row holds the returned
 * storage key, so the Upload control shows its own progress independently of the
 * step's Save.
 *
 * Expiry is flagged rather than merely shown: an expired ID or licence is a
 * compliance problem, not a stale field.
 */
export function DocumentDetailTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const {
    form,
    fields,
    addRow,
    removeRow,
    typeOptions,
    documentOptionsFor,
    isOptionsLoading,
    changeDocumentType,
    uploadDocumentFile,
    uploadingIndex,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    onSubmit,
    isSaving,
  } = useEmployeeDocumentTab({ employeeId, onSaved: onContinue })

  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error instanceof Error ? error.message : "Couldn't load the documents."}
      </p>
    )
  }

  const rowErrors = form.formState.errors.rows

  return (
    <form onSubmit={onSubmit} noValidate>
      <RepeatSection
        first
        icon={FileStack}
        title="Documents"
        count={fields.length}
        addLabel="Add"
        onAdd={addRow}
      >
        {fields.map((field, index) => {
          const errors = rowErrors?.[index]
          const row = form.watch(`rows.${index}`)
          const typeLabel = typeOptions.find((o) => o.value === row?.documentTypeId)?.label
          const nameLabel = documentOptionsFor(row?.documentTypeId ?? '').find(
            (o) => o.value === row?.documentId,
          )?.label

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={
                [typeLabel, nameLabel].filter(Boolean).join(' — ') ||
                `Document ${index + 1}`
              }
              badge={
                isExpired(row?.expiryDate ?? '') ? (
                  <RepeatCardBadge variant="destructive">Expired</RepeatCardBadge>
                ) : row?.document ? (
                  <RepeatCardBadge variant="success">Uploaded</RepeatCardBadge>
                ) : undefined
              }
              hasError={Boolean(errors)}
              onRemove={() => removeRow(index)}
              canRemove={fields.length > 1 || Boolean(row?.id)}
            >
              <Field
                label="Document Type"
                required
                error={errors?.documentTypeId?.message}
              >
                <Controller
                  control={form.control}
                  name={`rows.${index}.documentTypeId`}
                  render={({ field: type }) => (
                    <Combobox
                      className="w-full"
                      value={type.value}
                      onChange={(value) => changeDocumentType(index, value, type.onChange)}
                      options={typeOptions}
                      placeholder={isOptionsLoading ? 'Loading…' : 'Select Type'}
                      searchPlaceholder="Search document type"
                    />
                  )}
                />
              </Field>

              <Field
                label="Document Name"
                required
                error={errors?.documentId?.message}
                // The document master is filed under a type, so nothing lists yet.
                hint={
                  row?.documentTypeId ? undefined : 'Choose a document type first.'
                }
              >
                <Controller
                  control={form.control}
                  name={`rows.${index}.documentId`}
                  render={({ field: document }) => (
                    <Combobox
                      className="w-full"
                      value={document.value}
                      onChange={document.onChange}
                      options={documentOptionsFor(row?.documentTypeId ?? '')}
                      placeholder={row?.documentTypeId ? 'Select Name' : 'Select Type first'}
                      searchPlaceholder="Search document"
                    />
                  )}
                />
              </Field>

              <DateField
                control={form.control}
                name={`rows.${index}.expiryDate`}
                label="Expiry Date"
                error={errors?.expiryDate?.message}
                hint="Leave empty for a document that doesn't expire."
              />

              <Field
                label="Upload Document"
                required
                error={errors?.document?.message}
                // The presign files the object key under the type, so it comes first.
                hint={row?.documentTypeId ? undefined : 'Choose a document type first.'}
              >
                <DocumentFileField
                  value={row?.document ?? ''}
                  onPick={(file) => uploadDocumentFile(index, file)}
                  isUploading={uploadingIndex === index}
                  disabled={!row?.documentTypeId}
                />
              </Field>
            </RepeatCard>
          )
        })}
      </RepeatSection>

      <StepFormFooter
        onBack={onBack}
        isSaving={isSaving}
        hint="At least one document is required; files upload as you pick them."
      />
    </form>
  )
}
