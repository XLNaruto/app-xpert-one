import { useNavigate } from '@tanstack/react-router'
import { decryptId, encryptId } from '@/lib/crypto'
import { useBanks } from '@/features/master/bank'
import { useStates } from '@/features/master/state'
import { useDistricts } from '@/features/master/district'
import { useLeaves } from '@/features/hr/leave'
import { useEmployee } from '../api/use-employees'
import {
  useEmployeeAssets,
  useEmployeeDocuments,
  useEmployeeEducations,
  useEmployeeExperiences,
  useEmployeeFamily,
  useEmployeeKyc,
  useEmployeeTransfers,
  useEmployeeWageStructure,
} from '../api/use-employee-steps'

/** How many leave rows the detail screen previews — the register holds the rest. */
const LEAVE_PREVIEW_LIMIT = 5

/**
 * Everything the read-only employee screen reads and derives.
 *
 * The record is spread across ten endpoints, so they're all fired at once: this
 * is the screen someone opens to answer a question, and paging them section by
 * section would mean ten waits instead of one. Each hook is gated on a real id,
 * so nothing fires while the token is unreadable.
 *
 * Three lookups sit on top of the record itself, because the employee row stores
 * ids where the screen has to show names: the bank behind `kyc.bankId`, and the
 * state / district behind each address. Districts are read per state rather than
 * as the whole master, which is hundreds of rows.
 */
export function useEmployeeDetail(data?: string) {
  const navigate = useNavigate()
  const employeeId = decryptId(data)
  const id = employeeId ?? Number.NaN

  const detail = useEmployee(id)
  const employee = detail.data

  const kyc = useEmployeeKyc(id)
  const wage = useEmployeeWageStructure(id)
  const family = useEmployeeFamily(id)
  const educations = useEmployeeEducations(id)
  const experiences = useEmployeeExperiences(id)
  const documents = useEmployeeDocuments(id)
  const assets = useEmployeeAssets(id)
  const transfers = useEmployeeTransfers(id)
  // The register itself lives in Leave Management; this is its last few rows.
  const leaves = useLeaves(
    { limit: LEAVE_PREVIEW_LIMIT, offset: 0 },
    { employeeId: id },
  )

  const banks = useBanks()
  const states = useStates({ enabled: employee !== undefined })
  const currentDistricts = useDistricts(employee?.currentStateId ?? undefined, {
    enabled: employee?.currentStateId != null,
  })
  const permanentDistricts = useDistricts(employee?.permanentStateId ?? undefined, {
    enabled: employee?.permanentStateId != null,
  })

  /** A stored state id → the name the screen shows. */
  const stateName = (stateId: number | null) =>
    stateId === null
      ? ''
      : (states.data?.find((state) => state.id === stateId)?.stateName ?? '')

  const districtName = (
    stateId: number | null,
    districtId: number | null,
    which: 'current' | 'permanent',
  ) => {
    if (stateId === null || districtId === null) return ''
    const list = which === 'current' ? currentDistricts.data : permanentDistricts.data
    return list?.find((district) => district.id === districtId)?.districtName ?? ''
  }

  const bankName =
    (banks.data?.items ?? []).find((bank) => bank.id === kyc.data?.bankId)?.bankName ?? ''

  /**
   * The posting the header names. `service` on the employee row carries the
   * terms but only ids, while the transfer register carries the names — so the
   * open row (or the newest one, on someone who has left) supplies them.
   */
  const posting =
    transfers.data?.find((transfer) => transfer.isCurrent) ?? transfers.data?.[0] ?? null

  const leavingDate = employee?.service?.leavingDate ?? ''
  const isActive = employee?.service != null && leavingDate === ''

  return {
    employeeId,
    detail,
    employee,

    kyc,
    wage,
    family,
    educations,
    experiences,
    documents,
    assets,
    transfers,
    leaves,

    posting,
    isActive,
    bankName,
    stateName,
    districtName,

    goToList: () => navigate({ to: '/hr/employee' }),
    goToEdit: () =>
      employeeId !== undefined &&
      navigate({ to: '/hr/employee/create', search: { data: encryptId(employeeId) } }),
  }
}
