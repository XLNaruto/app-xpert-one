import { ArrowLeft, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LwfOfficeAddressFormFields } from '../components/lwf-office-address-form-fields'
import { useLwfOfficeAddressForm } from '../hooks/use-lwf-office-address-form'

interface LwfOfficeAddressCreatePageProps {
  /**
   * Encrypted LWF office address id from the `?data=` search param. When
   * present the page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an LWF office address. One screen for both: a `?data=` token
 * edits the record it carries, no token adds a new office.
 */
export function LwfOfficeAddressCreatePage({ data }: LwfOfficeAddressCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const addressId = decryptId(data)

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
    districtOptions,
    isDistrictsLoading,
    hasState,
    changeState,
  } = useLwfOfficeAddressForm(addressId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit LWF Address' : 'Add LWF Address'}
        description="Configure LWF office address details."
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
                : "Couldn't load this LWF office address."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <LwfOfficeAddressFormFields
                register={register}
                control={control}
                errors={errors}
                stateOptions={stateOptions}
                isStatesLoading={isStatesLoading}
                districtOptions={districtOptions}
                isDistrictsLoading={isDistrictsLoading}
                hasState={hasState}
                changeState={changeState}
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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
