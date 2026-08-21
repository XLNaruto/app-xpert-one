import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  Boxes,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Eye,
  FileStack,
  FileText,
  GraduationCap,
  Heart,
  IdCard,
  Landmark,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Plane,
  // ScanFace, // Registered Faces section is hidden for now.
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { formatAmount } from "@/lib/currency";
import { getApiErrorMessage, isForbiddenError } from "@/lib/api-error";
import { useMediaResolver, useMediaUrl } from "@/hooks/use-media-url";
import { PageHeader } from "@/components/common/page-header";
import {
  CollapsibleSection,
  CollapsibleSectionGroup,
  useCollapsibleSectionGroup,
} from "@/components/common/collapsible-section";
import { DetailItem } from "@/components/common/detail-item";
import { EmptyState } from "@/components/common/empty-state";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Forbidden, NotFound } from "@/features/error";
import { PERMISSIONS, useResourceAccess } from "@/features/permissions";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CONTRACT_PERIOD_TYPE_OPTIONS,
} from "../constants";
import { useEmployeeDetail } from "../hooks/use-employee-detail";
import { isDocumentExpired } from "../lib/employee-step-mappers";
import type { Employee, EmployeeTransfer } from "../types";

/** An option value → its label, falling back to the stored value. */
function labelOf(
  options: { label: string; value: string }[],
  value: string | undefined,
): string {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label ?? value;
}

/** An API date → what the screen shows, blank staying blank. */
function onDate(value: string | null | undefined): string | null {
  return value ? formatDate(value) : null;
}

/**
 * The read-only 360° view of one employee — everything the eight steps captured,
 * on one page.
 *
 * Every part of the record is its own collapsible section, opening on the ones
 * that answer most questions (who they are, how to reach them, where they sit)
 * and leaving the registers — documents, postings, leave — shut but counted, so
 * the page opens short and the header alone says what's inside each block.
 */
