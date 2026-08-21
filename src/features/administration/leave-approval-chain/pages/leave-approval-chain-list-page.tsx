import { useState } from 'react'
import { Building2, Info, ListOrdered, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import { getApiErrorMessage } from '@/lib/api-error'
import { useLeaveApprovalChainList } from '../hooks/use-leave-approval-chain-list'
import { ApprovalChainLevelRow } from '../components/approval-chain-level-row'

/**
 * Hierarchy Management → Leave — the account's one leave approval chain.
 *
 * The owner authors an ordered list of ROLE NAMES (HR → Manager → Team Leader)
 * and EVERY company of the account follows it. There is nothing to set up per
 * company; that is the whole point of an account-level chain, and it is why the
 * levels name roles by NAME rather than by id — roles are company-scoped, so one
 * account legitimately holds three separate "HR Manager" rows and only the name
 * is shared between them.
 *
 * For a given leave the approver is the FIRST level with a live user who can
 * REACH that employee's company; if no level has one, the leave falls to the
 * ACCOUNT OWNER, the chain's implicit last link.
 *
 * AN EMPTY CHAIN IS THE OFF SWITCH — with nothing configured the account behaves
 * exactly as it did before this feature existed, and anyone holding
 * `leaves:update` may decide any leave. The screen says so rather than showing a
 * blank list, because "nothing here" is a working configuration, not a gap.
 */
export function LeaveApprovalChainListPage() {
  const chain = useLeaveApprovalChainList()
  /** Which row is being dragged, so the list can dim it and drop onto a target. */
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  if (chain.isForbidden) return <Forbidden description={chain.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Leave Approval Hierarchy"
        description="One ordered chain of roles that every company of the account follows."
        actions={
          chain.canUpdate && (
            <div className="flex items-center gap-2">
              {chain.isDirty && (
                <Button
                  variant="outline"
                  onClick={chain.resetDraft}
                  disabled={chain.isSaving}
                >
                  Discard Changes
                </Button>
              )}
              <Button onClick={chain.onSave} disabled={!chain.isDirty || chain.isSaving}>
                {chain.isSaving ? 'Saving…' : 'Save Chain'}
              </Button>
            </div>
          )
        }
      />

      {chain.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getApiErrorMessage(chain.error, "Couldn't load the leave approval chain.")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      The Order of Authority
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      The top level decides. The one below it decides only when the
                      level above has nobody who can reach that employee's company.
                    </p>
                  </div>
                </div>

                {/*
                  A role may appear only once — the API answers a 400 otherwise —
                  so a name already in the chain is off the picker rather than
                  offered and then refused.
                */}
                {chain.canUpdate && (
                  <Combobox
                    className="w-56"
                    value=""
                    onChange={chain.addLevel}
                    options={chain.availableRoleNames.map((name) => ({
                      label: name,
                      value: name,
                    }))}
                    placeholder={
                      chain.isRoleNamesLoading ? 'Loading…' : 'Add a level…'
                    }
                    searchPlaceholder="Search roles"
                  />
                )}
              </div>

              <div className="mt-5">
                {chain.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : chain.order.length === 0 ? (
                  <EmptyState
                    icon={Plus}
                    title="Leave routing is off"
                    description="With no chain configured, anyone who may decide leave can decide any leave — exactly as before this screen existed. Add a level to start routing."
                  />
                ) : (
                  <ul className="space-y-2">
                    {chain.order.map((roleName, index) => (
                      <ApprovalChainLevelRow
                        key={roleName}
                        index={index}
                        roleName={roleName}
                        level={chain.coverage.get(roleName)}
                        companyCount={chain.companyCount}
                        total={chain.order.length}
                        canUpdate={chain.canUpdate}
                        isDragging={dragIndex === index}
                        onMove={chain.moveLevel}
                        onRemove={() => chain.removeLevel(index)}
                        dragHandlers={{
                          draggable: chain.canUpdate,
                          onDragStart: () => setDragIndex(index),
                          onDragOver: (event) => event.preventDefault(),
                          onDrop: () => {
                            if (dragIndex !== null) chain.moveLevel(dragIndex, index)
                            setDragIndex(null)
                          },
                          onDragEnd: () => setDragIndex(null),
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {/*
                The owner is not a level anybody adds — they are where the chain
                ends when nothing above answered, so they are drawn as the tail of
                the list rather than as a row that can be moved or removed.
              */}
              {chain.order.length > 0 && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    ↓
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      The account owner
                    </span>{' '}
                    — the chain's implicit last link, for any company no level above
                    reaches.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="size-4 text-primary" />
                  Coverage
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {chain.companyCount} compan
                  {chain.companyCount === 1 ? 'y' : 'ies'} in this account.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Waiting on the owner
                </p>
                {chain.companiesWithOwner.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Every company is covered by a level of the chain.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chain.companiesWithOwner.map((company) => (
                        <Badge key={company.id} variant="warning">
                          {company.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      No level of the chain reaches these companies, so only the
                      account owner can clear their leave.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    <strong className="font-medium text-foreground">
                      Visibility is not routing.
                    </strong>{' '}
                    The chain decides who may APPROVE a leave, never who may look at
                    one — the leave register goes on showing every company's rows as
                    before.
                  </span>
                </p>
              </div>

              {!chain.canUpdate && (
                <p className="text-xs text-muted-foreground">
                  Only the account owner can change the chain. Whoever edits it
                  chooses who approves leave, so the right isn't grantable to a role.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
