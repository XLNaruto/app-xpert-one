import {
  ArrowLeft,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  FileText,
  HeartPulse,
  IndianRupee,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  UserRound,
  UserRoundSearch,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { DetailItem } from '@/components/common/detail-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { decryptId } from '@/lib/crypto'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ActCard } from '../components/act-card'
import { useBranchDetail } from '../hooks/use-branch-detail'

/** Show a stored date as 'dd MMM yyyy', or nothing when it isn't recorded. */
const asDate = (value: string | null | undefined) => (value ? formatDate(value) : null)
/** Never surface a stored credential — just say whether one is on file. */
const asSecret = (value: string | null | undefined) => (value ? '••••••••' : null)
/** A whole-number column as text, blank when the branch doesn't record it. */
const asCount = (value: number | null | undefined) =>
  value === null || value === undefined ? null : String(value)

/**
 * Read-only view of a single branch record, including every applicable act. The
 * record id arrives encrypted in the `?data=` search param.
 */
export function BranchDetailPage({ data }: { data?: string }) {
  const {
    branch,
    acts,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    stateName,
    districtName,
    officeName,
    goToList,
    goToEdit,
  } = useBranchDetail(decryptId(data))

  // The Edit button is the only write this screen offers.
  const { canUpdate } = useResourceAccess(PERMISSIONS.branches)

  // Reading this record was refused — show the 403 screen with the server's
  // reason instead of an inline error line.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Branch Detail"
        description="Branch information at a glance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {canUpdate && branch && (
              <Button onClick={goToEdit}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !branch ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Couldn't load this branch."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2">
              <FormSection icon={Building} title="Branch Information" className="mt-0" />
              <DetailItem icon={Building} label="Branch Name" value={branch.branchName} />
              <DetailItem
                icon={FileText}
                label="Registration Number"
                value={branch.registrationNumber}
              />
              <DetailItem icon={FileText} label="PAN Number" value={branch.panNumber} />
              <DetailItem icon={FileText} label="GST Number" value={branch.gstNumber} />

              <FormSection icon={MapPin} title="Address Details" />
              <DetailItem
                icon={MapPin}
                label="Address"
                value={[branch.addressLine1, branch.addressLine2, branch.addressLine3]
                  .filter(Boolean)
                  .join(', ')}
                className="sm:col-span-2"
              />
              <DetailItem icon={MapPin} label="State" value={branch.stateName} />
              <DetailItem icon={MapPin} label="District" value={branch.districtName} />
              <DetailItem icon={MapPin} label="City" value={branch.city} />
              <DetailItem icon={MapPin} label="Pin Code" value={branch.pinCode} />

              <FormSection icon={Phone} title="Contact Details" />
              <DetailItem icon={Phone} label="Phone" value={branch.phone} />
              <DetailItem
                icon={Smartphone}
                label="Primary Mobile Number"
                value={branch.mobile1}
              />
              <DetailItem
                icon={Smartphone}
                label="Secondary Mobile Number"
                value={branch.mobile2}
              />
              <DetailItem icon={Mail} label="Email" value={branch.email} />
              <DetailItem
                icon={CalendarDays}
                label="Created On"
                value={formatDate(branch.createdAt)}
              />
            </CardContent>
          </Card>

          <ActCard
            icon={ShieldCheck}
            title="PF Act"
            tone="border-primary/20 bg-primary/5"
            iconTone="text-primary"
          >
            <DetailItem icon={FileText} label="PF Code" value={acts?.pfCode ?? null} />
            <DetailItem
              icon={CalendarDays}
              label="EPF Act Date"
              value={asDate(acts?.epfActDate)}
            />
            <DetailItem
              icon={CalendarDays}
              label="FPF Act Date"
              value={asDate(acts?.fpfActDate)}
            />
            <DetailItem
              icon={MapPin}
              label="PF Office Address"
              value={officeName('PF', acts?.pfOfficeAddressId ?? null)}
            />
            <DetailItem
              icon={UserRound}
              label="PF Username"
              value={acts?.pfUsername ?? null}
            />
            <DetailItem
              icon={ShieldCheck}
              label="PF Password"
              value={asSecret(acts?.pfPassword)}
            />
          </ActCard>

          <ActCard
            icon={HeartPulse}
            title="ESIC Act Settings"
            tone="border-emerald-500/20 bg-emerald-500/5"
            iconTone="text-emerald-600 dark:text-emerald-400"
          >
            <DetailItem
              icon={FileText}
              label="ESIC Code"
              value={acts?.esicCode ?? null}
            />
            <DetailItem
              icon={IndianRupee}
              label="ESIC Deducts On"
              value={acts?.esicDeductsOn ?? null}
            />
            <DetailItem
              icon={CalendarDays}
              label="ESIC Registration Date"
              value={asDate(acts?.esicRegistrationDate)}
            />
            <DetailItem
              icon={MapPin}
              label="ESIC Office Address"
              value={officeName('ESIC', acts?.esicOfficeAddressId ?? null)}
            />
            <DetailItem
              icon={UserRound}
              label="ESIC Username"
              value={acts?.esicUsername ?? null}
            />
            <DetailItem
              icon={ShieldCheck}
              label="ESIC Password"
              value={asSecret(acts?.esicPassword)}
            />
          </ActCard>

          <ActCard
            icon={Building2}
            title="Factory Act Settings"
            tone="border-rose-500/20 bg-rose-500/5"
            iconTone="text-rose-600 dark:text-rose-400"
          >
            <DetailItem
              icon={CalendarDays}
              label="Factory Act Date"
              value={asDate(acts?.factoryActDate)}
            />
            <DetailItem
              icon={FileText}
              label="Factory License Number"
              value={acts?.factoryLicenseNumber ?? null}
            />
            <DetailItem
              icon={FileText}
              label="Factory FIN Number"
              value={acts?.factoryFinNumber ?? null}
            />
            <DetailItem
              icon={UserRound}
              label="No. of Employees"
              value={asCount(acts?.noOfEmployees)}
            />
            <DetailItem
              icon={FileText}
              label="Electric Horse Power"
              value={asCount(acts?.electricHorsePower)}
            />
            <DetailItem
              icon={CalendarDays}
              label="License Expiry Date"
              value={asDate(acts?.licenseExpiryDate)}
            />
            <DetailItem
              icon={CalendarDays}
              label="Stability Expiry Date"
              value={asDate(acts?.stabilityExpiryDate)}
            />
            <DetailItem
              icon={MapPin}
              label="Factory Office Address"
              value={officeName('FACTORY', acts?.factoryOfficeAddressId ?? null)}
            />
          </ActCard>

          <ActCard
            icon={IndianRupee}
            title="Professional Tax Act Settings"
            tone="border-violet-500/20 bg-violet-500/5"
            iconTone="text-violet-600 dark:text-violet-400"
          >
            <DetailItem
              icon={CalendarDays}
              label="PT Registration Date"
              value={asDate(acts?.ptRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="PEC Registration Number"
              value={acts?.ptPecRegistrationNumber ?? null}
            />
            <DetailItem
              icon={FileText}
              label="PRC Registration Number"
              value={acts?.ptPrcRegistrationNumber ?? null}
            />
            <DetailItem
              icon={Building}
              label="Corporation / Gram Panchayat Name"
              value={acts?.ptCorporationName ?? null}
            />
            <DetailItem
              icon={MapPin}
              label="PT State"
              value={stateName(acts?.ptStateId ?? null)}
            />
            <DetailItem
              icon={MapPin}
              label="PT District"
              value={districtName(acts?.ptDistrictId ?? null)}
            />
          </ActCard>

          <ActCard
            icon={Briefcase}
            title="LWF Act Settings"
            tone="border-amber-500/20 bg-amber-500/5"
            iconTone="text-amber-600 dark:text-amber-400"
          >
            <DetailItem
              icon={CalendarDays}
              label="LWF Registration Date"
              value={asDate(acts?.lwfRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="LWF Registration Number"
              value={acts?.lwfRegistrationNumber ?? null}
            />
            <DetailItem
              icon={MapPin}
              label="LWF Office Address"
              value={officeName('LWF', acts?.lwfOfficeAddressId ?? null)}
            />
            <DetailItem
              icon={UserRound}
              label="LWF Username"
              value={acts?.lwfUsername ?? null}
            />
            <DetailItem
              icon={ShieldCheck}
              label="LWF Password"
              value={asSecret(acts?.lwfPassword)}
            />
          </ActCard>

          <ActCard
            icon={UserRoundSearch}
            title="Employment Exchange Act Settings"
            tone="border-sky-500/20 bg-sky-500/5"
            iconTone="text-sky-600 dark:text-sky-400"
          >
            <DetailItem
              icon={CalendarDays}
              label="Registration Date"
              value={asDate(acts?.exRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="Registration Number"
              value={acts?.exRegistrationNumber ?? null}
            />
            <DetailItem
              icon={MapPin}
              label="Office Address"
              value={officeName('EMPLOYMENT EXCHANGE', acts?.exOfficeAddressId ?? null)}
            />
          </ActCard>
        </div>
      )}
    </div>
  )
}
