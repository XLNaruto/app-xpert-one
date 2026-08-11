import { Building2, Check, Globe2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Field } from '@/components/common/form-field'
import { ACCESS_LEVEL_OPTIONS } from '../constants'
import type { useRoleForm } from '../hooks/use-role-form'

interface RoleScopeFieldsProps {
  form: ReturnType<typeof useRoleForm>
  disabled?: boolean
}

/**
 * How far the role reaches: every company of the account, or exactly the ones
 * ticked.
 *
 * `GLOBAL` includes companies added later, which is the reason it exists at all
 * — a role that has to be re-edited every time the account opens a company isn't
 * global. The company list is disabled rather than hidden under it, so the choice
 * reads as a choice.
 */
export function RoleScopeFields({ form, disabled = false }: RoleScopeFieldsProps) {
  const isGlobal = form.accessLevel === 'GLOBAL'
  const companyError = form.errors.companyIds?.message

  return (
    <>
      <div className="col-span-full">
        <Field label="Access level" required>
          <Controller
            control={form.form.control}
            name="accessLevel"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {ACCESS_LEVEL_OPTIONS.map((option) => {
                  const isActive = field.value === option.value
                  const Icon = option.value === 'GLOBAL' ? Globe2 : Building2
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                        isActive
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/60 hover:border-primary/30 hover:bg-muted/40',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {option.label}
                          {isActive && <Check className="size-3.5 text-primary" />}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
        </Field>
      </div>

      <div className="col-span-full">
        <Field
          label="Companies"
          required={!isGlobal}
          hint="The companies this role may act in. A global role reaches all of them, including ones added later."
          error={companyError}
        >
          {form.isCompaniesLoading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : form.companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No companies on this account yet.
            </p>
          ) : (
            <div
              className={cn(
                'grid gap-2 sm:grid-cols-2 lg:grid-cols-3',
                isGlobal && 'opacity-50',
              )}
            >
              {form.companies.map((company) => {
                // Under GLOBAL every box reads as ticked — that IS the reach —
                // but the stored list stays untouched underneath, so switching
                // back to COMPANY restores whatever was picked before.
                const checked = isGlobal || form.companyIds.includes(company.id)
                return (
                  <label
                    key={company.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors',
                      isGlobal || disabled
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer hover:border-primary/30 hover:bg-muted/40',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isGlobal || disabled}
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
        </Field>
      </div>
    </>
  )
}
