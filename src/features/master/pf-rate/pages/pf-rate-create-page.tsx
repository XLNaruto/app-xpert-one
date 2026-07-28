import { ArrowLeft, History, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PfRateFormFields } from '../components/pf-rate-form-fields'
import { PfRateHistoryTable } from '../components/pf-rate-history-table'
import { usePfRateForm } from '../hooks/use-pf-rate-form'

interface PfRateCreatePageProps {
  /**
   * Encrypted PF rate id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit a PF rate slab, with the rate history below the form. One screen
 * for both: a `?data=` token edits the slab it carries, no token adds a new one
 * that takes effect from its W.E.F date.
 */
export function PfRateCreatePage({ data }: PfRateCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const pfRateId = decryptId(data)

  const {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    goToList,
    historyRows,
    isHistoryLoading,
  } = usePfRateForm(pfRateId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit PF Rate' : 'Add PF Rate'}
        description={
          isEdit
            ? 'Update this Provident Fund rate slab'
            : 'Configure a new Provident Fund rate slab'
        }
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this PF rate."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <PfRateFormFields register={register} control={control} errors={errors} />

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
                  <Save className="size-4" />
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Settings'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">PF Rate History</h2>
        </div>
        <PfRateHistoryTable rows={historyRows} isLoading={isHistoryLoading} />
      </section>
    </div>
  )
}
