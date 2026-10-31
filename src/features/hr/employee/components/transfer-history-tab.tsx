import { useMemo } from 'react'
import { Controller, FormProvider } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowRight,
  ArrowRightLeft,
  Building2,
  Info,
  LogOut,
  Pencil,
  UserPlus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ALL_PAGE_SIZE, DataTable } from '@/components/data-table'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Forbidden } from '@/features/error'
import { formatAmount } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import { useEmployeeTransferTab } from '../hooks/use-employee-transfer-tab'
import { PostingSection } from './posting-section'
import { StepDialog } from './step-dialog'
import { EmployeeRejoinDialog } from './employee-rejoin-dialog'
import { StepNavFooter } from './step-nav-footer'
import type { EmployeeTransfer, EmployeeTransferDetail } from '../types'

/**
 * Step 8 — Employee Service History.
 *
 * The one tab with no Save button and no form of its own: the history is
 * append-only, so every write here is a deliberate act through a dialog. Which
 * actions a row offers follows from what the API allows —
 *
 * - **Transfer** and **Leave Service** need a posting that's still open, so they sit
 *   in the header and disable once the employee has left.
 * - **Rejoin** takes their place once every posting is closed — enabled only when
 *   `GET …/rejoin` allows it, with the API's reason on hover when it doesn't.
 * - **Edit** appears on the *latest* posting only: the endpoint refuses a
 *   `service_id` from closed history, since correcting the past would rewrite what
 *   payroll already ran against.
 * - **Details** is available on every row, current or closed.
 */
