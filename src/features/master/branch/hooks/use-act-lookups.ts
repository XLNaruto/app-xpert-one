import { useWatch, type Control } from 'react-hook-form'
import type { PagedSelect } from '@/hooks/use-paged-select'
import { useStateOption, useStateSelect, type StateSelect } from '@/features/master/state'
import {
  useDistrictOption,
  useDistrictSelect,
  type DistrictSelect,
} from '@/features/master/district'
import {
  useOfficeAddress,
  useOfficeAddressSelect,
} from '@/features/master/office-address'
import type { BranchFormValues } from '../schemas'
import type { BranchActs } from '../types'

/** A field's saved id as the dropdown's `selected`, or nothing when blank. */
const asSelected = (value: string | undefined) => (value ? value : undefined)

interface UseActSelectsOptions {
  control: Control<BranchFormValues>
  /**
   * Whether the acts tab is actually on screen. The office dropdowns are for that
   * tab alone — the branch detail step must not pay for them.
   */
  enabled: boolean
}

/**
 * The "Applicable Acts" tab's dropdowns: the Professional Tax state/district
 * pair and one office dropdown per statutory body, all scroll-lazy and
 * server-searched — nothing here reads a whole master.
 *
 * Each office dropdown lists only the offices of its own body (`office_for`),
 * and each is handed the id its field holds so a saved office shows its label
 * before the page holding it loads.
 */
export function useActSelects({ control, enabled }: UseActSelectsOptions) {
  const [pf, esic, factory, lwf, ex, ptStateId, ptDistrictId] = useWatch({
    control,
    name: [
      'pfOfficeAddressId',
      'esicOfficeAddressId',
      'factoryOfficeAddressId',
      'lwfOfficeAddressId',
      'exOfficeAddressId',
      'ptStateId',
      'ptDistrictId',
    ],
  })

  const ptState: StateSelect = useStateSelect({
    selected: ptStateId ? { value: ptStateId } : undefined,
  })

  // The cascade waits for its state — the district read is narrowed by `state_id`.
  const ptDistrict: DistrictSelect = useDistrictSelect({
    stateId: ptStateId ? Number(ptStateId) : undefined,
    selected: ptDistrictId ? { value: ptDistrictId } : undefined,
  })

  const pfOffice: PagedSelect = useOfficeAddressSelect({
    officeFor: 'PF',
    selected: asSelected(pf),
    enabled,
  })
  const esicOffice = useOfficeAddressSelect({
    officeFor: 'ESIC',
    selected: asSelected(esic),
    enabled,
  })
  const factoryOffice = useOfficeAddressSelect({
    officeFor: 'FACTORY',
    selected: asSelected(factory),
    enabled,
  })
  const lwfOffice = useOfficeAddressSelect({
    officeFor: 'LWF',
    selected: asSelected(lwf),
    enabled,
  })
  const exOffice = useOfficeAddressSelect({
    officeFor: 'EMPLOYMENT EXCHANGE',
    selected: asSelected(ex),
    enabled,
  })

  return {
    ptStateId,
    ptState,
    ptDistrict,
    pfOffice,
    esicOffice,
    factoryOffice,
    lwfOffice,
    exOffice,
  }
}

export type ActSelects = ReturnType<typeof useActSelects>

/**
 * The names behind the ids an acts row saves, for the read-only detail screen.
 * Each is read by id — only the rows actually referenced, never a whole master —
 * and reads as `null` while loading or when the act records none.
 */
export function useActNames(acts: BranchActs | null) {
  // `useOfficeAddress` stays disabled for a non-finite id — an act with no office.
  const pf = useOfficeAddress(acts?.pfOfficeAddressId ?? NaN).data
  const esic = useOfficeAddress(acts?.esicOfficeAddressId ?? NaN).data
  const factory = useOfficeAddress(acts?.factoryOfficeAddressId ?? NaN).data
  const lwf = useOfficeAddress(acts?.lwfOfficeAddressId ?? NaN).data
  const ex = useOfficeAddress(acts?.exOfficeAddressId ?? NaN).data
  const ptState = useStateOption(acts?.ptStateId).data
  const ptDistrict = useDistrictOption(acts?.ptDistrictId).data

  return {
    pfOffice: pf?.officeName ?? null,
    esicOffice: esic?.officeName ?? null,
    factoryOffice: factory?.officeName ?? null,
    lwfOffice: lwf?.officeName ?? null,
    exOffice: ex?.officeName ?? null,
    ptState: ptState?.label ?? null,
    ptDistrict: ptDistrict?.label ?? null,
  }
}

export type ActNames = ReturnType<typeof useActNames>
