import { ArrowLeft, Wallet } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DesignationSalarySection } from '../components/designation-salary-section'
import { AllowanceDeductionSection } from '../components/allowance-deduction-section'
import { useDesignationForm } from '../hooks/use-designation-form'

interface DesignationCreatePageProps {
  /**
   * Encrypted designation id from the `?data=` search param. When present the
   * page switches to edit mode (GET to seed, PUT to save); otherwise it's a
   * fresh create. The same page and form handle both.
   */
  data?: string
}

/**
 * Create/edit a designation record. One screen for both: a `?data=` token edits
 * the record it carries, no token creates a new one. Everything the designation
 * needs sits on a single form — the salary configuration, the applicable acts
 * and the allowance / deduction heads — so one submit saves the lot.
 */
export function DesignationCreatePage({ data }: DesignationCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const designationId = decryptId(data)

  const form = useDesignationForm(designationId)
  const { onSubmit, isEdit, isPending, isLoading, isError, loadError, goToList } = form

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Designation' : 'Add New Designation'}
        description={
          isEdit ? 'Update this designation record' : 'Create a new designation record'
        }
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this designation."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <DesignationSalarySection
                register={form.register}
                control={form.control}
                errors={form.errors}
                wagePerDay={form.wagePerDay}
                workingDayCalculationType={form.workingDayCalculationType}
                changeWorkingDayCalculationType={form.changeWorkingDayCalculationType}
                pfActApplicable={form.pfActApplicable}
                pfDeductionType={form.pfDeductionType}
                esicActApplicable={form.esicActApplicable}
                ptActApplicable={form.ptActApplicable}
                ptActType={form.ptActType}
                lwfActApplicable={form.lwfActApplicable}
                lwfActType={form.lwfActType}
                overtimeApplicable={form.overtimeApplicable}
                overtimeCalculationType={form.overtimeCalculationType}
              />

              <FormSection
                icon={Wallet}
                title="Allowance & Deduction"
                description="Every head in the master, listed for this designation"
              />

              <div className="mt-5">
                <AllowanceDeductionSection
                  register={form.register}
                  control={form.control}
                  errors={form.errors}
                  allowanceHeads={form.allowanceHeads}
                  deductionHeads={form.deductionHeads}
                  componentsLoading={form.componentsLoading}
                  pfActApplicable={form.pfActApplicable}
                  esicActApplicable={form.esicActApplicable}
                  ptActApplicable={form.ptActApplicable}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToList}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Designation'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
