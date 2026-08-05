import { ArrowLeft, Eye } from 'lucide-react'
import { decryptId, decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { EMPLOYEE_TAB_LABELS } from '../constants'
import { asEmployeeTab, useEmployeeWizard } from '../hooks/use-employee-wizard'
import { EmployeeWizardNav } from '../components/employee-wizard-nav'
import { BasicDetailTab } from '../components/basic-detail-tab'
import { KycDetailTab } from '../components/kyc-detail-tab'
import { WageStructureTab } from '../components/wage-structure-tab'
import { FamilyDetailTab } from '../components/family-detail-tab'
import { EducationExperienceTab } from '../components/education-experience-tab'
import { DocumentDetailTab } from '../components/document-detail-tab'
import { AssetDetailTab } from '../components/asset-detail-tab'
import { TransferHistoryTab } from '../components/transfer-history-tab'
import { LeaveManagementTab } from '../components/leave-management-tab'

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
 * Step 9 is one leave form over a paged history, for the same reason its data
 * grows without bound.
 *
 * Two steps have no save of their own. Step 3 is read-only: the wage structure is
 * inherited from the designation and stored nowhere on the employee. Step 8 writes
 * only through its dialogs, because the posting history is append-only and each
 * write is a deliberate, irreversible act.
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

      <Card>
        <CardContent className="space-y-6 pt-6">
          <EmployeeWizardNav
            steps={wizard.steps}
            value={wizard.tab}
            onChange={wizard.setTab}
            onLockedStep={wizard.onLockedStep}
            progress={wizard.progress}
          />

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
  const { tab, goToNextTab, goToList, openCreatedEmployee, employee } = wizard

  if (tab === 'basic') {
    return (
      <BasicDetailTab
        employee={employee}
        onCreated={openCreatedEmployee}
        onSaved={goToNextTab}
        onClose={goToList}
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
        <KycDetailTab employeeId={employeeId} onSaved={goToNextTab} onClose={goToList} />
      )
    case 'wage':
      return (
        <WageStructureTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'family':
      return (
        <FamilyDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'education':
      return (
        <EducationExperienceTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'documents':
      return (
        <DocumentDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'assets':
      return (
        <AssetDetailTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'transfers':
      return (
        <TransferHistoryTab
          employeeId={employeeId}
          onContinue={goToNextTab}
          onClose={goToList}
        />
      )
    case 'leaves':
      return <LeaveManagementTab employeeId={employeeId} onClose={goToList} />
    default:
      return null
  }
}