export function TransferHistoryTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const tab = useEmployeeTransferTab(employeeId)

  const columns = useMemo<ColumnDef<EmployeeTransfer>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <RowAction
              label="Details"
              icon={Info}
              onClick={() => tab.startDetail(row.original)}
              className="bg-muted text-muted-foreground hover:bg-muted-foreground/20"
            />
            {/* Only the latest posting is editable — the API refuses a closed one. */}
            {row.original.isLatest && (
              <RowAction
                label="Edit Posting"
                icon={Pencil}
                onClick={() => tab.startEdit(row.original)}
                className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
              />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        header: 'Company',
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block font-medium text-foreground">
              {row.original.companyName || '—'}
            </span>
            <span className="block text-xs text-muted-foreground">
              {row.original.branchName || 'No branch'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'departmentName',
        header: 'Department / Designation',
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-sm">{row.original.departmentName || '—'}</span>
            <span className="block text-xs text-muted-foreground">
              {row.original.designationName || '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'joiningDate',
        header: 'Joined',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.joiningDate ? formatDate(row.original.joiningDate) : '—',
      },
      {
        accessorKey: 'leavingDate',
        header: 'Left',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.leavingDate ? (
            formatDate(row.original.leavingDate)
          ) : (
            <Badge variant="success">Currently Working</Badge>
          ),
      },
      {
        id: 'flags',
        header: 'Posting',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {row.original.isCurrent && <Badge>Current</Badge>}
            {row.original.isLatest && !row.original.isCurrent && (
              <Badge variant="secondary">Latest</Badge>
            )}
            {!row.original.isLatest && (
              <span className="text-xs text-muted-foreground">History</span>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  if (tab.isForbidden) return <Forbidden description={tab.forbiddenMessage} />

  const transferErrors = tab.transfer.form.formState.errors
  const leaveErrors = tab.leave.form.formState.errors

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormSection
          icon={ArrowRightLeft}
          title="Posting History"
          description="Every Posting the Employee Has Held, Newest First"
          className="mt-0 flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!tab.hasOpenPosting}
            onClick={tab.startLeave}
          >
            <LogOut className="size-4" />
            Leave Service
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab.showRejoin ? 'outline' : 'default'}
            disabled={!tab.hasOpenPosting}
            onClick={tab.startTransfer}
          >
            <ArrowRightLeft className="size-4" />
            Transfer Service
          </Button>
          {tab.showRejoin &&
            (tab.canRejoin ? (
              <Button type="button" size="sm" onClick={tab.startRejoin}>
                <UserPlus className="size-4" />
                Rejoin
              </Button>
            ) : (
              // A disabled button fires no hover, so the span carries the tooltip.
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-not-allowed">
                    <Button type="button" size="sm" disabled>
                      <UserPlus className="size-4" />
                      Rejoin
                    </Button>
                  </span>
                </TooltipTrigger>
                {tab.rejoinHint && (
                  <TooltipContent className="max-w-72 text-pretty font-normal">
                    {tab.rejoinHint}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
        </div>
      </div>

      {!tab.hasOpenPosting && !tab.isLoading && tab.rows.length > 0 && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          This employee has no open posting — they've left. Nothing is left to
          close or transfer; Rejoin starts a new spell of service in a company they
          worked in before.
          {tab.showRejoin && !tab.canRejoin && tab.rejoinHint && (
            <span className="mt-1 block font-medium">{tab.rejoinHint}</span>
          )}
        </p>
      )}

      <div className="mt-5">
        {tab.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tab.error instanceof Error
              ? tab.error.message
              : "Couldn't Load the Transfer History."}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={tab.rows}
            isLoading={tab.isLoading}
            itemName="postings"
            pageSize={ALL_PAGE_SIZE}
            pageSizeOptions={[5, 10, 25]}
            emptyState={
              <EmptyState
                icon={ArrowRightLeft}
                title="No Postings Yet"
                description="The First Posting Is Created Together with the Employee in Basic Detail."
              />
            }
          />
        )}
      </div>

      <StepNavFooter onContinue={onContinue} onBack={onBack}>
        A Transfer Closes the Open Posting and Opens a New One — The Old Row Is Kept
        as History, Never Overwritten.
      </StepNavFooter>

      {/* ── Transfer ────────────────────────────────────────────────────── */}

      <FormProvider {...tab.transfer.form}>
        <StepDialog
          open={tab.dialog === 'transfer'}
          onOpenChange={(open) => !open && tab.closeDialog()}
          title="Transfer Service"
          description="One Call Closes the Current Posting and Opens the New One, So the History Survives."
          onSubmit={tab.transfer.onSubmit}
          isPending={tab.transfer.isPending}
          submitLabel="Transfer"
          size="wide"
        >
          <div className="sm:col-span-2">
            <FormSection
              icon={LogOut}
              title="Close the Current Posting"
              description="The Leaving Details Recorded Against the Posting Being Left"
              className="mt-0"
            />
          </div>

          <DateField
            control={tab.transfer.form.control}
            name="leavingDate"
            label="Leaving Date"
            required
            error={transferErrors.leavingDate?.message}
            minDate={
              tab.openPostingJoiningDate
                ? new Date(`${tab.openPostingJoiningDate}T00:00:00`)
                : undefined
            }
          />

          <Field
            label="Leaving Reason"
            required
            error={transferErrors.leavingReason?.message}
          >
            <Input
              placeholder="e.g. Transferred to Surat branch"
              aria-invalid={transferErrors.leavingReason ? true : undefined}
              {...tab.transfer.form.register('leavingReason')}
            />
          </Field>

          <div className="sm:col-span-2">
            <FormSection
              icon={Building2}
              title="The New Posting"
              description="Where the Employee Goes Next, and on What Terms"
            />
          </div>

          {/*
            The company is picked outright — seeded with the one being left, so a
            plain branch move is just leaving it alone. Whether the API is told
            'company' or 'branch' follows from that choice.
          */}
          <Field
            label="Company"
            required
            error={transferErrors.companyId?.message}
            hint="Leave It as It Is for a Move Inside the Same Company; Pick Another to Transfer the Employee Across."
          >
            <Controller
              control={tab.transfer.form.control}
              name="companyId"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  {...tab.transfer.companySelect}
                  placeholder="Select Company"
                  searchPlaceholder="Search Company"
                />
              )}
            />
          </Field>

          {/*
            Branches, departments and designations all belong to the chosen
            company, so those lists can't be shown until one is picked.
          */}
          {tab.transfer.needsCompany ? (
            <p className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Choose the company first — the branch, department and designation lists
              below belong to it.
            </p>
          ) : (
            <PostingSection options={tab.transfer.options} showHeading={false} />
          )}
        </StepDialog>
      </FormProvider>

      {/* ── Restricted edit of the latest posting ───────────────────────── */}

      <FormProvider {...tab.edit.form}>
        <StepDialog
          open={tab.dialog === 'edit'}
          onOpenChange={(open) => !open && tab.closeDialog()}
          title="Edit Posting"
          description="Corrects the Latest Posting in Place — Nothing Is Closed and No History Is Added."
          onSubmit={tab.edit.onSubmit}
          isPending={tab.edit.isPending}
          submitLabel="Save Changes"
          size="wide"
        >
          {tab.edit.isLoading ? (
            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <PostingSection
              options={tab.edit.options}
              showHeading={false}
              showDates={false}
            />
          )}
        </StepDialog>
      </FormProvider>

      {/* ── Leave service ───────────────────────────────────────────────── */}

      <StepDialog
        open={tab.dialog === 'leave'}
        onOpenChange={(open) => !open && tab.closeDialog()}
        title="Leave Service"
        description="Closes the Open Posting Without Opening Another — The Employee Exits."
        onSubmit={tab.leave.onSubmit}
        isPending={tab.leave.isPending}
        submitLabel="Close Posting"
      >
        <DateField
          control={tab.leave.form.control}
          name="leavingDate"
          label="Leaving Date"
          required
          error={leaveErrors.leavingDate?.message}
          minDate={
            tab.openPostingJoiningDate
              ? new Date(`${tab.openPostingJoiningDate}T00:00:00`)
              : undefined
          }
        />

        <Field
          label="Leaving Reason"
          required
          error={leaveErrors.leavingReason?.message}
          className="sm:col-span-2"
        >
          <Textarea
            rows={3}
            placeholder="e.g. Resigned, contract ended, absconded"
            aria-invalid={leaveErrors.leavingReason ? true : undefined}
            {...tab.leave.form.register('leavingReason')}
          />
        </Field>
      </StepDialog>

      {/* ── Rejoin ──────────────────────────────────────────────────────── */}

      <EmployeeRejoinDialog rejoin={tab.rejoin} />

      {/* ── Row details ─────────────────────────────────────────────────── */}

      <PostingDetailDialog
        open={tab.dialog === 'detail'}
        onOpenChange={(open) => !open && tab.closeDialog()}
        detail={tab.detail.data}
        isLoading={tab.detail.isLoading}
        isError={tab.detail.isError}
        error={tab.detail.error}
      />
    </div>
  )
}

/** A soft-tinted square icon button for the row's actions. */
function RowAction({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof Info
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`grid size-8 cursor-pointer place-items-center rounded-lg transition-colors ${className ?? ''}`}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One posting expanded: its service detail plus the wage structure it was held
 * under. Read-only — the wage summary belongs to the designation of the day, so
 * there's nothing here to edit even for the current posting.
 */
function PostingDetailDialog({
  open,
  onOpenChange,
  detail,
  isLoading,
  isError,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: EmployeeTransferDetail | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onClose={() => onOpenChange(false)}>
        <DialogHeader className="pr-10">
          <DialogTitle>Posting Details</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.serviceDetail.companyName || 'Company'} · ${detail.serviceDetail.designationName || 'No designation'}`
              : 'The Posting and the Wage Structure It Was Held Under'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : isError || !detail ? (
            <p className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Couldn't Load This Posting's Detail."}
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <FormSection
                  icon={Building2}
                  title="Assignment"
                  description="Where This Posting Sat"
                  className="mt-0"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DetailItem
                    icon={Building2}
                    label="Company"
                    value={detail.serviceDetail.companyName || null}
                  />
                  <DetailItem
                    icon={Building2}
                    label="Branch"
                    value={detail.serviceDetail.branchName || null}
                  />
                  <DetailItem
                    icon={Building2}
                    label="Department"
                    value={detail.serviceDetail.departmentName || null}
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Designation"
                    value={detail.serviceDetail.designationName || null}
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Grade"
                    value={detail.serviceDetail.grade || null}
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Employment Type"
                    value={
                      detail.serviceDetail.employmentType
                        ? detail.serviceDetail.contractPeriod
                          ? `${detail.serviceDetail.employmentType} · ${detail.serviceDetail.contractPeriod} ${detail.serviceDetail.contractPeriodType}`
                          : detail.serviceDetail.employmentType
                        : null
                    }
                  />
                </div>
              </div>

              <div>
                <FormSection
                  icon={Info}
                  title="Important Dates"
                  description="The Span of This Posting"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DetailItem
                    icon={ArrowRight}
                    label="Joining Date"
                    value={
                      detail.serviceDetail.joiningDate
                        ? formatDate(detail.serviceDetail.joiningDate)
                        : null
                    }
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Confirmation Date"
                    value={
                      detail.serviceDetail.confirmationDate
                        ? formatDate(detail.serviceDetail.confirmationDate)
                        : null
                    }
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Renewal Date"
                    value={
                      detail.serviceDetail.renewalDate
                        ? formatDate(detail.serviceDetail.renewalDate)
                        : null
                    }
                  />
                  <DetailItem
                    icon={LogOut}
                    label="Leaving Date"
                    value={
                      detail.serviceDetail.leavingDate
                        ? formatDate(detail.serviceDetail.leavingDate)
                        : 'Still Open'
                    }
                  />
                  <DetailItem
                    icon={LogOut}
                    label="Leaving Reason"
                    value={detail.serviceDetail.leavingReason || null}
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <div>
                <FormSection
                  icon={ArrowRightLeft}
                  title="Wage Structure"
                  description="The Wage in Force for This Posting — The Employee's Own Version If One Applies, Otherwise the Designation's as of the Posting Date"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DetailItem
                    icon={ArrowRight}
                    label="Source"
                    value={
                      detail.wageStructure.source === 'EMPLOYEE'
                        ? "Employee's Own Wage"
                        : detail.wageStructure.source === 'DESIGNATION'
                          ? 'Designation Wage Structure'
                          : 'No Wage in Force'
                    }
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Salary Type"
                    value={detail.wageStructure.salaryType || null}
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Basic Pay"
                    value={
                      detail.wageStructure.basicPay === null
                        ? null
                        : formatAmount(detail.wageStructure.basicPay)
                    }
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Wage Per Day"
                    value={
                      detail.wageStructure.wagesPerDay === null
                        ? null
                        : formatAmount(detail.wageStructure.wagesPerDay)
                    }
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Weekly Off"
                    value={detail.wageStructure.weeklyOff || null}
                  />
                  <DetailItem
                    icon={ArrowRight}
                    label="Acts Applicable"
                    value={
                      [
                        detail.wageStructure.isPfActApplicable ? 'PF' : null,
                        detail.wageStructure.isEsicActApplicable ? 'ESIC' : null,
                        detail.wageStructure.isPtActApplicable ? 'PT' : null,
                        detail.wageStructure.isLwfActApplicable ? 'LWF' : null,
                        detail.wageStructure.isTdsActApplicable ? 'TDS' : null,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'None'
                    }
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <div>
                <FormSection icon={Info} title="Other Details" />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DetailItem
                    icon={Info}
                    label="Police Verified"
                    value={detail.serviceDetail.isPoliceVerified ? 'Yes' : 'No'}
                  />
                  <DetailItem
                    icon={Info}
                    label="Stamp Agreement"
                    value={detail.serviceDetail.isStampAgreement ? 'Yes' : 'No'}
                  />
                  <DetailItem
                    icon={Info}
                    label="Overtime"
                    value={detail.wageStructure.isOvertimeApplicable ? 'Yes' : 'No'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
