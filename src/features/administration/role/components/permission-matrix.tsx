import { KeyRound, Link2, LayoutGrid, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { lucideIcon } from '../lib/lucide-icon'
import { PermissionNodeRow } from './permission-node-row'
import type { useRoleForm } from '../hooks/use-role-form'

interface PermissionMatrixProps {
  form: ReturnType<typeof useRoleForm>
  /** A system role is read-only — its boxes render, none of them move. */
  disabled?: boolean
}

/**
 * The role builder's checkbox matrix: a rail of top-level modules on the left,
 * the open module's sections and screens on the right.
 *
 * Rendered from exactly what `assignable-permissions` (or the role's own
 * `modules`) returns — never the full catalog. An action absent from the response
 * can never be saved, so drawing it would offer a permission that doesn't exist.
 */
export function PermissionMatrix({ form, disabled = false }: PermissionMatrixProps) {
  if (form.isLoading) {
    return (
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (form.isCatalogEmpty) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No permissions available"
        description="This account has no permissions to assign yet. A serving subscription unlocks the catalog a role can be built from."
      />
    )
  }

  const active = form.activeModule

  return (
    <div className="space-y-3">
      {/* What the linked-permission behaviour does, said once, above the grid —
          the counter moving by more than the box that was clicked is otherwise
          indistinguishable from a bug. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
        <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-pretty">
          <span className="font-medium text-foreground">Some permissions are linked.</span>{' '}
          Selecting one also selects whatever it needs to work; clearing one clears
          whatever needed it. A lock marks a permission something else is relying on —
          it can still be cleared, and what depends on it goes too. So the count can
          move by more than the pill you clicked; hover any of them to see what
          travels with it.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="default" className="gap-1.5">
          <KeyRound className="size-3.5" />
          {form.selectedCount} / {form.totalCodes} selected
        </Badge>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={form.selectAll}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={form.clearAll}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Fixed height from `lg` up so the matrix can't push the form's Save off
          the page: the rail and the open module each take their own scrollbar,
          and `min-h-0` is what lets a grid child scroll instead of growing. */}
      <div className="grid gap-3 overflow-hidden rounded-xl border border-border/60 lg:h-128 lg:grid-cols-[240px_1fr] lg:gap-0">
        {/* Module rail */}
        <div className="min-h-0 overflow-y-auto border-border/60 bg-muted/30 p-2 lg:border-r">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {form.selectedCount} of {form.totalCodes} selected
          </p>
          <div className="space-y-1">
            {form.modules.map((module) => {
              const Icon = lucideIcon(module.icon) ?? LayoutGrid
              const isActive = module.key === form.activeModuleKey
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => form.setActiveModuleKey(module.key)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{module.label}</span>
                  <span className="shrink-0 text-xs tabular-nums opacity-70">
                    {form.countOf(module)}/{module.permissions.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* The open module */}
        {/* No padding on the panel itself — the ruled list runs edge to edge, so
            every divider is one unbroken line across the whole panel. Only the
            header above it is inset. */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {active ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {active.label}
                    </h4>
                    {active.panelLabel && (
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {active.panelLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {active.children.length} section
                    {active.children.length === 1 ? '' : 's'} ·{' '}
                    {form.countOf(active)} of {active.permissions.length} selected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* The same control both ways — a module with everything open
                      has no use for "Expand all", and a separate Collapse button
                      would be dead half the time. Hidden outright when the module
                      has nothing to expand. */}
                  {form.hasExpandable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setAllExpanded(!form.isAllExpanded)}
                    >
                      {form.isAllExpanded ? 'Collapse all' : 'Expand all'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={form.toggleActiveModule}
                  >
                    {form.stateOf(active) === 'all' ? 'Clear module' : 'Select whole module'}
                  </Button>
                </div>
              </div>

              {/* One ruled list: no gaps, no per-row radius, every row divided
                  from the next by a full-width line. */}
              <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto border-t border-border">
                {active.actions.length > 0 || active.children.length > 0 ? (
                  <>
                    {/* The module's own checkboxes, where it has any. Narrowed to
                        just those codes so its row counts itself, not the subtree
                        already counted by the rows below. */}
                    {active.actions.length > 0 && (
                      <PermissionNodeRow
                        node={{
                          ...active,
                          children: [],
                          permissions: active.actions.map((action) => action.permission),
                        }}
                        depth={0}
                        disabled={disabled}
                        selected={form.selected}
                        locked={form.locked}
                        expandedKeys={form.expandedKeys}
                        stateOf={form.stateOf}
                        countOf={form.countOf}
                        requiredByLabel={form.requiredByLabel}
                        onToggleNode={form.onToggleNode}
                        onToggleCode={form.onToggleCode}
                        onToggleExpanded={form.toggleExpanded}
                        className="bg-primary/4"
                      />
                    )}
                    {/* The sections are rows of the SAME list as the module above
                        them, not a block inset under it — an inset wrapper is what
                        leaves a gap down the left and cuts every divider short.
                        `depth` carries the hierarchy instead, as left padding.
                        No indent guide at this level: the module isn't a row you
                        can collapse, so a rail down the whole list would point at
                        nothing. Guides only mark what an open chevron holds. */}
                    <div className="divide-y divide-border">
                      {active.children.map((child) => (
                        <PermissionNodeRow
                          key={child.key}
                          node={child}
                          depth={1}
                          disabled={disabled}
                          selected={form.selected}
                          locked={form.locked}
                          expandedKeys={form.expandedKeys}
                          stateOf={form.stateOf}
                          countOf={form.countOf}
                          requiredByLabel={form.requiredByLabel}
                          onToggleNode={form.onToggleNode}
                          onToggleCode={form.onToggleCode}
                          onToggleExpanded={form.toggleExpanded}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                    This module has nothing to grant.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
