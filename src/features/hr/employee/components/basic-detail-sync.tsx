import { useEffect, useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { deriveRenewalDate } from '../lib/employee-dates'
import { PERMANENT_EMPLOYMENT_TYPE } from '../constants'
import type { EmployeeBasicFormValues } from '../schemas'

/**
 * The two field-derivations step 1 runs while it's being filled, each as its own
 * headless component rendering nothing.
 *
 * They live here rather than in `useEmployeeBasicForm` for one reason: a
 * `useWatch` re-renders the component that calls it, and the hook is called by
 * the 500-line tab. Watching the nine current-address fields and the four
 * contract fields up there meant every keystroke in any of them re-rendered
 * every control on the step — the address blocks, both geography comboboxes, the
 * posting section, the lot — which is what made typing lag. Down here the
 * re-render is a component that returns `null`.
 */

/**
 * While "same as current" is on, the permanent block is hidden and mirrored from
 * the current one — the API stores both address sets, so the copy has to be real
 * values rather than a flag. Turning it off leaves what was copied in place: the
 * user's next act is to correct it, not to retype it from nothing.
 */
export function SameAsCurrentMirror() {
  const { control, getValues, setValue } = useFormContext<EmployeeBasicFormValues>()

  const sameAsCurrent = useWatch({ control, name: 'sameAsCurrent' })
  const currentAddress = useWatch({
    control,
    name: [
      'currentAddress1',
      'currentAddress2',
      'currentAddress3',
      'currentCountry',
      'currentStateId',
      'currentDistrictId',
      'currentTaluka',
      'currentCity',
      'currentPinCode',
    ],
  })

  useEffect(() => {
    if (!sameAsCurrent) return

    // Each field is only written when it actually differs. `useWatch` on a list
    // of names hands back a fresh array every render, so an unconditional
    // `setValue` here would notify the permanent block's own subscribers,
    // re-render, and run this again — a loop.
    const mirror: [keyof EmployeeBasicFormValues, string][] = [
      ['permanentAddress1', currentAddress[0]],
      ['permanentAddress2', currentAddress[1]],
      ['permanentAddress3', currentAddress[2]],
      ['permanentCountry', currentAddress[3]],
      ['permanentStateId', currentAddress[4]],
      ['permanentDistrictId', currentAddress[5]],
      ['permanentTaluka', currentAddress[6]],
      ['permanentCity', currentAddress[7]],
      ['permanentPinCode', currentAddress[8]],
    ]

    for (const [name, value] of mirror) {
      if (getValues(name) !== value) setValue(name, value)
    }
    // `currentAddress` is a new array each render — the primitives inside it are
    // what actually change, and the guard above makes a repeat run a no-op.
  }, [sameAsCurrent, currentAddress, getValues, setValue])

  return null
}

/**
 * Confirmation defaults to the joining date, and renewal follows from the
 * contract's start and length.
 *
 * Confirmation tracks joining until the user gives it a date of its own — most
 * employees are confirmed on the day they start, and the schema requires it to
 * be on or after joining either way. Renewal is recomputed whenever any
 * of the three inputs change: a contract's end isn't a free choice, and a stale
 * date here is what makes a renewal get missed. The field stays editable for the
 * contract that says otherwise.
 */
export function ContractDatesSync() {
  const { control, getValues, setValue } = useFormContext<EmployeeBasicFormValues>()

  const joiningDate = useWatch({ control, name: 'joiningDate' })
  const employmentType = useWatch({ control, name: 'employmentType' })
  const contractPeriod = useWatch({ control, name: 'contractPeriod' })
  const contractPeriodType = useWatch({ control, name: 'contractPeriodType' })

  /**
   * Confirmation follows the joining date for as long as it is the joining
   * date — filled when empty, and moved again (backwards as readily as
   * forwards) whenever joining moves while the two still agree. Once the user
   * types a confirmation date of their own the two no longer agree, and from
   * then on it's theirs: joining can move without dragging it along.
   *
   * The previous joining date is what tells those two apart, so it's kept here.
   * On the first run it's `null` — a seeded edit form must never overwrite the
   * confirmation date the record already holds.
   */
  const previousJoiningDate = useRef<string | null>(null)

  useEffect(() => {
    const previous = previousJoiningDate.current
    previousJoiningDate.current = joiningDate

    if (!joiningDate) return

    const confirmation = getValues('confirmationDate')
    const isUntouched = !confirmation || (previous !== null && confirmation === previous)
    if (isUntouched && confirmation !== joiningDate) {
      setValue('confirmationDate', joiningDate, { shouldValidate: true })
    }
  }, [joiningDate, getValues, setValue])

  useEffect(() => {
    if (employmentType === PERMANENT_EMPLOYMENT_TYPE) {
      if (getValues('renewalDate')) setValue('renewalDate', '')
      return
    }
    const derived = deriveRenewalDate(joiningDate, contractPeriod, contractPeriodType)
    if (derived && derived !== getValues('renewalDate')) {
      setValue('renewalDate', derived, { shouldValidate: true })
    }
  }, [employmentType, joiningDate, contractPeriod, contractPeriodType, getValues, setValue])

  return null
}
