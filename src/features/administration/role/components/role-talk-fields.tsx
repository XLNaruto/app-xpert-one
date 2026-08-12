import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { Building2, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { ALL_ROWS } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useDepartments, departmentOptions } from '@/features/master/department'
import { WHOLE_COMPANY } from '../constants'
import type { useRoleForm } from '../hooks/use-role-form'

interface RoleTalkFieldsProps {
  form: ReturnType<typeof useRoleForm>
  disabled?: boolean
}

/** "The whole company" as an option, ahead of that company's departments. */
const WHOLE_COMPANY_OPTION: ComboboxOption = {
  label: 'Whole company',
  value: WHOLE_COMPANY,
}

interface TalkGrantRowProps {
  index: number
  form: ReturnType<typeof useRoleForm>
  disabled: boolean
  companyOptions: ComboboxOption[]
  onRemove: () => void
}

/**
 * One grant: a company, optionally narrowed to one of its departments.
 *
 * The departments are read per row rather than for all rows at once — each row
 * names a different company, and the department must belong to the company
 * alongside it (the endpoint answers 400 otherwise).
 */
function TalkGrantRow({
  index,
  form,
  disabled,
  companyOptions,
  onRemove,
}: TalkGrantRowProps) {
  const companyId = form.form.watch(`talkAccess.${index}.companyId`)
  const numericCompanyId = companyId ? Number(companyId) : undefined

  const departments = useDepartments(ALL_ROWS, numericCompanyId)

  const options = useMemo<ComboboxOption[]>(
    () => [WHOLE_COMPANY_OPTION, ...departmentOptions(departments.data?.items ?? [])],
    [departments.data],
  )

  const rowErrors = form.errors.talkAccess?.[index]

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="min-w-40 flex-1">
        <Controller
          control={form.form.control}
          name={`talkAccess.${index}.companyId`}
          render={({ field }) => (
            <Combobox
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                // The department belongs to the old company — keeping it would
                // be a 400 on save, so a company change resets the narrowing.
                form.form.setValue(`talkAccess.${index}.departmentId`, WHOLE_COMPANY)
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
          name={`talkAccess.${index}.departmentId`}
          render={({ field }) => (
            <Combobox
              value={field.value}
              onChange={field.onChange}
              options={options}
              placeholder="Whole company"
              loading={departments.isLoading}
              className="w-full"
            />
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Remove this Talk grant"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

/**
 * Talk: whether the role may use it at all, and which companies (or
 * departments within them) it reaches.
 *
 * The switch is the gate — with it off the grants are stored empty whatever the
 * form last held, and with it on at least one grant is required.
 */
export function RoleTalkFields({ form, disabled = false }: RoleTalkFieldsProps) {
  const grantsError = form.errors.talkAccess?.message

  return (
    <div className="col-span-full space-y-3">
      {/* One row, not three: the whole tile is the switch — same card language as
          the access-level choices above it, so the gate reads as a peer of them
          rather than as a stray toggle under a label. */}
      <Controller
        control={form.form.control}
        name="talkEnabled"
        render={({ field }) => (
          <button
            type="button"
            role="switch"
            aria-checked={field.value}
            disabled={disabled}
            onClick={() => field.onChange(!field.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              field.value
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                : 'border-border/60 hover:border-primary/30 hover:bg-muted/40',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                field.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              <MessageSquare className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">Talk</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Whether this role may use Talk, and where. Off means no access at all.
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {field.value ? 'Enabled' : 'Disabled'}
            </span>
            {/* Presentational: the tile owns the click and the switch role. */}
            <Switch presentational checked={field.value} disabled={disabled} />
          </button>
        )}
      />

      {form.talkEnabled && (
        <div className="space-y-2">
          {form.talkAccess.fields.map((field, index) => (
            <TalkGrantRow
              key={field.id}
              index={index}
              form={form}
              disabled={disabled}
              companyOptions={form.companyOptions}
              onRemove={() => form.talkAccess.remove(index)}
            />
          ))}

          {form.talkAccess.fields.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-1 size-4" />
              No grants yet — add the companies this role may talk in.
            </p>
          )}

          {grantsError && <p className="text-xs text-destructive">{grantsError}</p>}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={form.addTalkGrant}
          >
            <Plus className="size-4" />
            Add grant
          </Button>
        </div>
      )}
    </div>
  )
}
