import { useMemo } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useStates } from '@/features/master/state'
import { useDistricts } from '@/features/master/district'
import { useOfficeAddresses, type OfficeFor } from '@/features/master/office-address'

interface UseActLookupsOptions {
  /**
   * Whether the acts tab is actually on screen. Everything here is for that tab
   * alone, and none of it is cheap — the branch detail step must not pay for it.
   */
  enabled: boolean
  /**
   * The state Professional Tax points at, so its districts can be narrowed.
   * It's the only act carrying a state — the rest record an office instead.
   */
  ptStateId?: number
}

/**
 * The masters the "Applicable Acts" tab points at: states, districts and the
 * statutory offices, all referenced by id.
 *
 * Only Professional Tax carries a state and district; its districts are read
 * narrowed by `state_id` rather than as the whole master, and only once a state
 * is chosen.
 *
 * Office addresses come per `office_for`, so each act only ever offers the
 * offices of its own body.
 */
export function useActLookups({ enabled, ptStateId }: UseActLookupsOptions) {
  const { data: states } = useStates({ enabled })

  // The cascade waits for its state — no state, nothing to narrow by, and an
  // unnarrowed read would be the whole master.
  const ptDistricts = useDistricts(ptStateId, {
    enabled: enabled && ptStateId !== undefined,
  })

  const pfOffices = useOfficeAddresses('PF', undefined, { enabled })
  const esicOffices = useOfficeAddresses('ESIC', undefined, { enabled })
  const factoryOffices = useOfficeAddresses('FACTORY', undefined, { enabled })
  const lwfOffices = useOfficeAddresses('LWF', undefined, { enabled })
  const exOffices = useOfficeAddresses('EMPLOYMENT EXCHANGE', undefined, { enabled })

  const stateOptions = useMemo<ComboboxOption[]>(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: String(s.id) })),
    [states],
  )

  const ptDistrictOptions = useMemo<ComboboxOption[]>(
    () =>
      (ptDistricts.data ?? []).map((d) => ({
        label: d.districtName,
        value: String(d.id),
      })),
    [ptDistricts.data],
  )

  /** Every office the screens know, keyed by the body that owns it. */
  const offices = useMemo(
    () => ({
      PF: pfOffices.data?.items ?? [],
      ESIC: esicOffices.data?.items ?? [],
      FACTORY: factoryOffices.data?.items ?? [],
      LWF: lwfOffices.data?.items ?? [],
      'EMPLOYMENT EXCHANGE': exOffices.data?.items ?? [],
    }),
    [
      pfOffices.data,
      esicOffices.data,
      factoryOffices.data,
      lwfOffices.data,
      exOffices.data,
    ],
  )

  /**
   * One body's offices as dropdown options. The city rides along in the label
   * because office names repeat across a state and the name alone doesn't say
   * which one the user means.
   */
  const officesFor = useMemo(() => {
    return (officeFor: OfficeFor): ComboboxOption[] =>
      offices[officeFor].map((office) => ({
        label: office.city ? `${office.officeName} — ${office.city}` : office.officeName,
        value: String(office.id),
      }))
  }, [offices])

  // ---- name lookups, for the read-only detail screen ----

  const stateName = useMemo(() => {
    const byId = new Map((states ?? []).map((s) => [s.id, s.stateName]))
    return (id: number | null) => (id === null ? null : (byId.get(id) ?? null))
  }, [states])

  const districtName = useMemo(() => {
    const byId = new Map((ptDistricts.data ?? []).map((d) => [d.id, d.districtName]))
    return (id: number | null) => (id === null ? null : (byId.get(id) ?? null))
  }, [ptDistricts.data])

  const officeName = useMemo(() => {
    return (officeFor: OfficeFor, id: number | null) => {
      if (id === null) return null
      const office = offices[officeFor].find((o) => o.id === id)
      return office ? office.officeName : null
    }
  }, [offices])

  return {
    stateOptions,
    ptDistrictOptions,
    officesFor,
    stateName,
    districtName,
    officeName,
  }
}

export type ActLookups = ReturnType<typeof useActLookups>
