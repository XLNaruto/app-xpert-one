import { Clock, RotateCcw } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { useDefaultShift } from '../hooks/use-default-shift'

interface DepartmentShiftTabProps {
  /** The company whose shift master the dropdown is picked from. */
  companyId?: number
  /**
   * The department being edited. A default is pinned to a department id, so the
   * tab is only mounted once the department has been saved.
   */
  departmentId: number
  /** The department's stored default, when the API sends one. */
  currentShiftId?: number | null
}

/**
 * The department screen's Shift tab — pick one of the company's shifts as this
 * department's default.
 *
 * The shifts themselves are created on the company screen; a department only
 * chooses among them. Its pick overrides the company's default for this
 * department's staff, and clearing it falls back to the company's — which is why
 * Clear is its own action rather than saving an empty selection.
 */
export function DepartmentShiftTab({
  companyId,
  departmentId,
  currentShiftId,
}: DepartmentShiftTabProps) {
  const {
    shiftId,
    setShiftId,
    options,
    isLoadingShifts,
    hasNoShifts,
    save,
    clear,
    isSaving,
    isClearing,
  } = useDefaultShift({ companyId, departmentId, currentShiftId })

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Clock}
        title="Department Shift"
        description="The shift this department's staff work by default"
        className="mt-0"
      />

      <Field
        label="Default Shift"
        hint="Overrides the company's default for this department. Employees who deviate still get their own assignment."
      >
        {/*
          A shift's label carries its window as well as its name, which the
          field's own width truncates — `panelMinWidth` lets the option list open
          wider than the control it hangs off.
        */}
        <Combobox
          className="w-full"
          value={shiftId}
          onChange={setShiftId}
          options={options}
          clearable
          panelMinWidth={320}
          placeholder={
            isLoadingShifts
              ? 'Loading…'
              : hasNoShifts
                ? 'No shifts in this company yet'
                : 'Select Shift'
          }
          searchPlaceholder="Search shift"
        />
      </Field>

      {hasNoShifts && !isLoadingShifts && (
        <p className="col-span-full text-sm text-muted-foreground">
          This company has no shifts yet — add them on the company's Shift tab
          first, then come back to pick one here.
        </p>
      )}

      <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
        {/*
          Clearing is its own write, not "save nothing": a department with no
          default falls back to the company's, which is a different outcome from
          leaving the current one in place.
        */}
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={isSaving || isClearing}
        >
          <RotateCcw className="size-4" />
          {isClearing ? 'Clearing…' : 'Clear Default'}
        </Button>
        <Button type="button" onClick={save} disabled={isSaving || isClearing}>
          {isSaving ? 'Saving…' : 'Save Shift'}
        </Button>
      </div>
    </div>
  )
}
