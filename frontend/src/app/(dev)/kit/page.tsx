"use client";

import React, { useState } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useConfirm, type DateRange } from "@/shared/ui";

import {
  // Primitives
  Alert,
  AlertDescription,
  AlertTitle,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  BadgeDot,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Calendar,
  Card,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DatePicker,
  DateRangePicker,
  TimePicker,
  // Patterns
  ConfirmProvider,
  DataTable,
  EmptyState,
  FilterBar,
  SearchInput,
  FormField,
  PageSection,
  StatCard,
  StatusBadge,
  // Charts
  BarChart,
  DonutChart,
  LineChart,
  SparkBar,
} from "@/shared/ui";

// ---------------------------------------------------------------------------
// Brandbook-styled layout primitives (mirrors swiftwork-brand-book.html)
// ---------------------------------------------------------------------------

const NAV = [
  { id: "actions", label: "Actions" },
  { id: "forms", label: "Form controls" },
  { id: "data", label: "Data display" },
  { id: "charts", label: "Charts" },
  { id: "feedback", label: "Feedback & states" },
  { id: "overlays", label: "Overlays" },
  { id: "patterns", label: "Patterns" },
];

function Section({
  id,
  num,
  label,
  title,
  lead,
  children,
}: {
  id: string;
  num: string;
  label: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 border-b border-[color:var(--border-primary)] px-6 py-16 sm:px-12 lg:px-20 lg:py-20"
    >
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[2px] text-[color:var(--text-quaternary)]">
        {num} · {label}
      </p>
      <h2 className="mb-5 max-w-[18ch] text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.04] tracking-[-0.03em] text-[color:var(--text-primary)]">
        {title}
      </h2>
      <p className="mb-8 max-w-[660px] text-[17px] font-medium leading-[1.6] text-[color:var(--text-tertiary)]">
        {lead}
      </p>
      <div className="grid max-w-[980px] grid-cols-1 gap-6 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function CompCard({
  title,
  full,
  children,
}: {
  title: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border-primary)] bg-white p-7 shadow-xs",
        full && "md:col-span-2",
      )}
    >
      <h4 className="mb-5 text-[12px] font-bold uppercase tracking-[1.5px] text-[color:var(--text-tertiary)]">
        {title}
      </h4>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

