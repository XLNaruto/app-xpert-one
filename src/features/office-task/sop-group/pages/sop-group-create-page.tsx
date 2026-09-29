import { ArrowLeft, ArrowRight, ClipboardList, Trash2, Users } from 'lucide-react'
import { decryptId, decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ScopedDataError } from '@/features/company'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SopGroupTab } from '../constants'

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
import { useSopGroupForm } from '../hooks/use-sop-group-form'
import { GroupDetailsTab } from '../components/group-details-tab'
import { AssignEmployeesTab } from '../components/assign-employees-tab'

/**
 * Add / Edit SOP Group — Tab 1 the group and its checklist, Tab 2 the employees
 * who run it. `?data=` carries `{ id }` to edit, plus `tab: 'assign'` to open
 * straight on Tab 2.
 */
export function SopGroupCreatePage({ data }: { data?: string }) {
  const groupId = decryptId(data)
  const initialTab: SopGroupTab =
    data && decryptParams<{ tab?: string }>(data)?.tab === 'assign' ? 'assign' : 'group'
  const f = useSopGroupForm(groupId, initialTab)

  return (
    <div>
      <PageHeader
        title={f.isEdit ? 'Edit SOP Group' : 'Add SOP Group'}
        description="The checklist, then the employees who run it every day."
        actions={
          <Button variant="outline" onClick={f.goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {f.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : f.isError ? (
            <ScopedDataError error={f.error} fallback="This SOP group could not be found." what="SOP groups" />
          ) : (
            <form onSubmit={f.onSubmit} noValidate>
              <Tabs value={f.tab} onValueChange={(v) => f.changeTab(v as SopGroupTab)}>
                <TabsList>
                  <TabsTrigger value="group">
                    <ClipboardList className="mr-1.5 size-4" />
                    1. Group Details
                  </TabsTrigger>
                  <TabsTrigger value="assign">
                    <Users className="mr-1.5 size-4" />
                    2. Assign Employees
                    {f.assignees.fields.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {f.assignees.fields.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Each tab re-reads its own API when opened — skeleton while it does. */}
                <TabsContent value="group" className="pt-2">
                  {f.tabLoading ? <TabSkeleton /> : <GroupDetailsTab f={f} />}
                </TabsContent>
                <TabsContent value="assign" className="pt-2">
                  {f.tabLoading ? <TabSkeleton /> : <AssignEmployeesTab f={f} />}
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  {f.tab === 'group'
                    ? 'Saves the group and its checklist, then moves on to assigning employees.'
                    : f.newAssignees > 0
                      ? `Saving assigns this group to ${f.newAssignees} new employee${f.newAssignees === 1 ? '' : 's'}.`
                      : 'The group is saved. Pick employees now, or come back and assign them later.'}
                </p>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={f.goToList} disabled={f.isPending}>
                    Cancel
                  </Button>
                  {/*
                    Every footer button has its own key: without one, React reuses
                    the "Next" <button> as the "Save" submit button on the next tab,
                    and the click that switched tabs then submits the form.
                  */}
                  {f.tab === 'group' ? (
                    f.canSave && (
                      <Button key="save-next" type="submit" disabled={f.isPending || f.tabLoading}>
                        {f.isPending ? 'Saving…' : 'Save & Next'}
                        {!f.isPending && <ArrowRight className="size-4" />}
                      </Button>
                    )
                  ) : (
                    <>
                      <Button
                        key="back"
                        type="button"
                        variant="outline"
                        onClick={() => void f.openGroupTab()}
                        disabled={f.isPending}
                      >
                        <ArrowLeft className="size-4" />
                        Group Details
                      </Button>
                      {f.canSave && (
                        <Button key="save-assign" type="submit" disabled={f.isPending || f.tabLoading}>
                          {f.isPending ? 'Saving…' : f.newAssignees > 0 ? 'Save & Assign' : 'Save'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={f.removal !== null}
        onOpenChange={(open) => !open && f.cancelRemoval()}
        variant="destructive"
        icon={Trash2}
        title={
          f.removal?.kind === 'item'
            ? 'Remove this checklist task?'
            : f.removal?.kind === 'assignee'
              ? 'Remove this employee?'
              : 'Remove this custom task?'
        }
        description={
          f.removal?.kind === 'item'
            ? `"${f.removal.label}" is removed from the group now. Employees already running it keep their own copy.`
            : f.removal?.kind === 'assignee'
              ? `${f.removal.label} is taken off this group now, with their tasks — as if they were never assigned.`
              : f.removal
                ? `"${f.removal.label}" is removed now, with the runs it hasn't started.`
                : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={f.isRemoving}
        keepOpenOnConfirm
        onConfirm={f.confirmRemoval}
      />
    </div>
  )
}
