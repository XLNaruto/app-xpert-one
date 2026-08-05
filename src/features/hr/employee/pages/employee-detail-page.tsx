import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRightLeft,
  BadgeCheck,
  Boxes,
  Briefcase,
  CalendarDays,
  Droplet,
  ExternalLink,
  FileStack,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Ruler,
  ShieldCheck,
  Users,
  UserRound,
  Weight,
} from 'lucide-react'
import { decryptId, encryptId } from '@/lib/crypto'
import { mediaUrl } from '@/lib/media'
import { formatDate } from '@/lib/utils'
import { formatAmount } from '@/lib/currency'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { PageHeader } from '@/components/common/page-header'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { FormSection } from '@/components/common/form-section'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden, NotFound } from '@/features/error'
import { useEmployee } from '../api/use-employees'
import {
  useEmployeeAssets,
  useEmployeeDocuments,
  useEmployeeEducations,
  useEmployeeExperiences,
  useEmployeeFamily,
  useEmployeeKyc,
  useEmployeeLeaves,
  useEmployeeTransfers,
  useEmployeeWageStructure,
} from '../api/use-employee-steps'
import { EMPLOYEE_PROGRESS_STEPS, MARITAL_STATUS_OPTIONS } from '../constants'
import { stepProgress } from '../lib/employee-mappers'
import { isDocumentExpired } from '../lib/employee-step-mappers'
import { toFormDate } from '../lib/employee-dates'
import type { Employee } from '../types'

