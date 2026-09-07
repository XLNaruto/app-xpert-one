/**
 * Chart design tokens — the palette, the ramps and the axis chrome.
 *
 * Kept out of `index.tsx` because a module that exports both components and
 * plain values loses fast refresh for the components in it. Import these
 * directly: `import { chartColor } from '@/components/charts/tokens'`.
 */

/**
 * THE categorical series palette, assigned in this FIXED ORDER and never cycled.
 *
 * A chart's Nth series takes slot N, so a filter that removes a series does not
 * repaint the survivors — colour follows the entity, not its current rank. Past
 * five series, fold the tail into an "Other" slice rather than generating a
 * sixth hue: a generated colour is indistinguishable from an existing slot under
 * colour-vision deficiency.
 *
 * The steps themselves are validated against both theme surfaces (see the
 * `--chart-*` tokens in `globals.css`).
 */
export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

/** The colour a series in slot `index` wears. */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * Neutral grey — for a slice that is not an entity: a folded "Other (N)"
 * remainder, or an "Unassigned" bucket. Giving either one a palette hue makes it
 * read as a team.
 */
export const NEUTRAL_SERIES_COLOR = 'var(--color-muted-foreground)'

/**
 * A second neutral, one step off the first — for the case where TWO non-entity
 * slices sit in the same chart (a folded "Other" remainder beside an
 * "Unassigned" bucket). Both must read as not-a-team, but a donut where they
 * share one grey has two wedges nobody can tell apart.
 */
export const NEUTRAL_ALT_COLOR = 'var(--color-border)'

/**
 * Axis chrome. Solid hairlines one shade off the surface — never dashed, which
 * adds noise and reads as "projection" when it is just a grid.
 */
export const axisProps = {
  stroke: 'var(--color-muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-popover-foreground)',
  },
} as const

/**
 * The five ramp steps, plus the distinct near-neutral that zero wears.
 *
 * A single hue, light to dark (inverted on the dark theme, where magnitude reads
 * dim to bright) — never a rainbow, which has no readable order for magnitude.
 * Zero gets `--heat-0` rather than the palest step, so "nothing happened" does
 * not look like "a little happened".
 */
export const HEAT_STEPS = [
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
  'var(--color-heat-5)',
]

export const HEAT_ZERO = 'var(--color-heat-0)'

/**
 * The ramp colour for an intensity in `0..1`.
 *
 * `null` intensity means the whole grid was zero (there was no maximum to scale
 * against) and reads as the zero colour. A real zero does too — the ramp starts
 * above it.
 */
export function heatColor(value: number, intensity: number | null): string {
  if (value <= 0 || intensity == null) return HEAT_ZERO
  const step = Math.min(HEAT_STEPS.length - 1, Math.floor(intensity * HEAT_STEPS.length))
  return HEAT_STEPS[step]
}

