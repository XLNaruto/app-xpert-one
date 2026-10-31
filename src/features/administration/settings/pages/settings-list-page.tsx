import { useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, CalendarClock, ClipboardCheck, FolderKanban, History, Info, ListFilter } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import {
  SETTING_CHANGE_STATUS_FILTERS,
  SETTING_CHANGE_STATUS_META,
  SETTING_KEY_FILTERS,
  SETTING_KEY_LABELS,
} from '../constants'
import { useCompanySettingsForm } from '../hooks/use-company-settings-form'
import { useSettingChangeHistory } from '../hooks/use-setting-change-history'
import { useSettingChangeWithdraw } from '../hooks/use-setting-change-withdraw'
import { SubmissionModePicker } from '../components/submission-mode-picker'
import { ScheduledChangeNotice } from '../components/scheduled-change-notice'
import { EffectiveFromField } from '../components/effective-from-field'
import { submissionModeLabel } from '../lib/company-settings-mappers'
import { formatIst } from '../lib/ist'
import type { SettingChange, SettingChangeHistoryItem } from '../types'

type SettingsTab = 'settings' | 'history'

/**
 * Administration → Settings — the active company's behaviour switches. Today
 * that's how SOP and project tasks are handed in: timed (Start / Stop, then
 * submit) or direct. A change is BOOKED for an effective date at least 7 days
 * ahead; the History tab lists every booking and what became of it.
 */
