import { CalendarOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/common/form-field'
import { WEEKOFF_DEFAULT_SCOPES } from '../constants'
import type { WeekoffDefaultLevel } from '../hooks/use-weekoff-policy-default'
import type { useWeekoffPolicyDefault } from '../hooks/use-weekoff-policy-default'

/**
 * Pin one policy as the default week-off pattern — for the whole company, or for
 * one department.
 *
 * Both levels live in one dialog because the endpoint is one call with one of two
 * ids, and a department's default simply outranks its company's. Clear sits beside
 * Save rather than being a saved empty value: clearing a department hands it back
 * to the company's pattern, and clearing a company leaves its shifts on the
 * platform's Sunday-only constant — outcomes, not absences.
 */
export function WeekoffDefaultDialog({
  pin,
}: {
  pin: ReturnType<typeof useWeekoffPolicyDefault>
}) {
  const policy = pin.pinning

  return (
    <Dialog
      open={policy !== null}
      onOpenChange={(open) => !open && pin.closePinning()}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set as default week-off pattern</DialogTitle>
          <DialogDescription>
            {policy
              ? `"${policy.name}" becomes the pattern every shift falls back to at the level you pick.`
              : undefined}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Field
            label="Apply to"
            required
            hint="A department's default wins over its company's, so a department pick only affects that department's staff."
          >
            <Combobox
              className="w-full"
              searchable={false}
              value={pin.level}
              onChange={(value) => pin.setLevel(value as WeekoffDefaultLevel)}
              options={WEEKOFF_DEFAULT_SCOPES}
              placeholder="Select level"
            />
          </Field>

          {pin.level === 'company' ? (
            <Field label="Company" required>
              <Combobox
                className="w-full"
                value={pin.companyId}
                onChange={pin.setCompanyId}
                options={pin.companySelectOptions}
                placeholder={
                  pin.isCompaniesLoading ? 'Loading…' : 'Select company'
                }
                searchPlaceholder="Search company"
              />
            </Field>
          ) : (
            <Field label="Department" required>
              <Combobox
                className="w-full"
                value={pin.departmentId}
                onChange={pin.setDepartmentId}
                options={pin.departmentSelectOptions}
                placeholder={
                  pin.isDepartmentsLoading ? 'Loading…' : 'Select department'
                }
                searchPlaceholder="Search department"
              />
            </Field>
          )}

          {/*
            Nothing reads back the stored default today — neither the company nor
            the department response carries it — so the dialog states the write
            rather than pretending to show what's currently pinned.
          */}
          <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <CalendarOff className="mr-1 inline size-3.5" />
            A shift that names its own week-off policy keeps it. This default only
            answers for the shifts that don't.
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={pin.clear}
            disabled={pin.isSaving || pin.isClearing}
          >
            <RotateCcw className="size-4" />
            {pin.isClearing ? 'Clearing…' : 'Clear Default'}
          </Button>
          <Button
            type="button"
            onClick={pin.save}
            disabled={pin.isSaving || pin.isClearing}
          >
            {pin.isSaving ? 'Saving…' : 'Set Default'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
