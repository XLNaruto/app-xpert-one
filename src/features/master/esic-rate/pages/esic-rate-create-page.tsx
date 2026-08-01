import { ArrowLeft, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EsicRateFormFields } from '../components/esic-rate-form-fields'
import { useEsicRateForm } from '../hooks/use-esic-rate-form'

interface EsicRateCreatePageProps {
  /**
   * Encrypted ESIC rate id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an ESIC rate slab. One screen for both: a `?data=` token edits
 * the slab it carries, no token adds a new one that takes effect from its
 * W.E.F date.
 */
export function EsicRateCreatePage({ data }: EsicRateCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const esicRateId = decryptId(data)

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
  } = useEsicRateForm(esicRateId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit ESIC Rate' : 'Add ESIC Rate'}
        description={
          isEdit
            ? 'Update this ESIC rate slab'
            : 'Configure a new ESIC rate slab'
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
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this ESIC rate."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <EsicRateFormFields
                register={register}
                control={control}
                errors={errors}
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
