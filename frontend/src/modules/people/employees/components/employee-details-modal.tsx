import { useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  Download,
  FileText,
  History,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/primitives/tabs";
import { StatusBadge } from "@/shared/ui/patterns";
import { useEmployeeProfile } from "../hooks/use-employee-profile";
import type {
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeListItem,
  EmployeeProfile,
} from "../types/employees.types";

interface EmployeeDetailsModalProps {
  employeeId: string | null;
  fallbackEmployee: EmployeeListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

type EmployeeDetailsTab = "personal" | "employment" | "documents" | "activity";

const DETAIL_TABS: { value: EmployeeDetailsTab; label: string; icon: LucideIcon }[] = [
  { value: "personal", label: "Personal Information", icon: UserRound },
  { value: "employment", label: "Employment", icon: BriefcaseBusiness },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "activity", label: "Activity", icon: History },
];

function fullName(employee: EmployeeListItem): string {
  return (
    employee.fullName ||
    [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")
  );
}

function initials(employee: EmployeeListItem): string {
  const letters = (employee.firstName?.[0] ?? "") + (employee.lastName?.[0] ?? "");
  return (letters || employee.companyEmail[0]).toUpperCase();
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function formatAddress(address: EmployeeAddress | null | undefined): string {
  if (!address) return "";
  return [address.address, address.city, address.province, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function formatEmergencyContact(contact: EmployeeEmergencyContact | null | undefined): string {
  if (!contact) return "";
  return [contact.emergencyContactName, contact.emergencyContactNumber]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function DetailSection({ title, icon: Icon, children }: DetailSectionProps) {
  return (
    <section className="border-b border-[color:var(--border-primary)] pb-9 last:border-b-0 last:pb-0">
      <div className="mb-6 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[color:var(--text-secondary)]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ReadField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">{label}</p>
      <div className="flex min-h-10 items-center rounded-lg border border-[color:var(--border-primary)] bg-white px-3 text-sm font-medium text-[color:var(--text-primary)]">
        {displayValue(value)}
      </div>
    </div>
  );
}

function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-8 text-center">
      <p className="text-sm font-medium text-[color:var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{body}</p>
    </div>
  );
}

export function EmployeeDetailsModal({
  employeeId,
  fallbackEmployee,
  open,
  onOpenChange,
}: EmployeeDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<EmployeeDetailsTab>("personal");
  const { employee, loading, error, reload } = useEmployeeProfile(employeeId);
  const profile = employee ?? fallbackEmployee;
  const profileDetails = profile as EmployeeProfile | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="directory-profile-dialog h-[88vh] w-[90vw] max-w-[90vw] origin-center gap-0 overflow-hidden p-0 sm:rounded-xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {profile ? `${fullName(profile)} employee details` : "Employee details"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Employee personal information, employment details, documents, and activity.
        </DialogDescription>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EmployeeDetailsTab)}
          className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] bg-white"
        >
          <aside className="flex min-h-0 flex-col border-r border-[color:var(--border-primary)] bg-white">
            {profile ? (
              <>
                <div className="border-b border-[color:var(--border-primary)] px-6 py-6 text-center">
                  <span
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold text-[color:var(--brand-primary)]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(7, 148, 85, 0.12), rgba(255, 213, 199, 0.4))",
                    }}
                  >
                    {initials(profile)}
                  </span>
                  <h2 className="mt-4 truncate text-sm font-bold text-[color:var(--text-primary)]">
                    {fullName(profile)}
                  </h2>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-tertiary)]">
                    {displayValue(profile.jobTitle)}
                  </p>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-tertiary)]">
                    {displayValue(profile.department)}
                  </p>
                  <div className="mt-3 flex justify-center">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>

                <TabsList className="flex h-auto flex-1 flex-col items-stretch justify-start gap-1 rounded-none bg-transparent px-3 py-4 text-[color:var(--text-secondary)]">
                  {DETAIL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold shadow-none transition-colors hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] data-[state=active]:bg-[color:var(--bg-secondary)] data-[state=active]:text-[color:var(--text-primary)] data-[state=active]:shadow-none"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <div className="border-t border-[color:var(--border-primary)] p-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border-[#FECDCA] bg-white text-[#B42318] hover:bg-[#FEF3F2]"
                  >
                    <LogOut /> Process offboarding
                  </Button>
                </div>
              </>
            ) : null}
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col bg-white">
            <header className="flex min-h-[64px] items-center justify-between border-b border-[color:var(--border-primary)] px-8 pr-16">
              <h2 className="truncate text-lg font-bold text-[color:var(--text-primary)]">
                {profile ? `${fullName(profile)} File` : "Employee File"}
              </h2>
              {profile ? (
                <Button type="button" variant="secondary" size="sm">
                  <Download /> Download file
                </Button>
              ) : null}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 pb-24">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 rounded-lg bg-[color:var(--bg-secondary)]"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-lg border border-[color:var(--border-primary)] p-4">
                  <p className="text-sm font-medium text-[color:var(--text-primary)]">{error}</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() => void reload()}
                  >
                    Try again
                  </Button>
                </div>
              ) : profile ? (
                <>
                  <TabsContent value="personal" className="m-0">
                    <div className="space-y-9">
                      <DetailSection title="Personal Information" icon={UserRound}>
                        <dl className="grid gap-4">
                          <ReadField label="Company Email" value={profile.companyEmail} />
                          <ReadField
                            label="Personal Email"
                            value={profileDetails?.personalEmail}
                          />
                          <ReadField
                            label="Date of Birth"
                            value={formatDate(profileDetails?.birthday)}
                          />
                          <ReadField label="Address" value={formatAddress(profile.address)} />
                          <ReadField
                            label="Emergency Contact"
                            value={formatEmergencyContact(profile.emergencyContact)}
                          />
                        </dl>
                      </DetailSection>

                      <DetailSection title="Government & Compliance" icon={ShieldCheck}>
                        <dl className="grid gap-4 md:grid-cols-2">
                          <ReadField label="SSS Number" value="-" />
                          <ReadField label="PhilHealth No." value="-" />
                          <ReadField label="Pag-IBIG (HDMF)" value="-" />
                          <ReadField label="TIN / BIR" value="-" />
                        </dl>
                      </DetailSection>
                    </div>
                  </TabsContent>

                  <TabsContent value="employment" className="m-0">
                    <div className="space-y-9">
                      <DetailSection title="Employment" icon={BriefcaseBusiness}>
                        <dl className="grid gap-4 md:grid-cols-2">
                          <ReadField label="Role" value={profile.jobTitle} />
                          <ReadField label="Department" value={profile.department} />
                          <ReadField label="Employment Status" value={profile.status} />
                          <ReadField
                            label="Direct Manager"
                            value={profile.supervisor?.fullName}
                          />
                          <ReadField
                            label="Manager Email"
                            value={profile.supervisor?.companyEmail}
                          />
                          <ReadField
                            label="Manager Job Title"
                            value={profile.supervisor?.jobTitle}
                          />
                        </dl>
                      </DetailSection>

                      <DetailSection title="Teams" icon={Users}>
                        <div className="space-y-5">
                          <div>
                            <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">
                              Team/s
                            </p>
                            {profile.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {profile.teams.map((team) => (
                                  <Badge key={team.id} variant="brand">
                                    {team.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-[color:var(--text-tertiary)]">
                                No team assignment.
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">
                              Led Teams
                            </p>
                            {profileDetails?.ledTeams?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {profileDetails.ledTeams.map((team) => (
                                  <Badge key={team.id} variant="success">
                                    {team.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-[color:var(--text-tertiary)]">
                                No led teams.
                              </p>
                            )}
                          </div>
                        </div>
                      </DetailSection>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="m-0">
                    <DetailSection title="Documents" icon={FileText}>
                      <EmptyPanel
                        title="No documents yet"
                        body="Uploaded employee files will appear here."
                      />
                    </DetailSection>
                  </TabsContent>

                  <TabsContent value="activity" className="m-0">
                    <DetailSection title="Activity" icon={History}>
                      <EmptyPanel
                        title="No activity history yet"
                        body="Employee changes and directory activity will appear here."
                      />
                    </DetailSection>
                  </TabsContent>
                </>
              ) : null}
            </div>
          </main>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