function SectionRail() {
  return (
    <nav
      aria-label="Sections"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex"
    >
      {NAV.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          aria-label={n.label}
          className="group relative block h-[7px] w-[7px] rounded-full bg-gray-300 ring-2 ring-white transition hover:scale-150 hover:bg-[color:var(--text-tertiary)]"
        >
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[color:var(--text-primary)] px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            {n.label}
          </span>
        </a>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// DataTable fixture
// ---------------------------------------------------------------------------

type Row = { id: number; name: string; role: string };

const TABLE_DATA: Row[] = [
  { id: 1, name: "Aileen Cruz", role: "Nursing" },
  { id: 2, name: "Ben Santos", role: "Pharmacy" },
  { id: 3, name: "Carmen Lim", role: "Radiology" },
];

const TABLE_COLUMNS = [
  { header: "Name", cell: (r: Row) => r.name },
  { header: "Department", cell: (r: Row) => r.role },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KitPage() {
  const [dateVal, setDateVal] = useState<Date | undefined>(undefined);
  const [rangeVal, setRangeVal] = useState<DateRange | undefined>(undefined);
  const [timeVal, setTimeVal] = useState<string>("09:00");
  const [calDate, setCalDate] = useState<Date | undefined>(undefined);
  const [sliderVal, setSliderVal] = useState<number[]>([40]);
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radioVal, setRadioVal] = useState("a");
  const [selectVal, setSelectVal] = useState("");
  const [kitSearch, setKitSearch] = useState("");

  return (
    <ConfirmProvider>
      <SectionRail />
      <main className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
        {/* ---------------------------------------------------------------- */}
        {/* HERO */}
        {/* ---------------------------------------------------------------- */}
        <header className="relative overflow-hidden border-b border-[color:var(--border-primary)] px-6 py-20 sm:px-12 lg:px-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--gradient-jia)" }}
          />
          <div className="relative">
            <div className="mb-10 flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-gradient-jia" />
              <span className="text-[17px] font-bold tracking-[-0.02em]">
                Manage Jia
              </span>
              <span aria-hidden className="text-[color:var(--text-tertiary)]">
                ✦
              </span>
            </div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[2px] text-[color:var(--text-quaternary)]">
              Component library
            </p>
            <h1 className="mb-5 max-w-[16ch] text-[clamp(38px,5.5vw,64px)] font-bold leading-[1.0] tracking-[-0.03em]">
              The Manage Jia UI kit
            </h1>
            <p className="max-w-[620px] text-[18px] font-medium leading-[1.6] text-[color:var(--text-tertiary)]">
              Every component, themed to the Manage Jia brandbook. Monochrome
              chrome, one gradient moment, Satoshi throughout. Import from{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[14px]">
                @/shared/ui
              </code>
              .
            </p>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* 01 · ACTIONS */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="actions"
          num="01"
          label="Actions"
          title="Buttons &amp; menus"
          lead="Buttons are always monochrome — black fill, white outline, ghost, or destructive. Never the gradient. Hover darkens; press settles with a subtle scale."
        >
          <CompCard title="Button — hierarchies" full>
            <Button>Add employee</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">Skip for now</Button>
            {/* Brand — showcase-only: a white button with a 45° gradient border ring
                (never a product variant; buttons never use a gradient fill). */}
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border-[1.5px] border-transparent px-3.5 text-sm font-medium text-[color:var(--text-primary)] [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box]"
            >
              Brand{" "}
              <span className="bg-clip-text font-bold text-transparent [background-image:linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)] [-webkit-text-fill-color:transparent]">
                ✦
              </span>
            </button>
            <Button variant="destructive">Offboard</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </CompCard>
          <CompCard title="Button — sizes">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="default">md</Button>
            <Button size="lg">lg</Button>
            <Button size="xl">xl</Button>
          </CompCard>
          <CompCard title="Dropdown menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Row actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Employee</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View profile</DropdownMenuItem>
                <DropdownMenuItem>Reassign supervisor</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Offboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 02 · FORM CONTROLS */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="forms"
          num="02"
          label="Form controls"
          title="Inputs that feel calm"
          lead="Gray-cool borders, the inset-brand halo, and a dark focus border with a soft glow. Checked checkboxes and radios carry the one gradient accent."
        >
          <CompCard title="Input">
            <Input placeholder="Default input" className="w-full" />
            <Input defaultValue="With value" className="w-full" />
            <Input placeholder="Disabled" disabled className="w-full" />
          </CompCard>
          <CompCard title="Textarea">
            <Textarea placeholder="Enter text…" className="w-full" />
          </CompCard>
          <CompCard title="Select">
            <Select value={selectVal} onValueChange={setSelectVal}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="offboarding">Offboarding</SelectItem>
              </SelectContent>
            </Select>
          </CompCard>
          <CompCard title="Combobox">
            <Combobox
              options={[
                { value: "nursing", label: "Nursing" },
                { value: "pharmacy", label: "Pharmacy" },
                { value: "radiology", label: "Radiology" },
              ]}
              placeholder="Select department…"
            />
          </CompCard>
          <CompCard title="Checkbox">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setChecked(!!v)}
                />
                Signed clearance
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox defaultChecked /> Uploaded documents
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked="indeterminate" /> Onboarding tasks
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-quaternary)]">
                <Checkbox disabled /> Disabled
              </label>
            </div>
          </CompCard>
          <CompCard title="Radio group">
            <RadioGroup value={radioVal} onValueChange={setRadioVal}>
              <label className="flex items-center gap-2 text-sm font-medium">
                <RadioGroupItem value="a" /> Anonymous
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <RadioGroupItem value="b" /> Named
              </label>
            </RadioGroup>
          </CompCard>
          <CompCard title="Switch">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              {switchOn ? "On" : "Off"}
            </label>
          </CompCard>
          <CompCard title="Slider">
            <div className="w-full">
              <Slider
                value={sliderVal}
                onValueChange={setSliderVal}
                min={0}
                max={100}
              />
              <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">
                Value: {sliderVal[0]}
              </p>
            </div>
          </CompCard>
          <CompCard title="Form field" full>
            <div className="flex w-full flex-wrap gap-6">
              <FormField
                label="Work email"
                htmlFor="ff-email"
                hint="This is the email used to sign in to Manage Jia."
              >
                <Input
                  id="ff-email"
                  placeholder="nurse.lee@clinic.org"
                  className="w-64"
                />
              </FormField>
              <FormField
                label="Password"
                htmlFor="ff-pass"
                error="Password is too short."
                required
              >
                <Input
                  id="ff-pass"
                  type="password"
                  placeholder="••••••••"
                  className="w-64"
                  error
                />
              </FormField>
            </div>
          </CompCard>
          <CompCard title="Date · range · time" full>
            <div className="w-56">
              <DatePicker value={dateVal} onChange={setDateVal} />
            </div>
            <div className="w-64">
              <DateRangePicker value={rangeVal} onChange={setRangeVal} />
            </div>
            <TimePicker value={timeVal} onChange={setTimeVal} />
          </CompCard>
          <CompCard title="Calendar" full>
            <Calendar
              mode="single"
              selected={calDate}
              onSelect={setCalDate}
              className="rounded-md border border-[color:var(--border-primary)]"
            />
          </CompCard>
          <CompCard title="Filter bar" full>
            <FilterBar className="w-full">
              <SearchInput
                value={kitSearch}
                onValueChange={setKitSearch}
                placeholder="Search employees…"
                containerClassName="max-w-xs"
              />
              <Select>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">Reset</Button>
            </FilterBar>
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 03 · DATA DISPLAY */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="data"
          num="03"
          label="Data display"
          title="Badges, cards & tables"
          lead="Status uses semantic color only — never the gradient. Tables get a gray-cool header. One stat card per surface may carry the gradient accent."
        >
          <CompCard title="Badge">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="modern">Modern</Badge>
            <Badge variant="success">
              <BadgeDot /> With dot
            </Badge>
            <Badge variant="brand" pill>
              Pill
            </Badge>
          </CompCard>
          <CompCard title="Status badge">
            <StatusBadge status="ACTIVE" />
            <StatusBadge status="ONBOARDING" />
            <StatusBadge status="INACTIVE" />
            <StatusBadge status="PENDING" />
            <StatusBadge status="APPROVED" />
            <StatusBadge status="REJECTED" />
            <StatusBadge status="DRAFT" />
          </CompCard>
          <CompCard title="Avatar">
            <Avatar>
              <AvatarImage
                src="https://api.dicebear.com/7.x/initials/svg?seed=AC"
                alt="AC"
              />
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>BS</AvatarFallback>
            </Avatar>
          </CompCard>
          <CompCard title="Card — three surfaces">
            <div className="flex w-full flex-col gap-2.5">
              <Card variant="inset" className="p-[22px]">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.5px] text-[color:var(--text-tertiary)]">
                  Inset halo
                </div>
                <div className="text-sm font-semibold">Contact info</div>
                <div className="mt-0.5 text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  The signature edge treatment on employee profile sections.
                </div>
              </Card>
              <Card variant="standard" className="p-[22px]">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.5px] text-[color:var(--text-tertiary)]">
                  Standard
                </div>
                <div className="text-sm font-semibold">Employment details</div>
                <div className="mt-0.5 text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  Thin border + shadow-xs. Most content blocks.
                </div>
              </Card>
              <Card variant="brand-scrim" className="p-[22px]">
                <div className="relative z-[1]">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.5px] opacity-80">
                    Brand (scrim)
                  </div>
                  <div className="text-sm font-semibold">Welcome to Manage Jia</div>
                  <div className="mt-0.5 text-[13px] font-medium opacity-90">
                    One atmospheric moment per surface.
                  </div>
                </div>
              </Card>
            </div>
          </CompCard>
          <CompCard title="Stat card" full>
            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Active employees" value={128} variant="brand" />
              <StatCard
                label="Onboarding"
                value={6}
                delta="+2 this week"
              />
              <StatCard label="Pending reviews" value={7} variant="warn" />
              <StatCard label="Overdue tasks" value={3} variant="alert" />
            </div>
          </CompCard>
          <CompCard title="Progress">
            <div className="w-full">
              <div className="mb-1.5 flex justify-between text-[13px] font-semibold">
                <span>Your onboarding progress</span>
                <span className="text-[color:var(--text-tertiary)]">5 of 8</span>
              </div>
              <Progress value={62} />

              <div className="mt-5 flex flex-wrap items-end gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="circle-prog cp-sm"
                    style={{
                      width: 40,
                      height: 40,
                      background:
                        "conic-gradient(from -90deg,#fccec0 0%,#ebacc9 11.5%,#ceb6da 23%,#9fcaed 35%,#e9eaeb 35% 100%)",
                    }}
                  >
                    <div className="cp-inner">
                      <span className="cp-val" style={{ fontSize: 9 }}>
                        35%
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[color:var(--text-quaternary)]">
                    sm · 40px
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="circle-prog cp-md"
                    style={{
                      width: 56,
                      height: 56,
                      background:
                        "conic-gradient(from -90deg,#fccec0 0%,#ebacc9 20.5%,#ceb6da 41%,#9fcaed 62%,#e9eaeb 62% 100%)",
                    }}
                  >
                    <div className="cp-inner">
                      <span className="cp-val" style={{ fontSize: 12 }}>
                        62%
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[color:var(--text-quaternary)]">
                    md · 56px
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="circle-prog cp-lg"
                    style={{
                      width: 72,
                      height: 72,
                      background:
                        "conic-gradient(from -90deg,#fccec0 0%,#ebacc9 28.7%,#ceb6da 57.4%,#9fcaed 87%,#e9eaeb 87% 100%)",
                    }}
                  >
                    <div className="cp-inner">
                      <span className="cp-val" style={{ fontSize: 15 }}>
                        87%
                      </span>
                      <span className="cp-sub" style={{ fontSize: 9, marginTop: 2 }}>
                        cleared
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[color:var(--text-quaternary)]">
                    lg · 72px
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="circle-prog cp-md"
                    style={{
                      width: 56,
                      height: 56,
                      background:
                        "conic-gradient(from -90deg,#fccec0 0%,#ebacc9 33%,#ceb6da 66%,#9fcaed 100%)",
                    }}
                  >
                    <div className="cp-inner">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--gray-900)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[color:var(--text-quaternary)]">
                    complete
                  </span>
                </div>
              </div>
            </div>
          </CompCard>
          <CompCard title="Tabs">
            <Tabs defaultValue="tab1" className="w-full">
              <TabsList>
                <TabsTrigger value="tab1">Overview</TabsTrigger>
                <TabsTrigger value="tab2">Activity</TabsTrigger>
                <TabsTrigger value="tab3" disabled>
                  Disabled
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Overview content.</TabsContent>
              <TabsContent value="tab2">Activity content.</TabsContent>
            </Tabs>
          </CompCard>
          <CompCard title="Accordion">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Section one</AccordionTrigger>
                <AccordionContent>Content for section one.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Section two</AccordionTrigger>
                <AccordionContent>Content for section two.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CompCard>
          <CompCard title="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">People</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Employees</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </CompCard>
          <CompCard title="Pagination">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CompCard>
          <CompCard title="Table" full>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Aileen Cruz</TableCell>
                  <TableCell>Nursing</TableCell>
                  <TableCell>
                    <StatusBadge status="ACTIVE" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ben Santos</TableCell>
                  <TableCell>Pharmacy</TableCell>
                  <TableCell>
                    <StatusBadge status="ONBOARDING" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CompCard>
          <CompCard title="Data table — states" full>
            <div className="grid w-full gap-6 md:grid-cols-3">
              <DataTable
                columns={TABLE_COLUMNS}
                data={TABLE_DATA}
                emptyState={<EmptyState icon={Inbox} title="No rows" />}
                getRowId={(r) => String(r.id)}
              />
              <DataTable
                columns={TABLE_COLUMNS}
                data={undefined}
                isLoading
                emptyState={<EmptyState icon={Inbox} title="No rows" />}
              />
              <DataTable
                columns={TABLE_COLUMNS}
                data={[]}
                emptyState={
                  <EmptyState
                    icon={Inbox}
                    title="No employees yet"
                    body="Invite your first employee to get started."
                  />
                }
              />
            </div>
          </CompCard>
          <CompCard title="Scroll area">
            <ScrollArea className="h-32 w-full rounded-md border border-[color:var(--border-primary)] p-3">
              {Array.from({ length: 20 }, (_, i) => (
                <p key={i} className="text-sm">
                  Employee {i + 1}
                </p>
              ))}
            </ScrollArea>
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 04 · CHARTS */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="charts"
          num="04"
          label="Charts"
          title="Recharts, themed in pastels"
          lead="Series lead with the brand pastels — peach, then sky, then pink. Tooltips, donut centers, and the min-group-size guard all match the brandbook."
        >
          <CompCard title="Bar chart">
            <div className="w-full">
              <BarChart
                data={[
                  { m: "Jan", v: 3 },
                  { m: "Feb", v: 6 },
                  { m: "Mar", v: 4 },
                ]}
                categoryKey="m"
                valueKey="v"
              />
            </div>
          </CompCard>
          <CompCard title="Line chart">
            <div className="w-full">
              <LineChart
                data={[
                  { m: "Jan", v: 2 },
                  { m: "Feb", v: 5 },
                  { m: "Mar", v: 3 },
                  { m: "Apr", v: 7 },
                ]}
                categoryKey="m"
                valueKey="v"
              />
            </div>
          </CompCard>
          <CompCard title="Donut chart">
            <div className="w-full">
              <DonutChart
                data={[
                  { name: "Active", value: 4 },
                  { name: "Inactive", value: 2 },
                  { name: "Onboarding", value: 1 },
                ]}
              />
            </div>
          </CompCard>
          <CompCard title="Spark bar">
            <SparkBar data={[3, 6, 2, 8, 4, 5, 7]} />
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 05 · FEEDBACK & STATES */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="feedback"
          num="05"
          label="Feedback & states"
          title="Every surface's five faces"
          lead="Empty, loading, error, success, confirmation. Errors are inline red panels with a retry — never a toast. Toasts are reserved for success."
        >
          <CompCard title="Alert">
            <div className="w-full space-y-3">
              <Alert>
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>
                  Onboarding closes Friday.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t load the directory</AlertTitle>
                <AlertDescription>Try again in a moment.</AlertDescription>
              </Alert>
            </div>
          </CompCard>
          <CompCard title="Empty state">
            <EmptyState
              icon={Inbox}
              title="No employees yet"
              body="Invite your first employee to get started."
              action={{ label: "Invite employee", onClick: () => {} }}
            />
          </CompCard>
          <CompCard title="Skeleton">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </CompCard>
          <CompCard title="Confirmation dialog">
            <_ConfirmDemo />
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 06 · OVERLAYS */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="overlays"
          num="06"
          label="Overlays"
          title="Dialogs, sheets & menus"
          lead="Overlays share the crisp scrim, generous radius, and calm motion — no bounce, no overshoot. Destructive confirmation puts the action first."
        >
          <CompCard title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit employee</DialogTitle>
                  <DialogDescription>
                    Update the employee&apos;s details.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm">Dialog body content.</p>
              </DialogContent>
            </Dialog>
          </CompCard>
          <CompCard title="Alert dialog">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Offboard</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Offboard this employee?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Offboard</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CompCard>
          <CompCard title="Sheet">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Refine the directory.</SheetDescription>
                </SheetHeader>
                <p className="mt-4 text-sm">Sheet body content.</p>
              </SheetContent>
            </Sheet>
          </CompCard>
          <CompCard title="Popover">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm">Popover content.</p>
              </PopoverContent>
            </Popover>
          </CompCard>
          <CompCard title="Hover card">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">Hover me</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm">Hover card content.</p>
              </HoverCardContent>
            </HoverCard>
          </CompCard>
          <CompCard title="Tooltip">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover for tip</Button>
                </TooltipTrigger>
                <TooltipContent>This is a tooltip</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CompCard>
          <CompCard title="Command">
            <Command className="w-full rounded-lg border border-[color:var(--border-primary)] shadow-md">
              <CommandInput placeholder="Search…" />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Go to">
                  <CommandItem>Dashboard</CommandItem>
                  <CommandItem>Employees</CommandItem>
                  <CommandItem>Performance</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </CompCard>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 07 · PATTERNS */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="patterns"
          num="07"
          label="Patterns"
          title="Composed building blocks"
          lead="Higher-order patterns assembled from the primitives — page sections with a title, description, and a primary action."
        >
          <CompCard title="Page section" full>
            <PageSection
              title="Team overview"
              description="A quick summary of team health."
              action={<Button size="sm">Add member</Button>}
            >
              <p className="text-sm text-[color:var(--text-tertiary)]">
                Page section body content.
              </p>
            </PageSection>
          </CompCard>
        </Section>
      </main>
    </ConfirmProvider>
  );
}

// ---------------------------------------------------------------------------
// ConfirmDialog demo (needs useConfirm inside ConfirmProvider)
// ---------------------------------------------------------------------------

function _ConfirmDemo() {
  const [result, setResult] = React.useState<string | null>(null);
  const confirm = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: "Offboard this employee?",
      description: "This action cannot be undone.",
      confirmLabel: "Offboard",
      cancelLabel: "Cancel",
      destructive: true,
    });
    setResult(ok ? "Confirmed" : "Cancelled");
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleClick}>
        Open confirmation
      </Button>
      {result && (
        <span className="text-sm text-[color:var(--text-tertiary)]">
          → {result}
        </span>
      )}
    </div>
  );
}
