import {
  ArrowLeft,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  FileText,
  HeartPulse,
  IndianRupee,
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
import { ActCard } from '../components/act-card'
import { useBranchDetail } from '../hooks/use-branch-detail'

/** Show a stored date as 'dd MMM yyyy', or nothing when it isn't recorded. */
const asDate = (value: string | null) => (value ? formatDate(value) : null)
/** Never surface a stored credential — just say whether one is on file. */
const asSecret = (value: string | null) => (value ? '••••••••' : null)

/** Read-only view of a single branch record, including every applicable act. */
export function BranchDetailPage({ branchId }: { branchId: number }) {
  const { branch, isLoading, isError, error, goToList, goToEdit } =
    useBranchDetail(branchId)

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
            {branch && (
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
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <FormSection icon={Building} title="Branch Information" className="mt-0" />
              <DetailItem icon={Building} label="Branch Name" value={branch.branchName} />
              <DetailItem
                icon={CalendarDays}
                label="Created On"
                value={formatDate(branch.createdAt)}
              />

              <FormSection icon={MapPin} title="Address Details" />
              <DetailItem
                icon={MapPin}
                label="Address"
                value={[branch.addressLine1, branch.addressLine2, branch.addressLine3]
                  .filter(Boolean)
                  .join(', ')}
                className="sm:col-span-2"
              />
              <DetailItem icon={MapPin} label="Country" value={branch.country} />
              <DetailItem icon={MapPin} label="State" value={branch.state} />
              <DetailItem icon={MapPin} label="City" value={branch.city} />
              <DetailItem icon={MapPin} label="Pin Code" value={branch.pinCode} />

              <FormSection icon={Phone} title="Contact Details" />
              <DetailItem icon={UserRound} label="Head Name" value={branch.headName} />
              <DetailItem
                icon={Smartphone}
                label="Head Mobile Number"
                value={branch.headMobile}
              />
            </CardContent>
          </Card>

          <ActCard
            icon={ShieldCheck}
            title="PF Act"
            tone="border-primary/20 bg-primary/5"
            iconTone="text-primary"
          >
            <DetailItem icon={FileText} label="PF Code" value={branch.pfCode} />
            <DetailItem
              icon={CalendarDays}
              label="EPF Act Date"
              value={asDate(branch.epfActDate)}
            />
            <DetailItem
              icon={CalendarDays}
              label="FPF Act Date"
              value={asDate(branch.fpfActDate)}
            />
            <DetailItem icon={MapPin} label="PF State" value={branch.pfState} />
            <DetailItem icon={MapPin} label="PF District" value={branch.pfDistrict} />
            <DetailItem
              icon={MapPin}
              label="PF Office Address"
              value={branch.pfOfficeAddress}
            />
            <DetailItem icon={UserRound} label="PF Username" value={branch.pfUsername} />
            <DetailItem
              icon={ShieldCheck}
              label="PF Password"
              value={asSecret(branch.pfPassword)}
            />
          </ActCard>

          <ActCard
            icon={HeartPulse}
            title="ESIC Act Settings"
            tone="border-emerald-500/20 bg-emerald-500/5"
            iconTone="text-emerald-600 dark:text-emerald-400"
          >
            <DetailItem icon={FileText} label="ESIC Code" value={branch.esicCode} />
            <DetailItem
              icon={IndianRupee}
              label="ESIC Deducts On"
              value={branch.esicDeductsOn}
            />
            <DetailItem
              icon={CalendarDays}
              label="ESIC Registration Date"
              value={asDate(branch.esicRegistrationDate)}
            />
            <DetailItem icon={MapPin} label="ESIC State" value={branch.esicState} />
            <DetailItem icon={MapPin} label="ESIC District" value={branch.esicDistrict} />
            <DetailItem
              icon={MapPin}
              label="ESIC Office Address"
              value={branch.esicOfficeAddress}
            />
            <DetailItem
              icon={UserRound}
              label="ESIC Username"
              value={branch.esicUsername}
            />
            <DetailItem
              icon={ShieldCheck}
              label="ESIC Password"
              value={asSecret(branch.esicPassword)}
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
              value={asDate(branch.factoryActDate)}
            />
            <DetailItem
              icon={FileText}
              label="Factory License Number"
              value={branch.factoryLicenseNumber}
            />
            <DetailItem
              icon={FileText}
              label="Factory FIN Number"
              value={branch.factoryFinNumber}
            />
            <DetailItem
              icon={UserRound}
              label="No. of Employees"
              value={branch.employeeCount}
            />
            <DetailItem
              icon={FileText}
              label="Electric Horse Power"
              value={branch.electricHorsePower}
            />
            <DetailItem
              icon={CalendarDays}
              label="License Expiry Date"
              value={asDate(branch.licenseExpiryDate)}
            />
            <DetailItem
              icon={CalendarDays}
              label="Stability Expiry Date"
              value={asDate(branch.stabilityExpiryDate)}
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
              value={asDate(branch.ptRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="PEC Registration Number"
              value={branch.pecRegistrationNumber}
            />
            <DetailItem
              icon={FileText}
              label="PRC Registration Number"
              value={branch.prcRegistrationNumber}
            />
            <DetailItem
              icon={Building}
              label="Corporation / Gram Panchayat Name"
              value={branch.corporationName}
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
              value={asDate(branch.lwfRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="LWF Registration Number"
              value={branch.lwfRegistrationNumber}
            />
            <DetailItem
              icon={MapPin}
              label="LWF Office Address ID"
              value={branch.lwfOfficeAddressId}
            />
            <DetailItem icon={UserRound} label="LWF Username" value={branch.lwfUsername} />
            <DetailItem
              icon={ShieldCheck}
              label="LWF Password"
              value={asSecret(branch.lwfPassword)}
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
              value={asDate(branch.eeRegistrationDate)}
            />
            <DetailItem
              icon={FileText}
              label="Registration Number"
              value={branch.eeRegistrationNumber}
            />
          </ActCard>
        </div>
      )}
    </div>
  )
}
