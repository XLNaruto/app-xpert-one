import { Controller, type Control, type FieldErrors, type FieldValues, type Path, type UseFormRegister } from 'react-hook-form'
import { Field } from '@/components/common/form-field'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { StateSelect } from '@/features/master/state'
import type { DistrictSelect } from '@/features/master/district'
import type { EmployeeBasicFormValues } from '../schemas'
import type { AddressFieldNames } from '../lib/address-fields'

/** The error keys for one block, so a message lands under the right control. */
type BlockErrors = FieldErrors<EmployeeBasicFormValues>

/**
 * One address block. The employee record carries the same nine columns twice —
 * current and permanent — so this renders whichever set it's handed
 * (`CURRENT_ADDRESS_FIELDS` / `PERMANENT_ADDRESS_FIELDS` from `lib/address-fields`).
 *
 * The state and district dropdowns page in as they're scrolled and search
 * server-side, and districts cascade off the chosen state because that's how the
 * API narrows them.
 */
export function AddressBlock<T extends FieldValues = EmployeeBasicFormValues>({
  names,
  control,
  register,
  errors,
  state,
  district,
  onStateChange,
  hasState,
  /** Line 1 is required on the current block only. */
  requireLine1 = false,
  disabled = false,
}: {
  names: AddressFieldNames
  control: Control<T>
  register: UseFormRegister<T>
  errors: BlockErrors
  state: StateSelect
  district: DistrictSelect
  onStateChange: (value: string, onChange: (value: string) => void) => void
  /** Whether a state is chosen — the district list cascades off it. */
  hasState: boolean
  requireLine1?: boolean
  disabled?: boolean
}) {
  /** Pull one field's message out of the whole form's errors. */
  const errorFor = (name: Path<EmployeeBasicFormValues>) =>
    (errors as Record<string, { message?: string } | undefined>)[name]?.message

  return (
    <>
      <Field
        label="Address Line 1"
        required={requireLine1}
        error={errorFor(names.address1)}
        className="md:col-span-2"
      >
        <Textarea
          rows={2}
          disabled={disabled}
          placeholder="House / flat, building, street"
          aria-invalid={errorFor(names.address1) ? true : undefined}
          {...register(names.address1 as Path<T>)}
        />
      </Field>

      <Field label="Address Line 2" error={errorFor(names.address2)}>
        <Textarea
          rows={2}
          disabled={disabled}
          placeholder="Area, locality"
          {...register(names.address2 as Path<T>)}
        />
      </Field>

      <Field label="Address Line 3" error={errorFor(names.address3)}>
        <Textarea
          rows={2}
          disabled={disabled}
          placeholder="Landmark"
          {...register(names.address3 as Path<T>)}
        />
      </Field>

      {/*
        Country has no field: it isn't asked for. The form still carries the
        value — 'India' from `EMPTY_EMPLOYEE_BASIC_FORM`, or whatever the record
        holds — and it still reaches the API, since RHF keeps the value of a
        field that was never mounted.
      */}

      <Field label="State" error={errorFor(names.stateId)}>
        <Controller
          control={control}
          name={names.stateId as Path<T>}
          render={({ field }) => (
            <Combobox
              className="w-full"
              clearable
              value={(field.value as string) ?? ''}
              onChange={(value) => onStateChange(value, field.onChange)}
              options={state.options}
              loading={state.loading}
              onScrollEnd={state.onScrollEnd}
              onSearchChange={state.onSearchChange}
              placeholder="Select state"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>

      <Field
        label="District"
        error={errorFor(names.districtId)}
        // The API narrows districts by `state_id`, so there's nothing to list yet.
        hint={hasState ? undefined : 'Choose a state first.'}
      >
        <Controller
          control={control}
          name={names.districtId as Path<T>}
          render={({ field }) => (
            <Combobox
              className="w-full"
              clearable
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              options={district.options}
              loading={district.loading}
              onScrollEnd={district.onScrollEnd}
              onSearchChange={district.onSearchChange}
              placeholder={hasState ? 'Select district' : 'Select a state first'}
              searchPlaceholder="Search district"
            />
          )}
        />
      </Field>

      <Field label="Taluka" error={errorFor(names.taluka)}>
        <Input
          disabled={disabled}
          placeholder="Taluka"
          {...register(names.taluka as Path<T>)}
        />
      </Field>

      <Field label="City" error={errorFor(names.city)}>
        <Input
          disabled={disabled}
          placeholder="City"
          {...register(names.city as Path<T>)}
        />
      </Field>

      <Field label="PIN Code" error={errorFor(names.pinCode)}>
        <Input
          disabled={disabled}
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit PIN"
          aria-invalid={errorFor(names.pinCode) ? true : undefined}
          {...register(names.pinCode as Path<T>)}
        />
      </Field>
    </>
  )
}

