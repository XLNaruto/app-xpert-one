import { ArrowLeft, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { LwfRateFormFields } from '../components/lwf-rate-form-fields'
import { useLwfRateForm } from '../hooks/use-lwf-rate-form'

interface LwfRateCreatePageProps {
  /**
   * Encrypted LWF rate id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an LWF rate. One screen for both: a `?data=` token edits the rate
 * it carries, no token adds a new one effective from its W.E.F date.
 */
export function LwfRateCreatePage({ data }: LwfRateCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const lwfRateId = decryptId(data)

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
    stateOptions,
    isStatesLoading,
    isForbidden,
    forbiddenMessage,
  } = useLwfRateForm(lwfRateId)

  // Reading this rate was refused — show the 403 screen, not an empty form.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit LWF Rate' : 'Add LWF Rate'}
        description={
          isEdit
            ? 'Update this Labour Welfare Fund contribution'
            : 'Configure Labour Welfare Fund rate details'
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this LWF rate."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <LwfRateFormFields
                register={register}
                control={control}
                errors={errors}
                stateOptions={stateOptions}
                isStatesLoading={isStatesLoading}
              />

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
    </div>
  )
}
