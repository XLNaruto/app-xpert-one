import { ArrowLeft, Eye } from 'lucide-react'
import { decryptId, decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { EMPLOYEE_TAB_LABELS } from '../constants'
import { asEmployeeTab, useEmployeeWizard } from '../hooks/use-employee-wizard'
import {
  EmployeeWizardNav,
  EmployeeWizardProgress,
} from '../components/employee-wizard-nav'
import { BasicDetailTab } from '../components/basic-detail-tab'
import { KycDetailTab } from '../components/kyc-detail-tab'
import { WageStructureTab } from '../components/wage-structure-tab'
import { FamilyDetailTab } from '../components/family-detail-tab'
import { EducationExperienceTab } from '../components/education-experience-tab'
import { DocumentDetailTab } from '../components/document-detail-tab'
import { AssetDetailTab } from '../components/asset-detail-tab'
import { TransferHistoryTab } from '../components/transfer-history-tab'
import { ShiftRosterTab } from '../components/shift-roster-tab'
import { StepNavFooter } from '../components/step-nav-footer'
import { EmployeeLeaveQuotaTab } from '@/features/hr/leave-quota'

interface EmployeeCreatePageProps {
  /**
   * The encrypted `?data=` token. It carries the employee id — present means edit
   * mode — and, alongside it, the step that was open, so a refresh comes back to
   * the same tab.
   */
  data?: string
}

/**
 * Add / edit an employee: one screen, nine steps.
 *
 * The wizard's shape is the API's shape. `POST /user/employees` creates the person
 * *and* their first posting together, and every later step is a sub-resource
 * addressed as `/user/employees/:id/…` — so step 1 is the only one that can run
 * before an employee exists, and the rest stay locked until it has. Saving step 1
 * adopts the returned id and opens step 2.
 *
 * Steps 4 through 7 are card lists with one Save each. The API writes a row at a
 * time — there is no whole-step endpoint — so those saves diff the list into the
 * inserts, updates and deletes that make the server match (`lib/save-rows.ts`).
 *
 * Three steps have no save of their own. Step 3 is read-only: the wage structure is
 * inherited from the designation and stored nowhere on the employee. Steps 8 and 9
 * write only through their dialogs, because the posting history and the shift
 * timeline are append-only and each write is a deliberate, irreversible act.
 */
export function EmployeeCreatePage({ data }: EmployeeCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode. The token
  // carries the open step alongside the id, so both come out of the one read.
  const employeeId = decryptId(data)
  const openTab = asEmployeeTab(data ? decryptParams<{ tab?: string }>(data)?.tab : undefined)

  const wizard = useEmployeeWizard(employeeId, openTab)

  // Reading this employee was refused — show the 403 screen, not a broken wizard.
  if (wizard.isForbidden) return <Forbidden description={wizard.forbiddenMessage} />

  const employee = wizard.employee
  const title = employeeId === undefined ? 'Add Employee' : 'Edit Employee'
  const description =
    employeeId === undefined
      ? 'Save Basic Detail first — the other eight steps hang off the saved employee.'
      : [employee?.name, employee?.code].filter(Boolean).join(' · ') ||
        'Complete the employee record'

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {employeeId !== undefined && (
              <Button variant="outline" onClick={wizard.goToDetail}>
                <Eye className="size-4" />
                View
              </Button>
            )}
            <Button variant="outline" onClick={wizard.goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />

      {/* Progress and tabs both sit above the card — the card holds only the step. */}
      <EmployeeWizardProgress progress={wizard.progress} />

      <EmployeeWizardNav
        steps={wizard.steps}
        value={wizard.tab}
        onChange={wizard.setTab}
        onLockedStep={wizard.onLockedStep}
      />

      <Card>
        <CardContent className="pt-6">
          {wizard.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : wizard.isError ? (
            <p className="text-sm text-destructive">
              {wizard.loadError instanceof Error
                ? wizard.loadError.message
                : "Couldn't load this employee."}
            </p>
          ) : (
            <div>
              <h2 className="sr-only">{EMPLOYEE_TAB_LABELS[wizard.tab]}</h2>
              <StepBody wizard={wizard} employeeId={employeeId} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * The open step's body.
 *
 * Only the active step is mounted — a hidden tab would otherwise fire its own read
 * on the first render, and nine of those at once is nine requests for one step the
 * user is looking at.
 */
function StepBody({
  wizard,
  employeeId,
}: {
  wizard: ReturnType<typeof useEmployeeWizard>
  employeeId: number | undefined
}) {
  const { tab, goToNextTab, goToPrevTab, openCreatedEmployee, employee } = wizard

  if (tab === 'basic') {
    return (
      <BasicDetailTab
        employee={employee}
        onCreated={openCreatedEmployee}
        onSaved={goToNextTab}
        onBack={goToPrevTab}
      />
    )
  }

  // Every step below is addressed by the employee id, so none can render without
  // one. The nav locks them, and this is the backstop.
  if (employeeId === undefined) {
    return (
      <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        Save Basic Detail first — this step is stored against the saved employee.
      </p>
    )
  }

  switch (tab) {
    case 'kyc':
      return (
        <KycDetailTab
          employeeId={employeeId}
          onSaved={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'wage':
      return (
        <WageStructureTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'family':
      return (
        <FamilyDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'education':
      return (
        <EducationExperienceTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'documents':
      return (
        <DocumentDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'assets':
      return (
        <AssetDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'transfers':
      return (
        <TransferHistoryTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    case 'shifts':
      return (
        <ShiftRosterTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onBack={goToPrevTab}
        />
      )
    /*
      The employee's own paid-leave allowance — the per-YEAR exception to their
      designation's standing policy, which is where an allowance normally lives.
      An ongoing register rather than a step to finish, so it isn't counted toward
      completion: an employee whose designation already covers them needs no grant
      of their own.
    */
    case 'leaveQuota':
      return (
        <EmployeeLeaveQuotaTab
          employeeId={employeeId}
          footer={
            <StepNavFooter onContinue={goToNextTab} onBack={goToPrevTab} continueLabel="Finish">
              An allowance set here overrides the designation for this year only.
            </StepNavFooter>
          }
        />
      )
    default:
      return null
  }
}
