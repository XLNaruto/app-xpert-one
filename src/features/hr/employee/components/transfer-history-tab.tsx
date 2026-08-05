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
import { DataTable } from '@/components/data-table'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Forbidden } from '@/features/error'
import { formatAmount } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import { TRANSFER_TYPE_OPTIONS } from '../constants'
import { useEmployeeTransferTab } from '../hooks/use-employee-transfer-tab'
import { PostingSection } from './posting-section'
import { StepDialog } from './step-dialog'
import { StepNavFooter } from './step-nav-footer'
import type { EmployeeTransfer, EmployeeTransferDetail } from '../types'

/**
 * Step 8 — Employee Transfer History.
 *
 * The one tab with no Save button and no form of its own: the history is
 * append-only, so every write here is a deliberate act through a dialog. Which
 * actions a row offers follows from what the API allows —
 *
 * - **Transfer** and **Leave Service** need a posting that's still open, so they sit
 *   in the header and disappear once the employee has left.
 * - **Edit** appears on the *latest* posting only: the endpoint refuses a
 *   `service_id` from closed history, since correcting the past would rewrite what
 *   payroll already ran against.
 * - **Details** is available on every row, current or closed.
 */
export function TransferHistoryTab({
  employeeId,
  onContinue,
  onClose,
}: {
  employeeId: number
  onContinue: () => void
  onClose: () => void
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
                label="Edit posting"
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
            <Badge variant="success">Currently working</Badge>
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
  const transferType = tab.transfer.form.watch('transferType')

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormSection
          icon={ArrowRightLeft}
          title="Posting History"
          description="Every posting the employee has held, newest first"
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
            disabled={!tab.hasOpenPosting}
            onClick={tab.startTransfer}
          >
            <ArrowRightLeft className="size-4" />
            Transfer Employee
          </Button>
        </div>
      </div>

      {!tab.hasOpenPosting && !tab.isLoading && tab.rows.length > 0 && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          This employee has no open posting — they've left. Nothing further can be
          transferred or closed until a new posting exists.
        </p>
      )}

      <div className="mt-5">
        {tab.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tab.error instanceof Error
              ? tab.error.message
              : "Couldn't load the transfer history."}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={tab.rows}
            isLoading={tab.isLoading}
            itemName="postings"
            pageSize={5}
            pageSizeOptions={[5, 10, 25]}
            emptyState={
              <EmptyState
                icon={ArrowRightLeft}
                title="No postings yet"
                description="The first posting is created together with the employee in Basic Detail."
              />
            }
          />
        )}
      </div>

      <StepNavFooter onContinue={onContinue} onClose={onClose}>
        A transfer closes the open posting and opens a new one — the old row is kept
        as history, never overwritten.
      </StepNavFooter>

      {/* ── Transfer ────────────────────────────────────────────────────── */}

      <FormProvider {...tab.transfer.form}>
        <StepDialog
          open={tab.dialog === 'transfer'}
          onOpenChange={(open) => !open && tab.closeDialog()}
          title="Transfer Employee"
          description="One call closes the current posting and opens the new one, so the history survives."
          onSubmit={tab.transfer.onSubmit}
          isPending={tab.transfer.isPending}
          submitLabel="Transfer"
          size="wide"
        >
          <div className="sm:col-span-2">
            <FormSection
              icon={LogOut}
              title="Close the current posting"
              description="The leaving details recorded against the posting being left"
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
              title="The new posting"
              description="Where the employee goes next, and on what terms"
            />
          </div>

          <Field
            label="Transfer Type"
            required
            error={transferErrors.transferType?.message}
            hint="A company change moves the employee to another company on the account; a branch change keeps them here."
          >
            <Controller
              control={tab.transfer.form.control}
              name="transferType"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={TRANSFER_TYPE_OPTIONS}
                  placeholder="Select transfer type"
                />
              )}
            />
          </Field>

          {transferType === 'company' && (
            <Field
              label="New Company"
              required
              error={transferErrors.newCompanyId?.message}
            >
              <Controller
                control={tab.transfer.form.control}
                name="newCompanyId"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={tab.transfer.companyOptions}
                    placeholder={
                      tab.transfer.isCompaniesLoading ? 'Loading…' : 'Select company'
                    }
                    searchPlaceholder="Search company"
                  />
                )}
              />
            </Field>
          )}

          {/*
            A company transfer points at the destination company's own branches,
            departments and designations — so those lists can't be shown until the
            company is chosen.
          */}
          {tab.transfer.needsCompany ? (
            <p className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Choose the new company first — the branch, department and designation
              lists below belong to it, not to the company being left.
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
          description="Corrects the latest posting in place — nothing is closed and no history is added."
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
            <PostingSection options={tab.edit.options} showHeading={false} />
          )}
        </StepDialog>
      </FormProvider>

      {/* ── Leave service ───────────────────────────────────────────────── */}

      <StepDialog
        open={tab.dialog === 'leave'}
        onOpenChange={(open) => !open && tab.closeDialog()}
        title="Leave Service"
        description="Closes the open posting without opening another — the employee exits."
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Posting Detail</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.serviceDetail.companyName || 'Company'} · ${detail.serviceDetail.designationName || 'No designation'}`
              : 'The posting and the wage structure it was held under'}
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
                : "Couldn't load this posting's detail."}
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <FormSection
                  icon={Building2}
                  title="Assignment"
                  description="Where this posting sat"
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
                  description="The span of this posting"
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
                        : 'Still open'
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
                  description="Inherited from the designation this posting was held under"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
