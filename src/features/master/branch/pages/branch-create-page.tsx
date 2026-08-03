import { ArrowLeft, Building2, Lock, Scale } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Forbidden } from '@/features/error'
import { BranchDetailTab } from '../components/branch-detail-tab'
import { BranchActsTab } from '../components/branch-acts-tab'
import { useBranchForm, type BranchFormTab } from '../hooks/use-branch-form'

interface BranchCreatePageProps {
  /**
   * Encrypted branch id from the `?data=` search param. When present the page
   * switches to edit mode (GET to seed, PATCH to save); otherwise it's a fresh
   * create. The same page and form handle both.
   */
  data?: string
}

/**
 * Create/edit a branch record. One screen for both: a `?data=` token edits the
 * record it carries (hydrates the form + updates on submit), no token creates a
 * new one under the active company. Both tabs sit inside a single form, so one
 * submit saves the branch detail and every applicable act together.
 */
export function BranchCreatePage({ data }: BranchCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const branchId = decryptId(data)

  const {
    register,
    control,
    errors,
    tab,
    selectTab,
    canEditActs,
    state,
    district,
    hasState,
    changeState,
    actStateOptions,
    pt,
    pfOfficeOptions,
    esicOfficeOptions,
    factoryOfficeOptions,
    lwfOfficeOptions,
    exOfficeOptions,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    isForbidden,
    forbiddenMessage,
    goToList,
  } = useBranchForm(branchId)

  // Reading this record was refused — show the 403 screen, not a broken form.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Branch' : 'Add New Branch'}
        description={isEdit ? 'Update this branch record' : 'Create a new branch record'}
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
                : "Couldn't load this branch."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <Tabs
                value={tab}
                onValueChange={(value) => selectTab(value as BranchFormTab)}
              >
                <TabsList>
                  <TabsTrigger value="detail">
                    <Building2 className="mr-1.5 size-4" />
                    Step 1 · Branch Detail
                  </TabsTrigger>
                  {/*
                    Step two writes a row keyed by branch id, so it stays shut
                    until step one has been saved. Locked rather than `disabled`:
                    a disabled trigger swallows the click, and a click that says
                    nothing is worse than one that says why.
                  */}
                  <TabsTrigger
                    value="acts"
                    className={canEditActs ? undefined : 'text-muted-foreground'}
                  >
                    {canEditActs ? (
                      <Scale className="mr-1.5 size-4" />
                    ) : (
                      <Lock className="mr-1.5 size-4" />
                    )}
                    Step 2 · Applicable Acts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detail">
                  <BranchDetailTab
                    register={register}
                    control={control}
                    errors={errors}
                    state={state}
                    district={district}
                    hasState={hasState}
                    changeState={changeState}
                  />
                </TabsContent>

                <TabsContent value="acts">
                  <BranchActsTab
                    register={register}
                    control={control}
                    errors={errors}
                    stateOptions={actStateOptions}
                    pt={pt}
                    pfOfficeOptions={pfOfficeOptions}
                    esicOfficeOptions={esicOfficeOptions}
                    factoryOfficeOptions={factoryOfficeOptions}
                    lwfOfficeOptions={lwfOfficeOptions}
                    exOfficeOptions={exOfficeOptions}
                  />
                </TabsContent>
              </Tabs>

              {/*
                Actions — shared by both tabs. Step one saves the branch and
                opens step two; from then on one submit saves the branch and its
                acts together.
              */}
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
                  {isPending
                    ? 'Saving…'
                    : isEdit
                      ? 'Save Changes'
                      : 'Save & Continue'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
