import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import type { Permission, PermissionModule } from '@/features/permissions'
import { PermissionActionPill } from './permission-action-pill'
import type { NodeState } from '../lib/permission-tree'

export interface PermissionNodeRowProps {
  node: PermissionModule
  depth: number
  disabled: boolean
  selected: ReadonlySet<Permission>
  locked: ReadonlySet<Permission>
  expandedKeys: ReadonlySet<string>
  stateOf: (node: PermissionModule) => NodeState
  countOf: (node: PermissionModule) => number
  requiredByLabel: (code: Permission) => string | undefined
  onToggleNode: (node: PermissionModule) => void
  onToggleCode: (code: Permission) => void
  onToggleExpanded: (key: string) => void
  /** Extra classes on the row's card — the module row uses it to read as the parent. */
  className?: string
}

/**
 * One node of the catalog, at whatever depth it sits — a section heading, a
 * screen, or a screen with screens under it. The tree's depth is open-ended, so
 * this recurses into `children` rather than assuming two levels.
 *
 * The node's own checkbox is tri-state: ticked when everything at or below it is,
 * dashed when only some of it is. `node.permissions` is that whole subtree,
 * flattened by the API, so the state never has to be walked out here.
 */
export function PermissionNodeRow({
  node,
  depth,
  disabled,
  selected,
  locked,
  expandedKeys,
  stateOf,
  countOf,
  requiredByLabel,
  onToggleNode,
  onToggleCode,
  onToggleExpanded,
  className,
}: PermissionNodeRowProps) {
  const state = stateOf(node)
  const hasChildren = node.children.length > 0
  const isExpanded = expandedKeys.has(node.key)
  const held = countOf(node)

  return (
    <div className={cn('bg-card', depth > 0 && 'bg-muted/20', className)}>
      {/* Depth is paid for in padding rather than in a nested, inset container:
          the rows are one continuous ruled list, so every divider has to span the
          full width. An inset wrapper would break that line at each level. */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pr-3"
        style={{ paddingLeft: 12 + depth * 24 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.key)}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            aria-expanded={isExpanded}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', !isExpanded && '-rotate-90')}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        <Checkbox
          checked={state === 'all'}
          indeterminate={state === 'partial'}
          disabled={disabled || node.permissions.length === 0}
          onChange={() => onToggleNode(node)}
          aria-label={`Select every permission under ${node.label}`}
        />

        <span
          className={cn(
            'text-sm font-semibold text-foreground',
            depth > 0 && 'font-medium',
          )}
        >
          {node.label}
        </span>

        {node.permissions.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {held}/{node.permissions.length}
          </span>
        )}

        {/* A node's own checkboxes. A section has a single `read` gating whether
            the section shows at all; a bare heading has none. */}
        {node.actions.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {node.actions.map((action) => (
              <PermissionActionPill
                key={action.permission}
                action={action}
                checked={selected.has(action.permission)}
                locked={locked.has(action.permission)}
                lockReason={requiredByLabel(action.permission)}
                disabled={disabled}
                onToggle={() => onToggleCode(action.permission)}
              />
            ))}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="divide-y divide-border border-t border-border">
          {node.children.map((child) => (
            <PermissionNodeRow
              key={child.key}
              node={child}
              depth={depth + 1}
              disabled={disabled}
              selected={selected}
              locked={locked}
              expandedKeys={expandedKeys}
              stateOf={stateOf}
              countOf={countOf}
              requiredByLabel={requiredByLabel}
              onToggleNode={onToggleNode}
              onToggleCode={onToggleCode}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
