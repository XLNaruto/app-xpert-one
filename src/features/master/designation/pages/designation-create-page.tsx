import type { ReactNode } from 'react'
import { ArrowLeft, Briefcase, IndianRupee, Wallet } from 'lucide-react'
import { decryptId, decryptParams } from '@/lib/crypto'
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
import { useDesignationForm } from '../hooks/use-designation-form'
import { useDesignationBasicInfoForm } from '../hooks/use-designation-basic-info-form'
import { asTab, useDesignationFormTab } from '../hooks/use-designation-form-tab'
import type { DesignationFormTab } from '../constants'

interface DesignationCreatePageProps {
  /**
   * Encrypted designation id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create. The same page
   * handles both.
   */
  data?: string
}

/**
 * Create/edit a designation record. One screen for both, but the API splits the
 * designation in two — a title, and an effective-dated wage structure behind it —
 * and the two modes fall on either side of that split:
 *
 * - **Create** puts everything on one form. `POST /user/designations` takes the
 *   title, the salary configuration, the applicable acts and the heads in one
 *   body, so one submit establishes the designation and its opening wage
 *   structure together.
 * - **Edit** splits into two tabs, because the two are saved by different
 *   endpoints. Basic Info holds the title alone and saves with
 *   `PATCH /user/designations/:id`, which accepts the name and nothing else.
 *   Wage Structure holds the version history and saves through
 *   `/user/designations/:id/wage-structures` — a revision is a new version
 *   against a month, never an edit of the record.
 */
export function DesignationCreatePage({ data }: DesignationCreatePageProps) {
  /*
   * Decrypt the params from the URL; missing/malformed → create mode. The token
   * carries the open tab alongside the id, so the two come out of the one read.
   */
  const designationId = decryptId(data)
  const openTab = asTab(data ? decryptParams<{ tab?: string }>(data)?.tab : undefined)

  return designationId === undefined ? (
    <CreateView />
  ) : (
    <EditView designationId={designationId} openTab={openTab} />
  )
}

/** Create mode: the whole designation, saved in one call. */
function CreateView() {
  const form = useDesignationForm()

  return (
    <PageShell
      title="Add New Designation"
      description="Create a new designation record"
      goToList={form.goToList}
    >
      <form onSubmit={form.onSubmit} noValidate>
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
          tdsActApplicable={form.tdsActApplicable}
          lwfActApplicable={form.lwfActApplicable}
          lwfActType={form.lwfActType}
          overtimeApplicable={form.overtimeApplicable}
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

        <FormActions
          goToList={form.goToList}
          isPending={form.isPending}
          submitLabel="Create Designation"
        />
      </form>
    </PageShell>
  )
}

/** Edit mode: the title and the wage history, saved independently. */
function EditView({
  designationId,
  openTab,
}: {
  designationId: number
  openTab: DesignationFormTab
}) {
  const { tab, setTab } = useDesignationFormTab(designationId, openTab)
  const form = useDesignationBasicInfoForm(designationId)

  return (
    <PageShell
      title="Edit Designation"
      description="Rename the designation, or add a wage structure revision"
      goToList={form.goToList}
    >
      <StateGate
        isLoading={form.isLoading}
        isError={form.isError}
        loadError={form.loadError}
      >
        <Tabs value={tab} onValueChange={setTab}>
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
            Only the designation's name is editable here — that is the whole of
            what `PATCH /user/designations/:id` accepts. Everything about its pay
            is effective-dated and lives on the other tab, where a change is saved
            against a month rather than in place.
          */}
          <TabsContent value="basic">
            <form onSubmit={form.onSubmit} noValidate>
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

              <p className="mt-4 text-sm text-muted-foreground">
                Salary, working days and the applicable acts belong to the wage
                structure in force — open the Wage Structure tab to revise them from
                a given month.
              </p>

              <FormActions
                goToList={form.goToList}
                isPending={form.isPending}
                submitLabel="Save Changes"
              />
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

/** Cancel + submit, shared by the create form and the Basic Info tab. */
function FormActions({
  goToList,
  isPending,
  submitLabel,
}: {
  goToList: () => void
  isPending: boolean
  submitLabel: string
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
      <Button type="button" variant="outline" onClick={goToList} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </div>
  )
}

/** Holds back the tabs until the record being edited has loaded. */
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
