import { CalendarDays } from 'lucide-react'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { FormSection } from '@/components/common/form-section'
import {
  useDesignationLeaveQuotas,
  useSaveDesignationLeaveQuotas,
} from '../api/use-leave-quotas'
import { useLeaveQuotaGrid } from '../hooks/use-leave-quota-grid'
import { LeaveQuotaGrid } from './leave-quota-grid'

/**
 * The designation's paid-leave allowance — **the normal home of an allowance.**
 *
 * Set once here and it applies to everyone in the role, with no year attached. An
 * employee only needs their own grid when they are an exception for one year.
 *
 * This is the SAVED designation's tab: it reads and writes
 * `/user/designations/:id/leave-quotas`, so it saves on its own button,
 * independently of the name on the Basic Info tab. The create form shows the same
 * grid as a DRAFT instead — see `DraftLeaveQuotaTab` — because there is no `:id`
 * to write to until the designation exists.
 *
 * Gated on `designations:read` / `designations:update`, not on `leaves:*`: this is
 * the designation's own policy, and it is the designation the user is editing.
 */
export function DesignationLeaveQuotaTab({ designationId }: { designationId: number }) {
  const { canView, canUpdate } = useResourceAccess(PERMISSIONS.designations)

  const quotas = useDesignationLeaveQuotas(designationId)
  const saveQuotas = useSaveDesignationLeaveQuotas(designationId)

  const grid = useLeaveQuotaGrid({
    items: quotas.data?.items,
    scope: designationId,
    save: (rows, handlers) => saveQuotas.mutate(rows, handlers),
    isSaving: saveQuotas.isPending,
    canUpdate,
  })

  if (!canView || isForbiddenError(quotas.error)) {
    return <Forbidden description={getApiErrorMessage(quotas.error)} />
  }

  if (quotas.isError) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(quotas.error, "Couldn't load the leave allowances.")}
      </p>
    )
  }

  return (
    <div>
      <FormSection
        icon={CalendarDays}
        title="Leave Allowance"
        description="Paid days per year for each leave type — the standing policy for everyone in this designation"
        className="mt-0"
      />

      <div className="mt-5">
        <LeaveQuotaGrid
          rows={quotas.data?.items ?? []}
          grid={grid}
          isLoading={quotas.isLoading}
          footerNote={
            'Days beyond the allowance are unpaid, without limit — running out never refuses a leave. Leave a box empty to set nothing; a typed 0 is different, it stores "no paid days of this type". Saving replaces the whole grid.'
          }
        />
      </div>
    </div>
  )
}
