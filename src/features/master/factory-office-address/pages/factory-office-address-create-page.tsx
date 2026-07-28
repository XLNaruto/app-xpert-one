import { ArrowLeft, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FactoryOfficeAddressFormFields } from '../components/factory-office-address-form-fields'
import { useFactoryOfficeAddressForm } from '../hooks/use-factory-office-address-form'

interface FactoryOfficeAddressCreatePageProps {
  /**
   * Encrypted factory office address id from the `?data=` search param. When
   * present the page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an factory office address. One screen for both: a `?data=` token
 * edits the record it carries, no token adds a new office.
 */
export function FactoryOfficeAddressCreatePage({ data }: FactoryOfficeAddressCreatePageProps) {
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
  } = useFactoryOfficeAddressForm(addressId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Factory Address' : 'Add Factory Address'}
        description="Configure factory office address details."
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
                : "Couldn't load this factory office address."}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <FactoryOfficeAddressFormFields
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
