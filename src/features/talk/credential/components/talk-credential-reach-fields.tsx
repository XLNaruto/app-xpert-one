import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { Building2, Info, Network, Plus, Trash2 } from 'lucide-react'
import { ALL_ROWS } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Field } from '@/components/common/form-field'
import { cn } from '@/lib/utils'
import { useDepartments } from '@/features/master/department'
import type { useTalkCredentialForm } from '../hooks/use-talk-credential-form'

interface TalkCredentialReachFieldsProps {
  form: ReturnType<typeof useTalkCredentialForm>
  disabled?: boolean
}

interface DepartmentGrantRowProps {
  index: number
  form: ReturnType<typeof useTalkCredentialForm>
  disabled: boolean
  companyOptions: ComboboxOption[]
  /** True when this row's company is already granted whole above. */
  redundant: boolean
  onRemove: () => void
}

/**
 * One department row — a COMPANY and the departments inside it this credential
 * reaches.
 *
 * The rows are a grouping this form imposes: the endpoint takes a FLAT
 * `department_ids` and resolves each id to its own company. They're grouped
 * because the department read is per company, and because "Support, in Liger"
 * is legible where a bare list of ids from four companies is not.
 *
 * There is one row per company — two rows for one company would flatten into a
 * single list, so the second would silently swallow the first.
 */
function DepartmentGrantRow({
  index,
  form,
  disabled,
  companyOptions,
  redundant,
  onRemove,
}: DepartmentGrantRowProps) {
  const companyId = form.form.watch(`departmentGrants.${index}.companyId`)
  const selectedIds = form.form.watch(`departmentGrants.${index}.departmentIds`) ?? []
  const numericCompanyId = companyId ? Number(companyId) : undefined

  const departments = useDepartments(ALL_ROWS, numericCompanyId)

  const departmentOptions = useMemo<ComboboxOption[]>(
    () =>
      (departments.data?.items ?? []).map((department) => ({
        label: department.departmentName,
        value: String(department.id),
      })),
    [departments.data],
  )

  const rowErrors = form.errors.departmentGrants?.[index]

  return (
    <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-40 flex-1">
          <Controller
            control={form.form.control}
            name={`departmentGrants.${index}.companyId`}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  // The departments belong to the old company — keeping them
                  // would grant the wrong people, so a change resets them.
                  form.clearGrantDepartments(index)
                }}
                options={companyOptions}
                icon={Building2}
                placeholder="Select company"
                className="w-full"
              />
            )}
          />
          {rowErrors?.companyId?.message && (
            <p className="mt-1 text-xs text-destructive">{rowErrors.companyId.message}</p>
          )}
        </div>

        <div className="min-w-40 flex-1">
          <Controller
            control={form.form.control}
            name={`departmentGrants.${index}.departmentIds`}
            render={({ field }) => (
              <Combobox
                multiple
                value={field.value ?? []}
                onChange={field.onChange}
                options={departmentOptions}
                icon={Network}
                placeholder={
                  !companyId
                    ? 'Pick a company first'
                    : departments.isLoading
                      ? 'Loading departments…'
                      : departmentOptions.length === 0
                        ? 'This company has no departments'
                        : 'Select departments'
                }
                searchPlaceholder="Search departments"
                className="w-full"
                loading={departments.isLoading}
                panelMinWidth={260}
              />
            )}
          />
          {rowErrors?.departmentIds?.message && (
            <p className="mt-1 text-xs text-destructive">
              {rowErrors.departmentIds.message}
            </p>
          )}
        </div>

        <span className="flex h-9 items-center text-xs text-muted-foreground">
          {selectedIds.length === 0
            ? 'None yet'
            : `${selectedIds.length} department${selectedIds.length === 1 ? '' : 's'}`}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onRemove}
          aria-label="Remove this department grant"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Not an error: the endpoint accepts both, and the whole-company grant
          simply wins. Said out loud so the row doesn't look like it's doing
          something the company tick isn't already doing. */}
      {redundant && (
        <p className="flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
          <Info className="size-3.5 shrink-0 translate-y-px" />
          This company is already granted whole above — these departments add nothing.
        </p>
      )}
    </div>
  )
}

/**
 * How far a Talk credential reaches — two INDEPENDENT lists.
 *
 * **Whole companies** grants every department in each, present and future.
 * **Departments** grants single ones, and a department may be granted without
 * its company appearing above: the endpoint resolves each to the company it
 * belongs to, so the two selections need not agree.
 *
 * Both empty is allowed and means the credential signs in but reaches nobody —
 * a state worth being able to save (an issued-but-not-yet-scoped login) and
 * worth naming, which the hint under the tiles does.
 */
export function TalkCredentialReachFields({
  form,
  disabled = false,
}: TalkCredentialReachFieldsProps) {
  const companyError = form.errors.companyIds?.message
  const grantsError = form.errors.departmentGrants?.message
  const reachesNothing =
    form.companyIds.length === 0 && form.departmentGrants.fields.length === 0

  return (
    <>
      <div className="col-span-full">
        <Field
          label="Whole companies"
          hint="Every department in each, including any the company adds later."
          error={companyError}
        >
          {/* The tiles sit on a panel of their own: the account can hold more
              companies than fit, so the panel caps the height and scrolls. */}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2.5">
            {form.isCompaniesLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : form.companies.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                No companies on this account yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {form.companies.map((company) => {
                  const checked = form.companyIds.includes(company.id)
                  return (
                    <label
                      key={company.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                        checked
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/60 bg-card',
                        disabled
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer hover:border-primary/30',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onChange={() => form.toggleCompany(company.id)}
                        aria-label={company.name}
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {company.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {company.code}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </Field>
      </div>

      <div className="col-span-full space-y-2">
        <Field
          label="Individual departments"
          hint="For reach narrower than a whole company. A department can be granted on its own — its company doesn't have to be ticked above."
          error={grantsError}
        >
          <div className="space-y-2">
            {form.departmentGrants.fields.map((field, index) => (
              <DepartmentGrantRow
                key={field.id}
                index={index}
                form={form}
                disabled={disabled}
                // A company another row already took is off this row's list —
                // the flat list the rows collapse into can't tell two rows for
                // one company apart.
                companyOptions={form.companyOptions.filter(
                  (option) =>
                    !form.grantCompanyIds.some(
                      (taken, row) => row !== index && taken === option.value,
                    ),
                )}
                redundant={form.companyIds.includes(
                  Number(form.grantCompanyIds[index] || 0),
                )}
                onRemove={() => form.departmentGrants.remove(index)}
              />
            ))}

            {form.departmentGrants.fields.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                <Network className="mx-auto mb-1 size-4" />
                No department grants — tick whole companies above, or add a row here.
              </p>
            )}

            {/*
              Why the button is dead, said on hover. A disabled button swallows
              pointer events, so the span around it carries the trigger.
            */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || !form.canAddDepartmentGrant}
                    onClick={form.addDepartmentGrant}
                  >
                    <Plus className="size-4" />
                    Add departments
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-pretty font-normal">
                {form.canAddDepartmentGrant
                  ? 'Grant departments inside one company'
                  : 'Every company already has a row'}
              </TooltipContent>
            </Tooltip>
          </div>
        </Field>

        {/* Saveable, so not an error — but a Talk login that reaches nobody has
            nobody to talk to, and that is worth knowing before Save. */}
        {reachesNothing && (
          <p className="flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
            <Info className="size-3.5 shrink-0 translate-y-px" />
            This credential will sign in to Talk but reach nobody until it is given a
            company or a department.
          </p>
        )}
      </div>
    </>
  )
}
