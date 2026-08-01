import { ArrowLeft, Save } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { OfficeAddressFormFields } from '../components/office-address-form-fields'
import { useOfficeAddressForm } from '../hooks/use-office-address-form'
import type { OfficeAddressScreen } from '../types'

interface OfficeAddressCreatePageProps {
  /** Which of the five screens this is — copy, routes and `office_for`. */
  screen: OfficeAddressScreen
  /**
   * Encrypted office address id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an office address. One screen for both: a `?data=` token edits the
 * record it carries, no token adds a new office under the screen's `office_for`.
 */
export function OfficeAddressCreatePage({
  screen,
  data,
}: OfficeAddressCreatePageProps) {
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
    state,
    district,
    hasState,
    changeState,
    isForbidden,
    forbiddenMessage,
  } = useOfficeAddressForm(screen, addressId)

  // Reading this record was refused — show the 403 screen, not an empty form.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title={`${isEdit ? 'Edit' : 'Add'} ${screen.shortLabel}`}
        description={`Configure ${screen.officeFor} office address details.`}
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
                : `Couldn't load this ${screen.shortLabel}.`}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <OfficeAddressFormFields
                register={register}
                control={control}
                errors={errors}
                state={state}
                district={district}
                hasState={hasState}
                changeState={changeState}
                officeLabel={screen.officeFor}
                showOfficeType={screen.hasOfficeType}
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
