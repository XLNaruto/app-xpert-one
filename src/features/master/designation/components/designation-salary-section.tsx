import { Controller } from 'react-hook-form'
import {
  Briefcase,
  Clock,
  HandCoins,
  HeartPulse,
  IndianRupee,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { amountLabel } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import {
  ACT_AMOUNT_TYPE_OPTIONS,
  ESIC_DEDUCTION_BASIS_OPTIONS,
  OVERTIME_CALCULATION_TYPE_OPTIONS,
  PF_DEDUCTION_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  WAGE_DAYS_PER_MONTH,
  WEEKLY_OFF_OPTIONS,
  WORKING_DAY_CALCULATION_OPTIONS,
} from '../constants'
import type { useDesignationForm } from '../hooks/use-designation-form'
import { ActSectionCard } from './act-section-card'
import { ActToggleTile } from './act-toggle-tile'
import { CalculationFormulaStrip } from './calculation-formula-strip'

type DesignationForm = ReturnType<typeof useDesignationForm>

type DesignationSalarySectionProps = Pick<
  DesignationForm,
  | 'register'
  | 'control'
  | 'errors'
  | 'wagePerDay'
  | 'workingDayCalculationType'
  | 'changeWorkingDayCalculationType'
  | 'pfActApplicable'
  | 'pfDeductionType'
  | 'esicActApplicable'
  | 'ptActApplicable'
  | 'ptActType'
  | 'lwfActApplicable'
  | 'lwfActType'
  | 'overtimeApplicable'
  | 'overtimeCalculationType'
>

/**
 * Top half of the designation form — the designation's name, how its salary and
 * working days are computed, which statutory acts apply and the settings each
 * applicable act needs. An act's settings card appears only while its toggle is
 * on; the fields behind a switched-off act are dropped on save.
 */
export function DesignationSalarySection({
  register,
  control,
  errors,
  wagePerDay,
  workingDayCalculationType,
  changeWorkingDayCalculationType,
  pfActApplicable,
  pfDeductionType,
  esicActApplicable,
  ptActApplicable,
  ptActType,
  lwfActApplicable,
  lwfActType,
  overtimeApplicable,
  overtimeCalculationType,
}: DesignationSalarySectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Briefcase}
        title="Designation Detail"
        description="The designation this configuration applies to, company-wide"
        className="mt-0"
      />

      <Field
        label="Designation Name"
        required
        error={errors.designationName?.message}
      >
        <Input placeholder="Designation Name" {...register('designationName')} />
      </Field>

      <FormSection
        icon={Wallet}
        title="Salary Configuration"
        description="Salary type, basic pay and the working-day calculation"
      />

      <Field label="Salary Type" error={errors.salaryType?.message}>
        <Controller
          control={control}
          name="salaryType"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={SALARY_TYPE_OPTIONS}
              placeholder="Select Salary Type"
              searchable={false}
              clearable
            />
          )}
        />
      </Field>
      <Field
        label={amountLabel('Basic Pay')}
        required
        hint="The monthly basic on which PF, ESIC and every percentage allowance are calculated."
        error={errors.basicPay?.message}
      >
        <Input inputMode="decimal" placeholder={amountLabel('Basic Pay')} {...register('basicPay')} />
      </Field>
      <Field
        label="Working Day Calculation"
        error={errors.workingDayCalculationType?.message}
      >
        <Controller
          control={control}
          name="workingDayCalculationType"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={(value) =>
                changeWorkingDayCalculationType(value, field.onChange)
              }
              options={WORKING_DAY_CALCULATION_OPTIONS}
              placeholder="Select Calculation"
              searchable={false}
              clearable
            />
          )}
        />
      </Field>
      {/*
        Fixed days and a weekly off are alternatives, each owned by one
        calculation type — with the type cleared, neither is asked for.
      */}
      {workingDayCalculationType === 'Fixed' && (
        <Field label="Working Days" error={errors.workingDays?.message}>
          <Input inputMode="numeric" placeholder="Working Days" {...register('workingDays')} />
        </Field>
      )}
      {workingDayCalculationType === 'As Per Calculation' && (
        <Field label="Weekly Off" error={errors.weeklyOff?.message}>
          <Controller
            control={control}
            name="weeklyOff"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={WEEKLY_OFF_OPTIONS}
                placeholder="Select Weekly Off"
                searchable={false}
                clearable
              />
            )}
          />
        </Field>
      )}
      <Field
        label="Calculated Wage Per Day"
        hint={`Derived, not captured: basic pay ÷ ${WAGE_DAYS_PER_MONTH} days.`}
      >
        <Input
          readOnly
          tabIndex={-1}
          value={formatCurrency(wagePerDay)}
          className="bg-muted/50 text-muted-foreground"
        />
      </Field>
      <Field
        label={amountLabel('Extra Day Amount Per Day')}
        hint="Paid for each day worked beyond the designation's working days."
        error={errors.extraDayAmountPerDay?.message}
      >
        <Input
          inputMode="decimal"
          placeholder={amountLabel('Extra Day Amount Per Day')}
          {...register('extraDayAmountPerDay')}
        />
      </Field>

      <CalculationFormulaStrip control={control} />

      <FormSection
        icon={Scale}
        title="Applicable Acts"
        description="Turn on the acts this designation is covered by"
      />

      <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Controller
          control={control}
          name="pfActApplicable"
          render={({ field }) => (
            <ActToggleTile
              icon={ShieldCheck}
              title="PF Act Applicable"
              description="Enable Employee Provident Fund deductions"
              checked={field.value}
              onCheckedChange={field.onChange}
              tone="border-primary/30 bg-primary/5"
              iconTone="text-primary"
            />
          )}
        />
        <Controller
          control={control}
          name="esicActApplicable"
          render={({ field }) => (
            <ActToggleTile
              icon={HeartPulse}
              title="ESIC Act Applicable"
              description="Enable Employee State Insurance deductions"
              checked={field.value}
              onCheckedChange={field.onChange}
              tone="border-emerald-500/30 bg-emerald-500/5"
              iconTone="text-emerald-600 dark:text-emerald-400"
            />
          )}
        />
        <Controller
          control={control}
          name="ptActApplicable"
          render={({ field }) => (
            <ActToggleTile
              icon={IndianRupee}
              title="PT Act Applicable"
              description="Enable Professional Tax deductions"
              checked={field.value}
              onCheckedChange={field.onChange}
              tone="border-violet-500/30 bg-violet-500/5"
              iconTone="text-violet-600 dark:text-violet-400"
            />
          )}
        />
        <Controller
          control={control}
          name="lwfActApplicable"
          render={({ field }) => (
            <ActToggleTile
              icon={HandCoins}
              title="LWF Act Applicable"
              description="Enable Labour Welfare Fund deductions"
              checked={field.value}
              onCheckedChange={field.onChange}
              tone="border-amber-500/30 bg-amber-500/5"
              iconTone="text-amber-600 dark:text-amber-400"
            />
          )}
        />
        <Controller
          control={control}
          name="overtimeApplicable"
          render={({ field }) => (
            <ActToggleTile
              icon={Clock}
              title="Overtime (OT) Applicable"
              description="Enable overtime wage calculations"
              checked={field.value}
              onCheckedChange={field.onChange}
              tone="border-sky-500/30 bg-sky-500/5"
              iconTone="text-sky-600 dark:text-sky-400"
            />
          )}
        />
      </div>

      {/* Per-act settings — each card is mounted only while its act is applicable. */}
      <div className="col-span-full space-y-5">
        {pfActApplicable && (
          <ActSectionCard
            icon={ShieldCheck}
            title="PF Act Settings"
            tone="border-primary/20 bg-primary/5"
            iconTone="text-primary"
          >
            <Field label="PF Deduction Type" error={errors.pfDeductionType?.message}>
              <Controller
                control={control}
                name="pfDeductionType"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={PF_DEDUCTION_TYPE_OPTIONS}
                    placeholder="Select Deduction Type"
                    searchable={false}
                    clearable
                  />
                )}
              />
            </Field>
            {/* One input for both modes — a percentage of EPF wages, or a flat amount. */}
            {pfDeductionType !== '' && (
              <Field
                label={pfValueLabel(pfDeductionType)}
                error={errors.pfDeductionValue?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder={pfValueLabel(pfDeductionType)}
                  {...register('pfDeductionValue')}
                />
              </Field>
            )}
            <Field label="Employee PF Contribution on Wage Limit">
              <Controller
                control={control}
                name="employeePfContributionOnWageLimit"
                render={({ field }) => (
                  <SwitchRow
                    label="Cap the employee share at the statutory wage limit"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field label="Employer PF Contribution on Wage Limit">
              <Controller
                control={control}
                name="employerPfContributionOnWageLimit"
                render={({ field }) => (
                  <SwitchRow
                    label="Cap the employer share at the statutory wage limit"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>
          </ActSectionCard>
        )}

        {esicActApplicable && (
          <ActSectionCard
            icon={HeartPulse}
            title="ESIC Act Settings"
            tone="border-emerald-500/20 bg-emerald-500/5"
            iconTone="text-emerald-600 dark:text-emerald-400"
          >
            <Field label="ESIC Deducts On" error={errors.esicDeductionBasis?.message}>
              <Controller
                control={control}
                name="esicDeductionBasis"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={ESIC_DEDUCTION_BASIS_OPTIONS}
                    placeholder="Select Deduction Type"
                    searchable={false}
                    clearable
                  />
                )}
              />
            </Field>
          </ActSectionCard>
        )}

        {ptActApplicable && (
          <ActSectionCard
            icon={IndianRupee}
            title="Professional Tax Act Settings"
            tone="border-violet-500/20 bg-violet-500/5"
            iconTone="text-violet-600 dark:text-violet-400"
            footnote={
              ptActType === 'As Per Act'
                ? 'Deduction is calculated from the salary slab defined in the PT rate setting.'
                : undefined
            }
          >
            <Field label="PT Act Type" error={errors.ptActType?.message}>
              <Controller
                control={control}
                name="ptActType"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={ACT_AMOUNT_TYPE_OPTIONS}
                    placeholder="Select PT Act Type"
                    searchable={false}
                    clearable
                  />
                )}
              />
            </Field>
            {ptActType === 'Manual' && (
              <Field label={amountLabel('PT Amount')} error={errors.ptAmount?.message}>
                <Input
                  inputMode="decimal"
                  placeholder={amountLabel('PT Amount')}
                  {...register('ptAmount')}
                />
              </Field>
            )}
          </ActSectionCard>
        )}

        {lwfActApplicable && (
          <ActSectionCard
            icon={HandCoins}
            title="LWF Act Settings"
            tone="border-amber-500/20 bg-amber-500/5"
            iconTone="text-amber-600 dark:text-amber-400"
            footnote={
              lwfActType === 'As Per Act'
                ? 'Deduction is calculated from the LWF rate setting for the branch state.'
                : undefined
            }
          >
            <Field label="LWF Act Type" error={errors.lwfActType?.message}>
              <Controller
                control={control}
                name="lwfActType"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={ACT_AMOUNT_TYPE_OPTIONS}
                    placeholder="Select LWF Act Type"
                    searchable={false}
                    clearable
                  />
                )}
              />
            </Field>
            {lwfActType === 'Manual' && (
              <Field label={amountLabel('LWF Amount')} error={errors.lwfAmount?.message}>
                <Input
                  inputMode="decimal"
                  placeholder={amountLabel('LWF Amount')}
                  {...register('lwfAmount')}
                />
              </Field>
            )}
          </ActSectionCard>
        )}

        {overtimeApplicable && (
          <ActSectionCard
            icon={Clock}
            title="Overtime Settings"
            tone="border-sky-500/20 bg-sky-500/5"
            iconTone="text-sky-600 dark:text-sky-400"
            footnote={
              overtimeCalculationType === 'As Per Calculation'
                ? `Left blank, the rate is derived from the wage per day: basic pay ÷ ${WAGE_DAYS_PER_MONTH} ÷ 8 hours, paid at double.`
                : undefined
            }
          >
            <Field
              label="OT Calculation Type"
              error={errors.overtimeCalculationType?.message}
            >
              <Controller
                control={control}
                name="overtimeCalculationType"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={OVERTIME_CALCULATION_TYPE_OPTIONS}
                    placeholder="Select Calculation"
                    searchable={false}
                    clearable
                  />
                )}
              />
            </Field>
            <Field
              label={amountLabel('OT Rate Per Hour')}
              hint={
                overtimeCalculationType === 'Manual'
                  ? 'The flat rate paid for each overtime hour.'
                  : 'Optional override — leave blank to let the calculated wage per hour drive the rate.'
              }
              error={errors.overtimeRatePerHour?.message}
            >
              <Input
                inputMode="decimal"
                placeholder={amountLabel('OT Rate Per Hour')}
                {...register('overtimeRatePerHour')}
              />
            </Field>
          </ActSectionCard>
        )}
      </div>
    </div>
  )
}

/** The PF value field is a percentage or a rupee amount, per the deduction type. */
function pfValueLabel(pfDeductionType: string): string {
  return pfDeductionType === 'Fixed'
    ? amountLabel('PF Deduction Amount')
    : 'PF Deduction Percentage (%)'
}

/** A switch sitting in a `Field` slot, with its own inline caption. */
function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex h-9 items-center gap-2.5">
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