export function EmployeeDetailPage({ data }: { data?: string }) {
  const {
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
    goToList,
    goToEdit,
    goToAttendance,
  } = useEmployeeDetail(data);

  // The Edit button is the only write this screen offers.
  const { canUpdate } = useResourceAccess(PERMISSIONS.employees);
  // Attendance is another module — the link only shows if it's reachable.
  const { canView: canViewAttendance } = useResourceAccess(
    PERMISSIONS.attendance,
  );

  /* One control over every section below. `allOpen` is null until it's pressed,
     when the sections are still on their own defaults — mixed, so the offer is
     to expand. */
  const { signal, expandAll, collapseAll, allOpen } =
    useCollapsibleSectionGroup();

  const resolveMedia = useMediaResolver();

  // No usable token — nothing to show.
  if (employeeId === undefined) return <NotFound />;

  if (isForbiddenError(detail.error)) {
    return <Forbidden description={getApiErrorMessage(detail.error)} />;
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!employee) return <NotFound />;

  const service = employee.service;
  const familyRows = family.data ?? [];
  const educationRows = educations.data ?? [];
  const experienceRows = experiences.data ?? [];
  const documentRows = documents.data ?? [];
  const assetRows = assets.data ?? [];
  const transferRows = transfers.data ?? [];
  const leaveRows = leaves.data?.items ?? [];
  // const faces = employee.faces // Registered Faces section is hidden for now.

  return (
    <div>
      <PageHeader
        title="Employee Detail"
        description="Everything on record, read-only"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={allOpen ? collapseAll : expandAll}
              aria-pressed={allOpen === true}
            >
              {allOpen ? (
                <ChevronsDownUp className="size-4" />
              ) : (
                <ChevronsUpDown className="size-4" />
              )}
              {allOpen ? "Collapse All" : "Expand All"}
            </Button>
            {canViewAttendance && (
              <Button variant="outline" onClick={goToAttendance}>
                <CalendarCheck className="size-4" />
                Attendance
              </Button>
            )}
            {canUpdate && (
              <Button variant="outline" onClick={goToEdit}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <EmployeeHero
          employee={employee}
          posting={posting}
          isActive={isActive}
        />

        <CollapsibleSectionGroup signal={signal}>
          <div className="space-y-4">
            {/* ── Personal ───────────────────────────────────────────────────── */}

            <CollapsibleSection icon={UserRound} title="Personal Details">
              <Grid>
                <DetailItem
                  label="Full Name"
                  value={
                    [employee.prefix, employee.name]
                      .filter(Boolean)
                      .join(" ") || null
                  }
                />
                <DetailItem label="Gender" value={employee.gender || null} />
                <DetailItem
                  label="Date of Birth"
                  value={onDate(employee.birthDate)}
                />
                <DetailItem
                  label="Marital Status"
                  value={
                    labelOf(MARITAL_STATUS_OPTIONS, employee.maritalStatus) ||
                    null
                  }
                />
                <DetailItem
                  label="Relation"
                  value={employee.relation || null}
                />
                <DetailItem
                  label="Relative Name"
                  value={employee.relativeName || null}
                />
                <DetailItem
                  label="Nationality"
                  value={employee.nationality || null}
                />
                <DetailItem
                  label="Employee Code"
                  value={employee.code || null}
                />
                {employee.remarks && (
                  <DetailItem
                    label="Remarks"
                    value={employee.remarks}
                    className="sm:col-span-2 lg:col-span-4"
                  />
                )}
              </Grid>
            </CollapsibleSection>

            {/* ── Contact ────────────────────────────────────────────────────── */}

            <CollapsibleSection icon={Phone} title="Contact Details">
              <Grid>
                <DetailItem
                  label="Mobile Number 1"
                  value={employee.mobileNumber1 || null}
                />
                <DetailItem
                  label="Mobile Number 2"
                  value={employee.mobileNumber2 || null}
                />
                <DetailItem
                  label="Landline Number"
                  value={employee.landlineNumber || null}
                />
                <DetailItem
                  label="Email Address"
                  value={employee.email || null}
                />
              </Grid>
            </CollapsibleSection>

            {/* ── Address ────────────────────────────────────────────────────── */}

            <CollapsibleSection icon={MapPin} title="Address Details">
              <SubHeading icon={MapPin} title="Current Address" />
              <Grid>
                <DetailItem
                  label="Address Line 1"
                  value={employee.currentAddress1 || null}
                />
                <DetailItem
                  label="Address Line 2"
                  value={employee.currentAddress2 || null}
                />
                <DetailItem
                  label="Address Line 3"
                  value={employee.currentAddress3 || null}
                />
                <DetailItem
                  label="Country"
                  value={employee.currentCountry || null}
                />
                <DetailItem
                  label="State"
                  value={stateName(employee.currentStateId) || null}
                />
                <DetailItem
                  label="District"
                  value={
                    districtName(
                      employee.currentStateId,
                      employee.currentDistrictId,
                      "current",
                    ) || null
                  }
                />
                <DetailItem
                  label="Taluka"
                  value={employee.currentTaluka || null}
                />
                <DetailItem label="City" value={employee.currentCity || null} />
                <DetailItem
                  label="Pincode"
                  value={employee.currentPinCode || null}
                />
              </Grid>

              <SubHeading icon={MapPin} title="Permanent Address" />
              <Grid>
                <DetailItem
                  label="Address Line 1"
                  value={employee.permanentAddress1 || null}
                />
                <DetailItem
                  label="Address Line 2"
                  value={employee.permanentAddress2 || null}
                />
                <DetailItem
                  label="Address Line 3"
                  value={employee.permanentAddress3 || null}
                />
                <DetailItem
                  label="Country"
                  value={employee.permanentCountry || null}
                />
                <DetailItem
                  label="State"
                  value={stateName(employee.permanentStateId) || null}
                />
                <DetailItem
                  label="District"
                  value={
                    districtName(
                      employee.permanentStateId,
                      employee.permanentDistrictId,
                      "permanent",
                    ) || null
                  }
                />
                <DetailItem
                  label="Taluka"
                  value={employee.permanentTaluka || null}
                />
                <DetailItem
                  label="City"
                  value={employee.permanentCity || null}
                />
                <DetailItem
                  label="Pincode"
                  value={employee.permanentPinCode || null}
                />
              </Grid>
            </CollapsibleSection>

            {/* ── Service ────────────────────────────────────────────────────── */}

            <CollapsibleSection
              icon={Briefcase}
              title="Service Details"
              isLoading={transfers.isLoading}
            >
              {service === null ? (
                <p className="text-sm text-muted-foreground">
                  No open posting — every posting on this record has been
                  closed.
                </p>
              ) : (
                <>
                  <Grid>
                    <DetailItem
                      label="Company"
                      value={posting?.companyName || null}
                    />
                    <DetailItem
                      label="Branch"
                      value={posting?.branchName || null}
                    />
                    <DetailItem
                      label="Department"
                      value={posting?.departmentName || null}
                    />
                    <DetailItem
                      label="Designation"
                      value={posting?.designationName || null}
                    />
                    <DetailItem label="Grade" value={service.grade || null} />
                    <DetailItem
                      label="Employment Type"
                      value={
                        labelOf(
                          EMPLOYMENT_TYPE_OPTIONS,
                          service.employmentType,
                        ) || null
                      }
                    />
                    <DetailItem
                      label="Contract Period"
                      value={
                        service.contractPeriod
                          ? `${service.contractPeriod} ${labelOf(
                              CONTRACT_PERIOD_TYPE_OPTIONS,
                              service.contractPeriodType,
                            )}`
                          : null
                      }
                    />
                    <DetailItem
                      label="Joining Date"
                      value={onDate(service.joiningDate)}
                    />
                    <DetailItem
                      label="Confirmation Date"
                      value={onDate(service.confirmationDate)}
                    />
                    <DetailItem
                      label="Renewal Date"
                      value={onDate(service.renewalDate)}
                    />
                  </Grid>

                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 border-t border-dashed pt-4">
                    <BoolChip
                      label="Police Verified"
                      value={employee.isPoliceVerified}
                    />
                    <BoolChip
                      label="Stamp Agreement"
                      value={employee.isStampAgreement}
                    />
                  </div>

                  {service.leavingDate && (
                    <>
                      <SubHeading
                        icon={LogOut}
                        title="Leaving Details"
                        tone="destructive"
                      />
                      <Grid>
                        <DetailItem
                          label="Leaving Date"
                          value={onDate(service.leavingDate)}
                        />
                        <DetailItem
                          label="Leaving Reason"
                          value={service.leavingReason || null}
                          className="sm:col-span-2"
                        />
                      </Grid>
                    </>
                  )}
                </>
              )}
            </CollapsibleSection>

            {/* ── Health ─────────────────────────────────────────────────────── */}

            <CollapsibleSection icon={Heart} title="Health Details">
              <Grid>
                <DetailItem
                  label="Blood Group"
                  value={employee.bloodGroup || null}
                />
                <DetailItem
                  label="Height"
                  value={
                    employee.height
                      ? `${employee.height} ${employee.heightUnit}`
                      : null
                  }
                />
                <DetailItem
                  label="Weight"
                  value={
                    employee.weight
                      ? `${employee.weight} ${employee.weightUnit}`
                      : null
                  }
                />
                <div>
                  <BoolChip label="Disability" value={employee.isDisability} />
                </div>
              </Grid>
            </CollapsibleSection>

            {/* ── KYC ────────────────────────────────────────────────────────── */}

            <CollapsibleSection
              icon={ShieldCheck}
              title="KYC & Identity"
              isLoading={kyc.isLoading}
            >
              <Grid>
                <DetailItem
                  label="PF Number"
                  value={kyc.data?.pfNumber || null}
                />
                <DetailItem
                  label="UAN Number"
                  value={kyc.data?.uanNumber || null}
                />
                <DetailItem
                  label="ESIC Number"
                  value={kyc.data?.esicNumber || null}
                />
                <DetailItem
                  label="Aadhaar Number"
                  value={kyc.data?.aadharNumber || null}
                />
                <DetailItem
                  label="Name as per Aadhaar"
                  value={kyc.data?.nameAsPerAadhar || null}
                />
                <DetailItem
                  label="PAN Number"
                  value={kyc.data?.panNumber || null}
                />
                <DetailItem
                  label="EPIC Number"
                  value={kyc.data?.epicNumber || null}
                />
                <DetailItem
                  label="Ration Card Number"
                  value={kyc.data?.rationCardNumber || null}
                />
              </Grid>

              <SubHeading icon={Landmark} title="Bank Details" />
              <Grid>
                <DetailItem label="Bank Name" value={bankName || null} />
                <DetailItem
                  label="Account Number"
                  value={kyc.data?.bankAccountNumber || null}
                />
                <DetailItem
                  label="IFSC Code"
                  value={kyc.data?.ifscCode || null}
                />
                <DetailItem
                  label="Branch Name"
                  value={kyc.data?.bankBranchName || null}
                />
              </Grid>

              <SubHeading icon={IdCard} title="Driving Licence" />
              <Grid>
                <DetailItem
                  label="Licence Number"
                  value={kyc.data?.drivingLicenceNumber || null}
                />
                <DetailItem
                  label="Expiry Date"
                  value={onDate(kyc.data?.drivingLicenceExpiryDate)}
                />
              </Grid>

              <SubHeading icon={Plane} title="Passport Details" />
              <Grid>
                <DetailItem
                  label="Passport Number"
                  value={kyc.data?.passportNumber || null}
                />
                <DetailItem
                  label="Valid From"
                  value={onDate(kyc.data?.passportValidFrom)}
                />
                <DetailItem
                  label="Valid To"
                  value={onDate(kyc.data?.passportValidTo)}
                />
              </Grid>
            </CollapsibleSection>

            {/* ── Wage structure ─────────────────────────────────────────────── */}

            <CollapsibleSection
              icon={Banknote}
              title="Wage Structure"
              description="Inherited from the designation on the current posting"
              isLoading={wage.isLoading}
            >
              {!wage.data ? (
                <p className="text-sm text-muted-foreground">
                  No wage structure in force for this employee&apos;s
                  designation.
                </p>
              ) : (
                <>
                  <Grid>
                    <DetailItem
                      label="Salary Type"
                      value={wage.data.salaryType || null}
                    />
                    <DetailItem
                      label="Basic Salary"
                      value={
                        wage.data.basicPay === null
                          ? null
                          : formatAmount(wage.data.basicPay)
                      }
                    />
                    <DetailItem
                      label="Wages Per Day"
                      value={
                        wage.data.wagesPerDay === null
                          ? null
                          : formatAmount(wage.data.wagesPerDay)
                      }
                    />
                    <DetailItem
                      label="Working Days"
                      value={
                        wage.data.workingDays === null
                          ? null
                          : String(wage.data.workingDays)
                      }
                    />
                    <DetailItem
                      label="Weekly Off"
                      value={wage.data.weeklyOff || "None"}
                    />
                    <DetailItem
                      label="Applicable Date"
                      value={onDate(wage.data.applicableDate)}
                    />
                  </Grid>

                  <SubHeading icon={ShieldCheck} title="Acts Applicable" />
                  <div className="flex flex-wrap gap-2">
                    <ActChip label="PF Act" on={wage.data.isPfActApplicable} />
                    <ActChip
                      label="ESIC Act"
                      on={wage.data.isEsicActApplicable}
                    />
                    <ActChip label="PT Act" on={wage.data.isPtActApplicable} />
                    <ActChip
                      label="LWF Act"
                      on={wage.data.isLwfActApplicable}
                    />
                    <ActChip
                      label="TDS Act"
                      on={wage.data.isTdsActApplicable}
                    />
                    <ActChip
                      label="Overtime"
                      on={wage.data.isOvertimeApplicable}
                    />
                  </div>

                  {wage.data.isPfActApplicable && (
                    <ActCard icon={ShieldCheck} title="PF Act Settings">
                      <DetailItem
                        label="Deduction Type"
                        value={wage.data.pfDeductionType || null}
                      />
                      <DetailItem
                        label="Deduction Amount"
                        value={
                          wage.data.pfDeductionAmount === null
                            ? null
                            : String(wage.data.pfDeductionAmount)
                        }
                      />
                      <div>
                        <BoolChip
                          label="Employee PF on Wage Limit"
                          value={wage.data.isEmployeePfContributionOnWageLimit}
                        />
                      </div>
                      <div>
                        <BoolChip
                          label="Employer PF on Wage Limit"
                          value={wage.data.isEmployerPfContributionOnWageLimit}
                        />
                      </div>
                    </ActCard>
                  )}

                  {wage.data.isEsicActApplicable && (
                    <ActCard icon={ShieldCheck} title="ESIC Act Settings">
                      <DetailItem
                        label="Deduction Basis"
                        value={wage.data.esicDeductionBasis || null}
                      />
                    </ActCard>
                  )}

                  {wage.data.isPtActApplicable && (
                    <ActCard icon={ShieldCheck} title="PT Act Settings">
                      <DetailItem
                        label="PT Type"
                        value={wage.data.ptActType || null}
                      />
                      <DetailItem
                        label="PT Amount"
                        value={
                          wage.data.ptAmount === null
                            ? null
                            : formatAmount(wage.data.ptAmount)
                        }
                      />
                    </ActCard>
                  )}

                  {wage.data.isLwfActApplicable && (
                    <ActCard icon={ShieldCheck} title="LWF Act Settings">
                      <DetailItem
                        label="LWF Type"
                        value={wage.data.lwfActType || null}
                      />
                      <DetailItem
                        label="LWF Amount"
                        value={
                          wage.data.lwfAmount === null
                            ? null
                            : formatAmount(wage.data.lwfAmount)
                        }
                      />
                      <div>
                        <BoolChip
                          label="Deduct from Wages"
                          value={wage.data.isLwfDeductFromWages}
                        />
                      </div>
                    </ActCard>
                  )}

                  {wage.data.isOvertimeApplicable && (
                    <ActCard icon={CalendarDays} title="Overtime Settings">
                      <DetailItem
                        label="Rate Per Hour"
                        value={
                          wage.data.overtimeRatePerHour === null
                            ? null
                            : formatAmount(wage.data.overtimeRatePerHour)
                        }
                      />
                      <div>
                        <BoolChip
                          label="PF on OT"
                          value={wage.data.isPfApplicableOnOvertime}
                        />
                      </div>
                      <div>
                        <BoolChip
                          label="ESIC on OT"
                          value={wage.data.isEsicApplicableOnOvertime}
                        />
                      </div>
                      <div>
                        <BoolChip
                          label="PT on OT"
                          value={wage.data.isPtApplicableOnOvertime}
                        />
                      </div>
                    </ActCard>
                  )}

                  {wage.data.salaryComponents.length > 0 && (
                    <>
                      <SubHeading icon={Banknote} title="Salary Components" />
                      <div className="divide-y divide-border">
                        {wage.data.salaryComponents.map((component) => (
                          <Row
                            key={`${component.payComponentId}-${component.sortOrder}`}
                            primary={component.componentType || "Component"}
                            secondary={component.amountType || "—"}
                            trailing={
                              <span className="text-sm font-semibold text-foreground">
                                {formatAmount(component.amount)}
                              </span>
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </CollapsibleSection>

            {/* ── The registers ──────────────────────────────────────────────── */}

            <CollapsibleSection
              icon={Users}
              title="Family Details"
              defaultOpen={false}
              isLoading={family.isLoading}
              badge={<CountBadge count={familyRows.length} />}
            >
              {familyRows.length === 0 ? (
                <EmptyState icon={Users} title="No family members recorded." />
              ) : (
                <div className="divide-y divide-border">
                  {familyRows.map((member) => (
                    <Row
                      key={member.id}
                      primary={member.fullName}
                      secondary={[member.relation, member.aadharNumber]
                        .filter(Boolean)
                        .join(" · ")}
                      trailing={
                        <div className="flex items-center gap-2">
                          {member.isNominee && (
                            <Badge variant="success">Nominee</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {onDate(member.birthDate) ?? ""}
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              icon={GraduationCap}
              title="Education & Experience"
              defaultOpen={false}
              isLoading={educations.isLoading || experiences.isLoading}
              badge={
                <CountBadge
                  count={educationRows.length + experienceRows.length}
                />
              }
            >
              <SubHeading icon={GraduationCap} title="Education" />
              {educationRows.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No qualifications recorded.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {educationRows.map((education) => (
                    <Row
                      key={education.id}
                      primary={education.educationName}
                      secondary={education.board || "—"}
                      trailing={
                        <div className="flex items-center gap-2">
                          {education.passingYear && (
                            <Badge variant="secondary">
                              {education.passingYear}
                            </Badge>
                          )}
                          {education.percentage && (
                            <span className="text-xs text-muted-foreground">
                              {education.percentage}%
                            </span>
                          )}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}

              <SubHeading icon={Briefcase} title="Work Experience" />
              {experienceRows.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No experience records.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {experienceRows.map((experience) => (
                    <Row
                      key={experience.id}
                      primary={experience.companyName}
                      secondary={
                        /* The CTC type is nullable — a blank says the row doesn't state it. */
                        [
                          experience.designation,
                          experience.salary &&
                            `${experience.salary}${
                              experience.ctcType === "MONTHLY"
                                ? " / month"
                                : experience.ctcType === "YEARLY"
                                  ? " / year"
                                  : ""
                            }`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                      trailing={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/*
                        A verified row always names its verifier — the API's CHECK
                        won't store one without the other — so the name is safe to
                        read straight off the badge.
                      */}
                          {experience.isVerified && (
                            <Badge variant="success">
                              {experience.verifiedByName
                                ? `Verified by ${experience.verifiedByName}`
                                : "Verified"}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {experience.fromDate || "—"} →{" "}
                            {experience.toDate || "—"}
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              icon={FileStack}
              title="Documents"
              defaultOpen={false}
              isLoading={documents.isLoading}
              badge={<CountBadge count={documentRows.length} />}
            >
              {documentRows.length === 0 ? (
                <EmptyState icon={FileStack} title="No documents attached." />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documentRows.map((document) => {
                    const expired = isDocumentExpired(document);
                    const href = resolveMedia(document.document);
                    return (
                      <div
                        key={document.id}
                        className="overflow-hidden rounded-xl border bg-card"
                      >
                        <div
                          className={cn(
                            "h-1 w-full",
                            expired ? "bg-destructive" : "bg-success",
                          )}
                        />
                        <div className="flex items-start gap-3 p-4">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold uppercase text-foreground">
                              {document.documentName || "Attachment"}
                            </p>
                            {document.documentTypeName && (
                              <Badge variant="default" className="mt-1">
                                {document.documentTypeName}
                              </Badge>
                            )}
                            {document.expiryDate && (
                              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                Expires
                                <span
                                  className={cn(
                                    "font-semibold",
                                    expired
                                      ? "text-destructive"
                                      : "text-foreground",
                                  )}
                                >
                                  {onDate(document.expiryDate)}
                                </span>
                                {expired && (
                                  <Badge variant="destructive">Expired</Badge>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        {document.document && (
                          <div className="grid grid-cols-2 gap-2 border-t p-3">
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                            >
                              <Eye className="size-4" />
                              Preview
                            </a>
                            <a
                              href={href}
                              download
                              className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                              })}
                            >
                              <Download className="size-4" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              icon={Boxes}
              title="Assets"
              defaultOpen={false}
              isLoading={assets.isLoading}
              badge={<CountBadge count={assetRows.length} />}
            >
              {assetRows.length === 0 ? (
                <EmptyState icon={Boxes} title="No assets issued." />
              ) : (
                <div className="divide-y divide-border">
                  {assetRows.map((asset) => (
                    <Row
                      key={asset.id}
                      primary={asset.assetName || "Asset"}
                      secondary={
                        asset.assignedDate
                          ? `Issued ${onDate(asset.assignedDate)}`
                          : "—"
                      }
                      trailing={
                        <Badge
                          variant={
                            asset.status === "ASSIGNED"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {asset.status || "—"}
                        </Badge>
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              icon={ArrowRightLeft}
              title="Posting History"
              defaultOpen={false}
              isLoading={transfers.isLoading}
              badge={<CountBadge count={transferRows.length} />}
            >
              {transferRows.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="No postings recorded."
                />
              ) : (
                <div className="divide-y divide-border">
                  {transferRows.map((transfer) => (
                    <Row
                      key={transfer.id}
                      primary={`${transfer.designationName || "—"} · ${transfer.companyName || "—"}`}
                      secondary={
                        [transfer.branchName, transfer.departmentName]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                      trailing={
                        <div className="flex items-center gap-2">
                          {transfer.isCurrent && (
                            <Badge variant="success">Current</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {onDate(transfer.joiningDate) ?? "—"} →{" "}
                            {onDate(transfer.leavingDate) ?? "present"}
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Registered Faces — hidden for now.
        <CollapsibleSection
          icon={ScanFace}
          title="Registered Faces"
          description="Captured in the mobile app for attendance recognition"
          defaultOpen={false}
          badge={<CountBadge count={faces.length} />}
        >
          {faces.length === 0 ? (
            <EmptyState icon={ScanFace} title="No face images registered." />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {faces.map((face, index) => (
                <figure
                  key={face.id}
                  className="overflow-hidden rounded-xl border bg-muted/30"
                >
                  <div className="relative">
                    <span className="absolute left-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-foreground/70 text-xs font-semibold text-background">
                      {index + 1}
                    </span>
                    <ImageWithFallback
                      src={resolveMedia(face.url || face.key)}
                      alt={`Face ${index + 1}`}
                      wrapperClassName="aspect-square w-full bg-muted"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="truncate px-3 py-2 text-xs text-muted-foreground">
                    Face {index + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </CollapsibleSection>
        */}

            <CollapsibleSection
              icon={CalendarDays}
              title="Leave History"
              description="The five most recent records — the full register is under Leave Management"
              defaultOpen={false}
              isLoading={leaves.isLoading}
              badge={<CountBadge count={leaveRows.length} />}
            >
              {leaveRows.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No leave recorded." />
              ) : (
                <div className="divide-y divide-border">
                  {leaveRows.map((leave) => (
                    <Row
                      key={leave.id}
                      primary={
                        leave.leaveTypeName || leave.leaveType || "Leave"
                      }
                      secondary={`${onDate(leave.fromDate) ?? "—"} → ${
                        onDate(leave.toDate) ?? "—"
                      }`}
                      trailing={
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              leave.payType === "PAID" ? "default" : "warning"
                            }
                          >
                            {leave.payType}
                          </Badge>
                          <Badge
                            variant={
                              leave.status === "APPROVED"
                                ? "success"
                                : leave.status === "PENDING"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {leave.status}
                          </Badge>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </CollapsibleSectionGroup>
      </div>
    </div>
  );
}

/**
 * Who this record is, above the fold: the photo, the name, where they sit, and
 * the two things a caller reaches for — the joining date and a phone number.
 */
function EmployeeHero({
  employee,
  posting,
  isActive,
}: {
  employee: Employee;
  posting: EmployeeTransfer | null;
  isActive: boolean;
}) {
  const photoUrl = useMediaUrl(employee.photo);
  const fullName =
    [employee.prefix, employee.name].filter(Boolean).join(" ") || "Unnamed";
  const initial = (employee.name || "?").trim().charAt(0).toUpperCase();
  const where = [
    posting?.designationName,
    posting?.departmentName,
    posting?.branchName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="overflow-hidden border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
      <CardContent className="flex flex-wrap items-start gap-5 p-5">
        {employee.photo ? (
          <ImageWithFallback
            src={photoUrl}
            alt={fullName}
            wrapperClassName="size-16 shrink-0 rounded-2xl ring-1 ring-primary/20"
            className="object-cover"
          />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-2xl font-semibold text-primary ring-1 ring-primary/20">
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {fullName}
            </h2>
            {employee.code && (
              <Badge variant="default" className="font-mono">
                #{employee.code}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {where || "No posting on record"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={isActive ? "success" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            {employee.service?.employmentType && (
              <Badge variant="secondary">
                {labelOf(
                  EMPLOYMENT_TYPE_OPTIONS,
                  employee.service.employmentType,
                )}
              </Badge>
            )}
            {employee.service?.grade && (
              <Badge variant="warning">Grade {employee.service.grade}</Badge>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-1.5 text-sm text-muted-foreground">
          {employee.service?.joiningDate && (
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Joined {onDate(employee.service.joiningDate)}
            </p>
          )}
          {employee.mobileNumber1 && (
            <p className="flex items-center gap-2">
              <Phone className="size-4" />
              {employee.mobileNumber1}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** The four-up grid every section's fields sit in. */
function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

/** A labelled divider inside a section — "Current Address", "Bank Details". */
function SubHeading({
  icon: Icon,
  title,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  tone?: "primary" | "destructive";
}) {
  return (
    <div
      className={cn(
        "mb-3 mt-6 flex items-center gap-1.5 border-t border-dashed pt-4 text-xs font-semibold uppercase tracking-wide first:mt-0 first:border-0 first:pt-0",
        tone === "destructive" ? "text-destructive" : "text-primary",
      )}
    >
      <Icon className="size-3.5" />
      {title}
    </div>
  );
}

/** A yes/no field, shown as a chip rather than the word on its own. */
function BoolChip({ label, value }: { label: string; value: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <span
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          value
            ? "bg-success/12 text-success"
            : "bg-muted text-muted-foreground",
        )}
      >
        {value ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <XCircle className="size-3.5" />
        )}
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

/** One act in the applicable/not-applicable strip. */
function ActChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
        on
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {on ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <XCircle className="size-3.5" />
      )}
      {label}
    </span>
  );
}

/** The settings behind one applicable act, boxed off from the rest. */
function ActCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/4 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

/** The count a closed section shows, so it says what's inside before it opens. */
function CountBadge({ count }: { count: number }) {
  return count === 0 ? (
    <Badge variant="warning">No data</Badge>
  ) : (
    <Badge variant="secondary">{count}</Badge>
  );
}

/** One register row: a heading, a subtitle and whatever sits on the right. */
function Row({
  primary,
  secondary,
  trailing,
}: {
  primary: string;
  secondary: string;
  trailing: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium text-foreground">
          {primary}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {secondary || "—"}
        </span>
      </div>
      {trailing}
    </div>
  );
}