/** The employee's marital status, spelled the way a reader expects. */
function maritalStatusLabel(value: string): string {
  return MARITAL_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

/**
 * The read-only 360° view of one employee — everything the nine steps captured, on
 * one page, so a record can be checked without stepping through the wizard.
 *
 * It reads all ten endpoints at once, which is the right trade here: this is the
 * screen someone opens to answer a question, and paging them one section at a time
 * would mean nine waits instead of one.
 */
export function EmployeeDetailPage({ data }: { data?: string }) {
  const navigate = useNavigate()
  const employeeId = decryptId(data)

  const detail = useEmployee(employeeId ?? Number.NaN)

  // Every section below is gated on the id inside its own hook, so these are inert
  // until there's an employee to read.
  const id = employeeId ?? Number.NaN
  const kyc = useEmployeeKyc(id)
  const wage = useEmployeeWageStructure(id)
  const family = useEmployeeFamily(id)
  const educations = useEmployeeEducations(id)
  const experiences = useEmployeeExperiences(id)
  const documents = useEmployeeDocuments(id)
  const assets = useEmployeeAssets(id)
  const transfers = useEmployeeTransfers(id)
  const leaves = useEmployeeLeaves({ limit: 5, offset: 0 }, { employeeId: id })

  // No usable token — nothing to show.
  if (employeeId === undefined) return <NotFound />

  if (isForbiddenError(detail.error)) {
    return <Forbidden description={getApiErrorMessage(detail.error)} />
  }

  const goToList = () => navigate({ to: '/hr/employee' })
  const goToEdit = () =>
    navigate({ to: '/hr/employee/create', search: { data: encryptId(employeeId) } })

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const employee = detail.data
  if (!employee) return <NotFound />

  return (
    <div>
      <PageHeader
        title="Employee Detail"
        description="Everything on record, read-only"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <EmployeeHero employee={employee} />

        {/* ── Personal ─────────────────────────────────────────────────── */}

        <Section icon={UserRound} title="Personal" first>
          <DetailItem icon={UserRound} label="Gender" value={employee.gender || null} />
          <DetailItem
            icon={CalendarDays}
            label="Date of Birth"
            value={employee.birthDate ? formatDate(employee.birthDate) : null}
          />
          <DetailItem
            icon={Heart}
            label="Marital Status"
            value={
              employee.maritalStatus ? maritalStatusLabel(employee.maritalStatus) : null
            }
          />
          <DetailItem
            icon={Users}
            label={employee.relation || 'Relative'}
            value={employee.relativeName || null}
          />
          <DetailItem
            icon={MapPin}
            label="Nationality"
            value={employee.nationality || null}
          />
          <DetailItem
            icon={Droplet}
            label="Blood Group"
            value={employee.bloodGroup || null}
          />
          <DetailItem
            icon={Ruler}
            label="Height"
            value={employee.height ? `${employee.height} ${employee.heightUnit}` : null}
          />
          <DetailItem
            icon={Weight}
            label="Weight"
            value={employee.weight ? `${employee.weight} ${employee.weightUnit}` : null}
          />
          <DetailItem
            icon={Heart}
            label="Disability"
            value={employee.isDisability ? 'Recorded' : 'None'}
          />
        </Section>

        {/* ── Contact & address ────────────────────────────────────────── */}

        <Section icon={Phone} title="Contact">
          <DetailItem icon={Phone} label="Mobile" value={employee.mobileNumber1 || null} />
          <DetailItem
            icon={Phone}
            label="Alternate Mobile"
            value={employee.mobileNumber2 || null}
          />
          <DetailItem
            icon={Phone}
            label="Landline"
            value={employee.landlineNumber || null}
          />
          <DetailItem icon={Mail} label="Email" value={employee.email || null} />
        </Section>

        <Section icon={Home} title="Current Address">
          <DetailItem
            icon={Home}
            label="Address"
            value={
              [
                employee.currentAddress1,
                employee.currentAddress2,
                employee.currentAddress3,
              ]
                .filter(Boolean)
                .join(', ') || null
            }
            className="sm:col-span-2"
          />
          <DetailItem icon={MapPin} label="City" value={employee.currentCity || null} />
          <DetailItem
            icon={MapPin}
            label="Taluka"
            value={employee.currentTaluka || null}
          />
          <DetailItem
            icon={MapPin}
            label="PIN Code"
            value={employee.currentPinCode || null}
          />
          <DetailItem
            icon={MapPin}
            label="Country"
            value={employee.currentCountry || null}
          />
        </Section>

        <Section icon={MapPin} title="Permanent Address">
          <DetailItem
            icon={Home}
            label="Address"
            value={
              [
                employee.permanentAddress1,
                employee.permanentAddress2,
                employee.permanentAddress3,
              ]
                .filter(Boolean)
                .join(', ') || null
            }
            className="sm:col-span-2"
          />
          <DetailItem icon={MapPin} label="City" value={employee.permanentCity || null} />
          <DetailItem
            icon={MapPin}
            label="Taluka"
            value={employee.permanentTaluka || null}
          />
          <DetailItem
            icon={MapPin}
            label="PIN Code"
            value={employee.permanentPinCode || null}
          />
          <DetailItem
            icon={MapPin}
            label="Country"
            value={employee.permanentCountry || null}
          />
        </Section>

        {/* ── Current posting ──────────────────────────────────────────── */}

        <Section icon={Briefcase} title="Current Posting">
          {employee.service === null ? (
            <p className="col-span-full text-sm text-muted-foreground">
              No open posting — the employee has left.
            </p>
          ) : (
            <>
              <DetailItem
                icon={Briefcase}
                label="Grade"
                value={employee.service.grade || null}
              />
              <DetailItem
                icon={Briefcase}
                label="Employment Type"
                value={
                  employee.service.employmentType
                    ? employee.service.contractPeriod
                      ? `${employee.service.employmentType} · ${employee.service.contractPeriod} ${employee.service.contractPeriodType}`
                      : employee.service.employmentType
                    : null
                }
              />
              <DetailItem
                icon={CalendarDays}
                label="Joining Date"
                value={
                  employee.service.joiningDate
                    ? formatDate(employee.service.joiningDate)
                    : null
                }
              />
              <DetailItem
                icon={CalendarDays}
                label="Confirmation Date"
                value={
                  employee.service.confirmationDate
                    ? formatDate(employee.service.confirmationDate)
                    : null
                }
              />
              <DetailItem
                icon={CalendarDays}
                label="Renewal Date"
                value={
                  employee.service.renewalDate
                    ? formatDate(employee.service.renewalDate)
                    : null
                }
              />
              <DetailItem
                icon={CalendarDays}
                label="Leaving Date"
                value={
                  employee.service.leavingDate
                    ? formatDate(employee.service.leavingDate)
                    : 'Still working'
                }
              />
              <DetailItem
                icon={ShieldCheck}
                label="Police Verified"
                value={employee.isPoliceVerified ? 'Yes' : 'No'}
              />
              <DetailItem
                icon={ShieldCheck}
                label="Stamp Agreement"
                value={employee.isStampAgreement ? 'Yes' : 'No'}
              />
            </>
          )}
        </Section>

        {/* ── KYC ──────────────────────────────────────────────────────── */}

        <Section icon={BadgeCheck} title="KYC" isLoading={kyc.isLoading}>
          <DetailItem
            icon={ShieldCheck}
            label="PF Number"
            value={kyc.data?.pfNumber || null}
          />
          <DetailItem
            icon={ShieldCheck}
            label="UAN"
            value={kyc.data?.uanNumber || null}
          />
          <DetailItem
            icon={ShieldCheck}
            label="ESIC Number"
            value={kyc.data?.esicNumber || null}
          />
          <DetailItem
            icon={BadgeCheck}
            label="Aadhaar"
            value={kyc.data?.aadharNumber || null}
          />
          <DetailItem
            icon={BadgeCheck}
            label="Name as per Aadhaar"
            value={kyc.data?.nameAsPerAadhar || null}
          />
          <DetailItem icon={BadgeCheck} label="PAN" value={kyc.data?.panNumber || null} />
          <DetailItem
            icon={Landmark}
            label="Bank Account"
            value={kyc.data?.bankAccountNumber || null}
          />
          <DetailItem icon={Landmark} label="IFSC" value={kyc.data?.ifscCode || null} />
          <DetailItem
            icon={Landmark}
            label="Bank Branch"
            value={kyc.data?.bankBranchName || null}
          />
        </Section>

        {/* ── Wage structure ───────────────────────────────────────────── */}

        <Section
          icon={Landmark}
          title="Wage Structure"
          description="Inherited from the designation on the current posting"
          isLoading={wage.isLoading}
        >
          {!wage.data ? (
            <p className="col-span-full text-sm text-muted-foreground">
              No wage structure in force for this employee's designation.
            </p>
          ) : (
            <>
              <DetailItem
                icon={Landmark}
                label="Salary Type"
                value={wage.data.salaryType || null}
              />
              <DetailItem
                icon={Landmark}
                label="Basic Pay"
                value={
                  wage.data.basicPay === null ? null : formatAmount(wage.data.basicPay)
                }
              />
              <DetailItem
                icon={Landmark}
                label="Wage Per Day"
                value={
                  wage.data.wagesPerDay === null
                    ? null
                    : formatAmount(wage.data.wagesPerDay)
                }
              />
              <DetailItem
                icon={CalendarDays}
                label="Working Days"
                value={wage.data.workingDays === null ? null : String(wage.data.workingDays)}
              />
              <DetailItem
                icon={CalendarDays}
                label="Weekly Off"
                value={wage.data.weeklyOff || null}
              />
              <DetailItem
                icon={ShieldCheck}
                label="Acts Applicable"
                value={
                  [
                    wage.data.isPfActApplicable ? 'PF' : null,
                    wage.data.isEsicActApplicable ? 'ESIC' : null,
                    wage.data.isPtActApplicable ? 'PT' : null,
                    wage.data.isLwfActApplicable ? 'LWF' : null,
                    wage.data.isTdsActApplicable ? 'TDS' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'None'
                }
                className="sm:col-span-2"
              />
            </>
          )}
        </Section>

        {/* ── The collections ──────────────────────────────────────────── */}

        <ListSection
          icon={Users}
          title="Family"
          isLoading={family.isLoading}
          isEmpty={(family.data ?? []).length === 0}
          emptyMessage="No family members recorded."
        >
          {(family.data ?? []).map((member) => (
            <Row
              key={member.id}
              primary={member.fullName}
              secondary={member.relation || '—'}
              trailing={
                <div className="flex items-center gap-2">
                  {member.isNominee && <Badge variant="success">Nominee</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {member.birthDate ? formatDate(member.birthDate) : ''}
                  </span>
                </div>
              }
            />
          ))}
        </ListSection>

        <ListSection
          icon={GraduationCap}
          title="Education"
          isLoading={educations.isLoading}
          isEmpty={(educations.data ?? []).length === 0}
          emptyMessage="No qualifications recorded."
        >
          {(educations.data ?? []).map((education) => (
            <Row
              key={education.id}
              primary={education.educationName}
              secondary={education.board || '—'}
              trailing={
                <div className="flex items-center gap-2">
                  {education.passingYear && (
                    <Badge variant="secondary">{education.passingYear}</Badge>
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
        </ListSection>

        <ListSection
          icon={Briefcase}
          title="Experience"
          isLoading={experiences.isLoading}
          isEmpty={(experiences.data ?? []).length === 0}
          emptyMessage="No prior employment — a fresher."
        >
          {(experiences.data ?? []).map((experience) => (
            <Row
              key={experience.id}
              primary={experience.companyName}
              secondary={experience.designation || '—'}
              trailing={
                <span className="text-xs text-muted-foreground">
                  {experience.fromDate} → {experience.toDate}
                </span>
              }
            />
          ))}
        </ListSection>

        <ListSection
          icon={FileStack}
          title="Documents"
          isLoading={documents.isLoading}
          isEmpty={(documents.data ?? []).length === 0}
          emptyMessage="No documents attached."
        >
          {(documents.data ?? []).map((document) => (
            <Row
              key={document.id}
              primary={document.documentName || 'Attachment'}
              secondary={document.documentTypeName || '—'}
              trailing={
                <div className="flex items-center gap-2">
                  {document.expiryDate && (
                    <span
                      className={
                        isDocumentExpired(document)
                          ? 'text-xs text-destructive'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {formatDate(document.expiryDate)}
                    </span>
                  )}
                  {isDocumentExpired(document) && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {document.document && (
                    <a
                      href={mediaUrl(document.document)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </a>
                  )}
                </div>
              }
            />
          ))}
        </ListSection>

        <ListSection
          icon={Boxes}
          title="Assets"
          isLoading={assets.isLoading}
          isEmpty={(assets.data ?? []).length === 0}
          emptyMessage="No assets issued."
        >
          {(assets.data ?? []).map((asset) => (
            <Row
              key={asset.id}
              primary={asset.assetName || 'Asset'}
              secondary={
                asset.assignedDate ? `Issued ${formatDate(asset.assignedDate)}` : '—'
              }
              trailing={
                <Badge variant={asset.status === 'ASSIGNED' ? 'success' : 'secondary'}>
                  {asset.status || '—'}
                </Badge>
              }
            />
          ))}
        </ListSection>

        <ListSection
          icon={ArrowRightLeft}
          title="Posting History"
          isLoading={transfers.isLoading}
          isEmpty={(transfers.data ?? []).length === 0}
          emptyMessage="No postings recorded."
        >
          {(transfers.data ?? []).map((transfer) => (
            <Row
              key={transfer.id}
              primary={`${transfer.companyName || '—'} · ${transfer.designationName || '—'}`}
              secondary={[transfer.branchName, transfer.departmentName]
                .filter(Boolean)
                .join(' · ')}
              trailing={
                <span className="text-xs text-muted-foreground">
                  {transfer.joiningDate ? formatDate(transfer.joiningDate) : '—'} →{' '}
                  {transfer.leavingDate ? formatDate(transfer.leavingDate) : 'present'}
                </span>
              }
            />
          ))}
        </ListSection>

        <ListSection
          icon={CalendarDays}
          title="Recent Leave"
          description="The five most recent records — the full register is on the Leave Management step"
          isLoading={leaves.isLoading}
          isEmpty={(leaves.data?.items ?? []).length === 0}
          emptyMessage="No leave recorded."
        >
          {(leaves.data?.items ?? []).map((leave) => (
            <Row
              key={leave.id}
              primary={leave.leaveTypeName || leave.leaveType || 'Leave'}
              secondary={`${leave.fromDate ? formatDate(leave.fromDate) : '—'} → ${
                leave.toDate ? formatDate(leave.toDate) : '—'
              }`}
              trailing={
                <div className="flex items-center gap-2">
                  <Badge variant={leave.payType === 'PAID' ? 'default' : 'warning'}>
                    {leave.payType}
                  </Badge>
                  <Badge
                    variant={
                      leave.status === 'APPROVED'
                        ? 'success'
                        : leave.status === 'PENDING'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {leave.status}
                  </Badge>
                </div>
              }
            />
          ))}
        </ListSection>
      </div>
    </div>
  )
}

/** Photo, name, code and how complete the record is. */
function EmployeeHero({ employee }: { employee: Employee }) {
  const { completed, total, percent } = stepProgress(
    employee.completedSteps,
    EMPLOYEE_PROGRESS_STEPS.map((step) => step.flag),
  )
  const leavingDate = employee.service?.leavingDate ?? ''
  const isActive = employee.service !== null && leavingDate === ''

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-5 p-5">
        <ImageWithFallback
          src={mediaUrl(employee.photo)}
          alt={employee.name || 'Employee photo'}
          wrapperClassName="size-20 shrink-0 rounded-xl ring-1 ring-border"
          className="object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {[employee.prefix, employee.name].filter(Boolean).join(' ') || 'Unnamed'}
            </h2>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee.code || 'No code assigned'}
            {leavingDate ? ` · Left on ${formatDate(toFormDate(leavingDate))}` : ''}
          </p>
          {employee.remarks && (
            <p className="mt-2 text-sm text-muted-foreground">{employee.remarks}</p>
          )}
        </div>

        <div className="shrink-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Record complete
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {completed}/{total}{' '}
            <span className="text-sm font-normal text-muted-foreground">({percent}%)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/** A titled block of `DetailItem`s. */
function Section({
  icon,
  title,
  description,
  isLoading = false,
  first = false,
  children,
}: {
  icon: typeof UserRound
  title: string
  description?: string
  isLoading?: boolean
  first?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormSection
          icon={icon}
          title={title}
          description={description}
          className={first ? 'mt-0' : 'mt-0'}
        />
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))
            : children}
        </div>
      </CardContent>
    </Card>
  )
}

/** A titled block of collection rows, with its own loading and empty states. */
function ListSection({
  icon,
  title,
  description,
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: {
  icon: typeof UserRound
  title: string
  description?: string
  isLoading: boolean
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormSection
          icon={icon}
          title={title}
          description={description}
          className="mt-0"
        />
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState icon={icon} title={emptyMessage} />
          ) : (
            <div className="divide-y divide-border">{children}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** One collection row: a heading, a subtitle and whatever sits on the right. */
function Row({
  primary,
  secondary,
  trailing,
}: {
  primary: string
  secondary: string
  trailing: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium text-foreground">
          {primary}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {secondary || '—'}
        </span>
      </div>
      {trailing}
    </div>
  )
}
