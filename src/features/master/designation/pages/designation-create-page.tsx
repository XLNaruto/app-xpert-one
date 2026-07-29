import type { ReactNode } from 'react'
import { ArrowLeft, Briefcase, IndianRupee, Wallet } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DesignationSalarySection } from '../components/designation-salary-section'
import { AllowanceDeductionSection } from '../components/allowance-deduction-section'
import { WageStructureTab } from '../components/wage-structure-tab'
import {
  useDesignationForm,
  type DesignationFormTab,
} from '../hooks/use-designation-form'

interface DesignationCreatePageProps {
  /**
   * Encrypted designation id from the `?data=` search param. When present the
   * page switches to edit mode (GET to seed, PUT to save); otherwise it's a
   * fresh create. The same page and form handle both.
   */
  data?: string
}

/**
 * Create/edit a designation record. One screen for both, but the two modes ask
 * for different things:
 *
 * - **Create** puts everything on one form — the salary configuration, the
 *   applicable acts and the allowance / deduction heads — so one submit
 *   establishes the designation and its opening wage setup together.
 * - **Edit** splits into two tabs. Basic Info holds the designation's identity;
 *   Wage Structure holds the effective-dated history, where a change is a new
 *   row rather than an edit of the record. The two save independently, since a
 *   rename has nothing to do with a wage revision.
 */
export function DesignationCreatePage({ data }: DesignationCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const designationId = decryptId(data)

  const form = useDesignationForm(designationId)
  const { onSubmit, isEdit, isPending, isLoading, isError, loadError, goToList } = form

  /* ── Edit mode: basic info and wage history as separate tabs ── */
  if (isEdit && designationId !== undefined) {
    return (
      <PageShell
        title="Edit Designation"
        description="Update the designation, or add a wage structure revision"
        goToList={goToList}
      >
        <StateGate isLoading={isLoading} isError={isError} loadError={loadError}>
          <Tabs
            value={form.tab}
            onValueChange={(value) => form.setTab(value as DesignationFormTab)}
          >
            <TabsList>
              <TabsTrigger value="basic">
                <Briefcase className="mr-1.5 size-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="wage">
                <IndianRupee className="mr-1.5 size-4" />
                Wage Structure
              </TabsTrigger>
            </TabsList>

            {/*
              Only the designation's identity is editable here. Everything about
              its pay is effective-dated and lives on the other tab, so it is
              never edited in place.
            */}
            <TabsContent value="basic">
              <form onSubmit={onSubmit} noValidate>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Designation Name"
                    required
                    error={form.errors.designationName?.message}
                  >
                    <Input
                      placeholder="Designation Name"
                      {...form.register('designationName')}
                    />
                  </Field>
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
                    {isPending ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="wage">
              <WageStructureTab designationId={designationId} />
            </TabsContent>
          </Tabs>
        </StateGate>
      </PageShell>
    )
  }

  /* ── Create mode: the whole designation on one form ── */
  return (
    <PageShell
      title="Add New Designation"
      description="Create a new designation record"
      goToList={goToList}
    >
      <StateGate isLoading={isLoading} isError={isError} loadError={loadError}>
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
              {isPending ? 'Saving…' : 'Create Designation'}
            </Button>
          </div>
        </form>
      </StateGate>
    </PageShell>
  )
}

/** The header + card both modes sit in. */
function PageShell({
  title,
  description,
  goToList,
  children,
}: {
  title: string
  description: string
  goToList: () => void
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  )
}

/** Holds back the form until the record being edited has loaded. */
function StateGate({
  isLoading,
  isError,
  loadError,
  children,
}: {
  isLoading: boolean
  isError: boolean
  loadError: unknown
  children: ReactNode
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {loadError instanceof Error
          ? loadError.message
          : "Couldn't load this designation."}
      </p>
    )
  }
  return <>{children}</>
}
