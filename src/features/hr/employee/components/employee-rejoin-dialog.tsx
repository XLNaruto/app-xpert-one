import { FormProvider } from 'react-hook-form'
import { AlertTriangle, Building2 } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatDate } from '@/lib/utils'
import type { EmployeeRejoin } from '../hooks/use-employee-rejoin'
import { PostingSection } from './posting-section'
import { StepDialog } from './step-dialog'

/**
 * Rejoin — "the new posting" for a de-active employee: Company (only their
 * earlier ones), Branch, Department, Designation, Grade, Employment Type and the
 * dates. Nothing is closed, so there are no leaving fields.
 */
export function EmployeeRejoinDialog({ rejoin }: { rejoin: EmployeeRejoin }) {
  const errors = rejoin.form.formState.errors
  const name = rejoin.target ? rejoin.target.name || 'this employee' : ''
  // Still loading, refused or unreadable — nothing to save yet.
  const blocked = rejoin.isLoading || !!rejoin.loadError || !!rejoin.refusal

  return (
    <FormProvider {...rejoin.form}>
      <StepDialog
        open={rejoin.target !== null}
        onOpenChange={(open) => !open && rejoin.close()}
        title="Rejoin Employee"
        description={`Opens a new spell of service for ${name} in a company they worked in before. Their earlier postings stay as they are.`}
        onSubmit={rejoin.onSubmit}
        isPending={rejoin.isPending}
        submitDisabled={blocked}
        submitLabel="Rejoin"
        size="wide"
      >
        {rejoin.isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </>
        ) : rejoin.loadError ? (
          <p className="text-sm text-destructive sm:col-span-2">
            {getApiErrorMessage(rejoin.loadError, "Couldn't check whether this employee can rejoin.")}
          </p>
        ) : rejoin.refusal ? (
          <Banner>{rejoin.refusal}</Banner>
        ) : (
          <>
            {rejoin.conflict && <Banner>{rejoin.conflict}</Banner>}

            <div className="sm:col-span-2">
              <FormSection
                icon={Building2}
                title="The new posting"
                description={
                  rejoin.lastLeavingDate
                    ? `Their last posting ended on ${formatDate(rejoin.lastLeavingDate)} — the new one starts after it.`
                    : 'Where the employee rejoins, and on what terms'
                }
                className="mt-0"
              />
            </div>

            <Field
              label="Company"
              required
              error={errors.companyId?.message}
              hint="Only companies they worked in before, newest first."
            >
              <Combobox
                className="w-full"
                value={rejoin.companyId}
                onChange={rejoin.changeCompany}
                options={rejoin.companyOptions}
                placeholder="Select company"
                searchPlaceholder="Search company"
              />
            </Field>

            {rejoin.needsCompany ? (
              <p className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Choose the company first — the branch, department and designation lists
                below belong to it.
              </p>
            ) : (
              <PostingSection
                options={rejoin.options}
                showHeading={false}
                minJoiningDate={rejoin.minJoiningDate || undefined}
              />
            )}
          </>
        )}
      </StepDialog>
    </FormProvider>
  )
}

/** A refusal that says WHERE — kept on the form until the user acts on it. */
function Banner({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
