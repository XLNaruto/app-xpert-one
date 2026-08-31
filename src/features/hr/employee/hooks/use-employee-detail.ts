import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { decryptId, decryptParams, encryptId, encryptParams } from "@/lib/crypto";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useBanks } from "@/features/master/bank";
import { useStates } from "@/features/master/state";
import { useDistricts } from "@/features/master/district";
import { groupLeaves, useLeaveBalance, useLeaves } from "@/features/hr/leave";
import { EMPLOYEE_SORT } from "../constants";
import { useEmployee, useEmployees } from "../api/use-employees";
import {
  useEmployeeAssets,
  useEmployeeDocuments,
  useEmployeeEducations,
  useEmployeeExperiences,
  useEmployeeFamily,
  useEmployeeKyc,
  useEmployeeTransfers,
  useEmployeeWageStructure,
} from "../api/use-employee-steps";

/** How many leave rows the detail screen previews — the register holds the rest. */
const LEAVE_PREVIEW_LIMIT = 5;

/** How many names the header's employee picker holds at a time — the rest are
    reached by typing, since the search is the endpoint's own. */
const SWITCHER_LIMIT = 25;

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
  const navigate = useNavigate();
  const employeeId = decryptId(data);

  /**
   * Which screen opened this one, so Back retraces the way in rather than
   * always landing in the employee list.
   *
   * Both asset screens host the stock ledger a handout line is clicked from, and
   * they are not interchangeable: from `'asset-detail'` Back returns to that
   * asset with the ledger reopened, from `'asset-list'` it returns to the list.
   * Sending a reader who came off the list into a detail screen they never
   * opened is a jump, not a way back.
   */
  const origin = useMemo(() => {
    const raw = data ? decryptParams<{ from?: string; assetId?: number }>(data) : null;
    const assetIdRaw = Number(raw?.assetId);
    const withAsset =
      Number.isFinite(assetIdRaw) && assetIdRaw > 0 ? assetIdRaw : undefined;

    if (raw?.from === "asset-list")
      return { kind: "asset-list" as const, assetId: withAsset };
    // `'asset'` is the older spelling of the detail screen, still live in any URL
    // opened before the two were told apart.
    if (raw?.from !== "asset-detail" && raw?.from !== "asset") return null;
    return withAsset !== undefined
      ? { kind: "asset-detail" as const, assetId: withAsset }
      : null;
  }, [data]);
  const id = employeeId ?? Number.NaN;

  const detail = useEmployee(id);
  const employee = detail.data;

  const kyc = useEmployeeKyc(id);
  const wage = useEmployeeWageStructure(id);
  const family = useEmployeeFamily(id);
  const educations = useEmployeeEducations(id);
  const experiences = useEmployeeExperiences(id);
  const documents = useEmployeeDocuments(id);
  const assets = useEmployeeAssets(id);
  const transfers = useEmployeeTransfers(id);
  // The register itself lives in Leave Management; this is its last few rows.
  const leaves = useLeaves(
    { limit: LEAVE_PREVIEW_LIMIT, offset: 0 },
    { employeeId: id },
  );

  /*
   * The register answers one row per stored ROW, and an application whose range
   * outran the leave type's paid allowance is stored as two — a paid row and an
   * unpaid one. Grouping them puts the preview back to one line per leave the
   * employee actually filed.
   */
  const leaveGroups = useMemo(
    () => groupLeaves(leaves.data?.items ?? []),
    [leaves.data],
  );

  /**
   * What's left of each leave type's paid allowance this year. It is the other
   * half of the leave story: the history says what was taken, this says what is
   * still paid for.
   */
  const leaveBalance = useLeaveBalance(id, new Date().getFullYear());

  /**
   * The header's employee picker — read another person's record without going
   * back to the list for them.
   *
   * The options are the company's own employees, searched server-side: the
   * roster outgrows any one page, so a typed name is fetched rather than
   * filtered over what happens to be loaded. Debounced for the same reason
   * `usePagination` debounces — not a request per keystroke.
   */
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedSearch = useDebouncedValue(employeeSearch, 300);
  const employeeOptions = useEmployees({
    limit: SWITCHER_LIMIT,
    offset: 0,
    sort: EMPLOYEE_SORT.name,
    sortBy: "asc",
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  });

  const banks = useBanks();
  const states = useStates({ enabled: employee !== undefined });
  const currentDistricts = useDistricts(employee?.currentStateId ?? undefined, {
    enabled: employee?.currentStateId != null,
  });
  const permanentDistricts = useDistricts(
    employee?.permanentStateId ?? undefined,
    {
      enabled: employee?.permanentStateId != null,
    },
  );

  /** A stored state id → the name the screen shows. */
  const stateName = (stateId: number | null) =>
    stateId === null
      ? ""
      : (states.data?.find((state) => state.id === stateId)?.stateName ?? "");

  const districtName = (
    stateId: number | null,
    districtId: number | null,
    which: "current" | "permanent",
  ) => {
    if (stateId === null || districtId === null) return "";
    const list =
      which === "current" ? currentDistricts.data : permanentDistricts.data;
    return (
      list?.find((district) => district.id === districtId)?.districtName ?? ""
    );
  };

  const bankName =
    (banks.data?.items ?? []).find((bank) => bank.id === kyc.data?.bankId)
      ?.bankName ?? "";

  /**
   * The posting the header names. `service` on the employee row carries the
   * terms but only ids, while the transfer register carries the names — so the
   * open row (or the newest one, on someone who has left) supplies them.
   */
  const posting =
    transfers.data?.find((transfer) => transfer.isCurrent) ??
    transfers.data?.[0] ??
    null;

  const leavingDate = employee?.service?.leavingDate ?? "";
  const isActive = employee?.service != null && leavingDate === "";

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
    leaveGroups,
    leaveBalance,

    posting,
    isActive,
    bankName,
    stateName,
    districtName,

    /** The header's employee switcher: who is on show, and the roster behind it. */
    employeeOptions: employeeOptions.data?.items ?? [],
    employeesLoading: employeeOptions.isFetching,
    employeeSearch,
    setEmployeeSearch,
    /**
     * Show another employee's record. It's a navigation, not local state: the
     * screen answers whoever the `?data=` token names, so the token is what has
     * to change — a refresh or a Back then stays honest.
     */
    changeEmployee: (id: number) => {
      if (id === employeeId) return;
      setEmployeeSearch("");
      void navigate({
        to: "/hr/employee/detail",
        search: { data: encryptId(id) },
      });
    },

    /**
     * Back up one level, along the way this screen was actually reached.
     *
     * Opened from an asset's stock history, the asset side is the parent — Back
     * returns to the screen that ledger was opened on (the detail screen with the
     * ledger reopened, or the asset list), not to a list the reader never passed
     * through. Everything else falls back to the employee list.
     */
    goToList: () => {
      if (origin?.kind === "asset-detail") {
        void navigate({
          to: "/master/asset/detail",
          search: { data: encryptParams({ id: origin.assetId, history: true }) },
        });
        return;
      }
      if (origin?.kind === "asset-list") {
        void navigate({
          to: "/master/asset",
          // The ledger was open when they left it, so it comes back open — the
          // list screen reopens it from this token.
          search:
            origin.assetId !== undefined
              ? { data: encryptParams({ id: origin.assetId, history: true }) }
              : {},
        });
        return;
      }
      void navigate({ to: "/hr/employee" });
    },
    goToEdit: () =>
      employeeId !== undefined &&
      navigate({
        to: "/hr/employee/create",
        search: { data: encryptId(employeeId) },
      }),
    /**
     * This person's attendance month.
     *
     * The month screen answers a timesheet rather than an employee record, so
     * the token carries the name and code it has to print. There's no group to
     * come from here, which the screen already tolerates: no employee switcher.
     * `from: 'employee'` is what keeps the hierarchy honest — the month screen
     * was entered from this record, so its Back returns here rather than
     * dropping into Attendance Management, which was never on the way.
     */
    goToAttendance: () =>
      employeeId !== undefined &&
      navigate({
        to: "/hr/attendance/employee",
        search: {
          data: encryptParams({
            employeeId,
            name: [employee?.prefix, employee?.name].filter(Boolean).join(" "),
            code: employee?.code ?? "",
            from: "employee",
            date: format(new Date(), "yyyy-MM-dd"),
          }),
        },
      }),
  };
}
