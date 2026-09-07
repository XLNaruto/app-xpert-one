import { Combobox } from '@/components/ui/combobox'
import { RadarWebChart, type RadarSeries } from '@/components/charts'
import { chartColor } from '@/components/charts/tokens'
import { cn } from '@/lib/utils'
import {
  RADAR_AXIS_LABELS,
  RADAR_GROUP_BY_LABELS,
  RADAR_GROUP_BY_OPTIONS,
} from '../constants'
import { EM_DASH, formatCount, formatRatio } from '../lib/dashboard-format'
import { PanelCard } from './panel-card'
import type { useRadarPanel } from '../hooks/use-radar-panel'
import type { RadarGroupBy } from '../types'

/**
 * The scorecard web.
 *
 * All six axes are fractions in `0..1` oriented so HIGHER IS BETTER, which is
 * the only reason the polygons are comparable at all — it is why the axes are
 * RETENTION and PUNCTUALITY rather than attrition and lateness. Nothing here
 * computes a seventh axis, because a client-side one would have to obey both
 * properties and any that did would already be served.
 *
 * Three rules the drawing follows:
 *
 * * **A fixed 0–1 radial scale**, never auto-scaled to the data. Two webs from
 *   two requests have to mean the same thing.
 * * **The axes are drawn in `response.axes` order, always.** If one screen drew
 *   them differently from another the shapes would stop comparing between
 *   screens.
 * * **A NULL score breaks the polygon.** A department that ran no payroll is not
 *   a department with terrible payroll; plotting it at the centre is a false
 *   accusation rendered in SVG.
 *
 * `retention_rate` is computed off each person's CURRENT posting, so somebody
 * who transferred out is counted in the group they are in NOW. That is the right
 * reading for a per-department scorecard, but it is NOT the same arithmetic as
 * `workforce.attrition_rate` on `/summary` — the two are deliberately not put
 * side by side.
 */

interface RadarPanelProps {
  panel: ReturnType<typeof useRadarPanel>
  height?: number
}

export function RadarPanel({ panel, height = 320 }: RadarPanelProps) {
  const { allGroups, groups, axes, hidden, groupBy } = panel

  // The colour slot is pinned to the group's position in the FULL list, so
  // toggling a ring off never repaints the ones that stay.
  const colorIndexOf = (key: string) =>
    Math.max(0, allGroups.findIndex((group) => group.key === key))

  const series: RadarSeries[] = groups.map((group) => ({
    key: group.key,
    label: group.label,
    colorIndex: colorIndexOf(group.key),
    scores: Object.fromEntries(
      axes.map((axis) => [axis, group.scores[axis] ?? null]),
    ),
  }))

  return (
    <PanelCard
      title={`${RADAR_GROUP_BY_LABELS[groupBy]} scorecard`}
      description="Six rates, all as fractions and all oriented so higher is better — that is what makes the shapes comparable. A missing vertex is an unmeasured axis, not a zero."
      isLoading={panel.isPending}
      isFetching={panel.isFetching && !panel.isPending}
      error={panel.error}
      isEmpty={allGroups.length === 0}
      emptyDescription="No group in this population has anything to score yet. Groups with no key, and groups nobody is in, are excluded rather than drawn as a failing team."
      skeletonHeight={height}
      actions={
        <Combobox
          options={RADAR_GROUP_BY_OPTIONS}
          value={groupBy}
          onChange={(value) => panel.setGroupBy(value as RadarGroupBy)}
          searchable={false}
          className="w-40"
        />
      }
    >
      <div className="space-y-4">
        <RadarWebChart
          axes={axes.map((axis) => ({ key: axis, label: RADAR_AXIS_LABELS[axis] }))}
          series={series}
          height={height}
          formatValue={(value) => formatRatio(value)}
        />

        {/* The legend doubles as a ring toggle — above ~6 rings a radar becomes
            mud, so this is the answer rather than raising the limit. Headcount is
            the weight behind each shape: a 3-person department's perfect web is
            not news. */}
        <div className="flex flex-wrap gap-1.5">
          {allGroups.map((group) => {
            const isHidden = hidden.has(group.key)
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => panel.toggleGroup(group.key)}
                aria-pressed={!isHidden}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  isHidden
                    ? 'border-border text-muted-foreground'
                    : 'border-border/60 bg-muted/50 text-foreground',
                )}
                title={`${group.label} · ${formatCount(group.headcount)} people`}
              >
                <span
                  style={{
                    background: isHidden
                      ? 'var(--color-muted-foreground)'
                      : chartColor(colorIndexOf(group.key)),
                  }}
                  className="size-2 shrink-0 rounded-sm"
                />
                <span className="max-w-32 truncate">{group.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCount(group.headcount)}
                </span>
              </button>
            )
          })}
        </div>

        {/* The table twin — and the place an unmeasured axis is stated as such
            rather than merely being absent from the polygon. */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">
                  {RADAR_GROUP_BY_LABELS[groupBy]}
                </th>
                <th className="py-1.5 pr-2 text-right font-medium">People</th>
                {axes.map((axis) => (
                  <th key={axis} className="py-1.5 pr-2 text-right font-medium">
                    {RADAR_AXIS_LABELS[axis]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allGroups.map((group) => (
                <tr key={group.key} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-2 max-w-40 truncate">{group.label}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {formatCount(group.headcount)}
                  </td>
                  {axes.map((axis) => {
                    const score = group.scores[axis] ?? null
                    return (
                      <td
                        key={axis}
                        className={cn(
                          'py-1.5 pr-2 text-right tabular-nums',
                          score == null && 'text-muted-foreground',
                        )}
                        title={score == null ? 'No data — not measured' : undefined}
                      >
                        {score == null ? EM_DASH : formatRatio(score)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PanelCard>
  )
}