export function SettingsListPage() {
  const settings = useCompanySettingsForm()
  const withdraw = useSettingChangeWithdraw()
  const [tab, setTab] = useState<SettingsTab>('settings')
  const { control } = settings.form
  const scheduled = settings.settings?.scheduled ?? {}
  const busy = settings.isSaving || withdraw.isWithdrawing

  if (settings.isForbidden) return <Forbidden description={settings.forbiddenMessage} />

  // Shown in the header and again under the form, so Save is in reach either way.
  const saveActions = settings.canUpdate && settings.companyId !== null && (
    <div className="flex items-center gap-2">
      {settings.isDirty && (
        <Button variant="outline" onClick={settings.discard} disabled={busy}>
          Discard Changes
        </Button>
      )}
      <Button
        onClick={settings.onSubmit}
        disabled={!settings.isDirty || !!settings.effectiveError || busy}
      >
        {settings.isSaving ? 'Scheduling…' : 'Schedule Change'}
      </Button>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Settings"
        description="How This Company's Employees Work — Changes Are Scheduled Ahead, Never Applied on the Spot."
        actions={tab === 'settings' && saveActions}
      />

      {settings.companyId === null ? (
        <CompanyRequired what="the company's settings" />
      ) : settings.isError ? (
        <ScopedDataError
          error={settings.error}
          fallback="Couldn't load the settings."
          what="the settings"
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardContent className="space-y-6 pt-6">
                {settings.canUpdate && (
                  <section>
                    <FormSection
                      icon={CalendarClock}
                      title="When It Takes Effect"
                      description="Nothing Changes Until This Date and Time"
                      className="mt-0"
                    />
                    <div className="mt-4 max-w-xl">
                      {settings.isLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <EffectiveFromField
                          control={control}
                          earliest={settings.earliestEffectiveFrom}
                          error={settings.effectiveError}
                          disabled={busy}
                        />
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <FormSection
                    icon={ClipboardCheck}
                    title="SOP Task Submission"
                    description="How Employees Hand In Their Daily SOP Tasks"
                    // First in the card when the effective-from section is hidden.
                    className={settings.canUpdate ? undefined : 'mt-0'}
                  />
                  <div className="mt-4">
                    {settings.isLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <>
                        <Controller
                          control={control}
                          name="sopTaskSubmission"
                          render={({ field }) => (
                            <SubmissionModePicker
                              name="SOP task submission"
                              value={field.value}
                              onChange={field.onChange}
                              disabled={!settings.canUpdate || busy}
                            />
                          )}
                        />
                        {scheduled.sop_task_submission && (
                          <ScheduledChangeNotice
                            change={scheduled.sop_task_submission}
                            onWithdraw={
                              settings.canUpdate
                                ? () => withdraw.request(scheduled.sop_task_submission!)
                                : undefined
                            }
                            disabled={busy}
                          />
                        )}
                      </>
                    )}
                  </div>
                </section>

                <section>
                  <FormSection
                    icon={FolderKanban}
                    title="Project Task Submission"
                    description="How Employees Record Progress and Hand In Project Tasks"
                  />
                  <div className="mt-4">
                    {settings.isLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <>
                        <Controller
                          control={control}
                          name="projectTaskSubmission"
                          render={({ field }) => (
                            <SubmissionModePicker
                              name="Project task submission"
                              value={field.value}
                              onChange={field.onChange}
                              disabled={!settings.canUpdate || busy}
                            />
                          )}
                        />
                        {scheduled.project_task_submission && (
                          <ScheduledChangeNotice
                            change={scheduled.project_task_submission}
                            onWithdraw={
                              settings.canUpdate
                                ? () => withdraw.request(scheduled.project_task_submission!)
                                : undefined
                            }
                            disabled={busy}
                          />
                        )}
                      </>
                    )}
                  </div>
                </section>

                <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>
                      <strong className="font-medium text-foreground">
                        Changes are scheduled, not applied right away.
                      </strong>{' '}
                      A change takes effect at the date and time you pick — at least 7 days
                      ahead, counting today. At that moment, switching to direct submission
                      stops every running clock, and the time worked up to then is kept.
                      After that, Start is refused and employees submit their tasks directly.
                      Proof, note and approval rules stay as they are.
                    </span>
                  </p>
                </div>

                {!settings.canUpdate && (
                  <p className="text-xs text-muted-foreground">
                    You can view these settings but not change them.
                  </p>
                )}

                {saveActions && (
                  <div className="flex justify-end border-t border-border pt-4">{saveActions}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <SettingsHistoryTab
              onWithdraw={settings.canUpdate ? withdraw.request : undefined}
              withdrawing={withdraw.isWithdrawing}
            />
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={withdraw.pending !== null}
        onOpenChange={(open) => !open && withdraw.cancel()}
        variant="destructive"
        icon={CalendarClock}
        title="Withdraw Scheduled Change?"
        description={
          withdraw.pending
            ? `${SETTING_KEY_LABELS[withdraw.pending.settingKey]} will stay ${submissionModeLabel(
                withdraw.pending.previousValue,
              )} instead of changing to ${submissionModeLabel(
                withdraw.pending.value,
              )} on ${formatIst(withdraw.pending.effectiveFrom)}.`
            : undefined
        }
        confirmLabel="Withdraw"
        cancelLabel="Cancel"
        loading={withdraw.isWithdrawing}
        keepOpenOnConfirm
        onConfirm={withdraw.confirm}
      />
    </div>
  )
}

/** The History tab — every booked change, newest effective date first. */
function SettingsHistoryTab({
  onWithdraw,
  withdrawing,
}: {
  /** Omitted when the user can't withdraw. */
  onWithdraw?: (change: SettingChange) => void
  withdrawing: boolean
}) {
  const history = useSettingChangeHistory()

  // The endpoint has a fixed order and no `sort`, so no column is sortable.
  const columns = useMemo<ColumnDef<SettingChangeHistoryItem>[]>(
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
      ...(onWithdraw
        ? ([
            {
              id: 'actions',
              header: () => <span className="text-xs font-medium uppercase">Actions</span>,
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              cell: ({ row }) =>
                row.original.status === 'SCHEDULED' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdrawing}
                    onClick={() => onWithdraw(row.original)}
                  >
                    Withdraw
                  </Button>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                ),
            },
          ] satisfies ColumnDef<SettingChangeHistoryItem>[])
        : []),
      {
        id: 'setting_key',
        header: 'Setting',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {SETTING_KEY_LABELS[row.original.settingKey]}
          </span>
        ),
      },
      {
        id: 'change',
        header: 'Change',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">
              {submissionModeLabel(row.original.previousValue)}
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {submissionModeLabel(row.original.value)}
            </span>
          </span>
        ),
      },
      {
        // For an APPLIED row this is the moment it took effect — `applied_at`
        // is only when the server recorded it.
        id: 'effective_from',
        header: 'Effective',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatIst(row.original.effectiveFrom),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const meta = SETTING_CHANGE_STATUS_META[row.original.status]
          return (
            <Badge variant={meta.variant} className={meta.className}>
              {meta.label}
            </Badge>
          )
        },
      },
      {
        id: 'created_by_name',
        header: 'Changed By',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.createdByName ?? 'N/A',
      },
      {
        id: 'created_at',
        header: 'Changed On',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatIst(row.original.createdAt),
      },
    ],
    [onWithdraw, withdrawing],
  )

  if (history.isError) {
    return (
      <ScopedDataError
        error={history.error}
        fallback="Couldn't load the settings history."
        what="the settings history"
      />
    )
  }

  return (
    <DataTable
      columns={columns}
      data={history.rows}
      isLoading={history.isLoading}
      itemName="changes"
      pageSizeOptions={[5, 10, 25, 50]}
      serverPagination
      limit={history.limit}
      offset={history.offset}
      total={history.total}
      onPaginationChange={history.onPaginationChange}
      toolbar={
        <FilterBar
          search={{ value: history.search, onChange: history.setSearch, placeholder: 'Search…' }}
          facets={[
            {
              key: 'setting_key',
              label: 'Setting',
              icon: ListFilter,
              value: history.settingKeyFilter,
              onChange: history.changeSettingKeyFilter,
              options: SETTING_KEY_FILTERS,
              clearValue: '',
            },
            {
              key: 'status',
              label: 'Status',
              icon: ListFilter,
              value: history.statusFilter,
              onChange: history.changeStatusFilter,
              options: SETTING_CHANGE_STATUS_FILTERS,
              clearValue: '',
            },
          ]}
          onReset={history.resetFilters}
        />
      }
      emptyState={
        history.search.trim() ? (
          <EmptyState
            icon={History}
            title="No Matching Changes"
            description="Try a Different Search Term."
          />
        ) : (
          <EmptyState
            icon={History}
            title="No Changes Yet"
            description="Every Change You Schedule Is Listed Here, with What Became of It."
          />
        )
      }
    />
  )
}
