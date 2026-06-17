"use client";

import React, { useState } from "react";
import { Inbox } from "lucide-react";

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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Calendar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
  Label,
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
// Showcase wrapper
// ---------------------------------------------------------------------------

function Showcase({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-5">
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DataTable fixture
// ---------------------------------------------------------------------------

type Row = { id: number; name: string; role: string };

const TABLE_DATA: Row[] = [
  { id: 1, name: "Alice Santos", role: "Engineer" },
  { id: 2, name: "Bob Reyes", role: "Designer" },
  { id: 3, name: "Carol Kim", role: "Manager" },
];

const TABLE_COLUMNS = [
  { header: "Name", cell: (r: Row) => r.name },
  { header: "Role", cell: (r: Row) => r.role },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KitPage() {
  // Stateful demos
  const [dateVal, setDateVal] = useState<Date | undefined>(undefined);
  const [rangeVal, setRangeVal] = useState<DateRange | undefined>(undefined);
  const [timeVal, setTimeVal] = useState<string>("09:00");
  const [calDate, setCalDate] = useState<Date | undefined>(undefined);
  const [sliderVal, setSliderVal] = useState<number[]>([40]);
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [radioVal, setRadioVal] = useState("a");
  const [selectVal, setSelectVal] = useState("");

  return (
    <ConfirmProvider>
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--text-primary)]">
          Jia UI Kit
        </h1>
        <p className="mb-8 text-sm text-[color:var(--text-tertiary)]">
          Every reusable component, themed to Jia. Import from{" "}
          <code>@/shared/ui</code>.
        </p>

        {/* ------------------------------------------------------------------ */}
        {/* BUTTON */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="button" title="Button">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* INPUT */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="input" title="Input">
          <Input placeholder="Default input" className="w-64" />
          <Input placeholder="Disabled" disabled className="w-64" />
          <Input defaultValue="With value" className="w-64" />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* TEXTAREA */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="textarea" title="Textarea">
          <Textarea placeholder="Enter text…" className="w-64" />
          <Textarea placeholder="Disabled" disabled className="w-64" />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* LABEL */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="label" title="Label">
          <Label>Default label</Label>
          <Label htmlFor="demo-input" className="font-bold">
            Bold label
          </Label>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SELECT */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="select" title="Select">
          <Select value={selectVal} onValueChange={setSelectVal}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Option A</SelectItem>
              <SelectItem value="b">Option B</SelectItem>
              <SelectItem value="c">Option C</SelectItem>
            </SelectContent>
          </Select>
          <Select disabled>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Disabled" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="x">X</SelectItem>
            </SelectContent>
          </Select>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* CHECKBOX */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="checkbox" title="Checkbox">
          <div className="flex items-center gap-2">
            <Checkbox
              id="chk1"
              checked={checked}
              onCheckedChange={(v) => setChecked(!!v)}
            />
            <Label htmlFor="chk1">Checked state: {String(checked)}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="chk2" defaultChecked />
            <Label htmlFor="chk2">Pre-checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="chk3" disabled />
            <Label htmlFor="chk3">Disabled</Label>
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* RADIO GROUP */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="radio-group" title="Radio Group">
          <RadioGroup value={radioVal} onValueChange={setRadioVal}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="r1" />
              <Label htmlFor="r1">Option A</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="r2" />
              <Label htmlFor="r2">Option B</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="c" id="r3" disabled />
              <Label htmlFor="r3">Disabled</Label>
            </div>
          </RadioGroup>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SWITCH */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="switch" title="Switch">
          <div className="flex items-center gap-2">
            <Switch
              id="sw1"
              checked={switchOn}
              onCheckedChange={setSwitchOn}
            />
            <Label htmlFor="sw1">{switchOn ? "On" : "Off"}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sw2" disabled />
            <Label htmlFor="sw2">Disabled</Label>
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SLIDER */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="slider" title="Slider">
          <div className="w-64">
            <Slider
              value={sliderVal}
              onValueChange={setSliderVal}
              min={0}
              max={100}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Value: {sliderVal[0]}
            </p>
          </div>
          <div className="w-64">
            <Slider defaultValue={[60]} disabled min={0} max={100} />
            <p className="mt-1 text-xs text-muted-foreground">Disabled</p>
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* BADGE */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="badge" title="Badge">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* AVATAR */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="avatar" title="Avatar">
          <Avatar>
            <AvatarImage
              src="https://api.dicebear.com/7.x/initials/svg?seed=AS"
              alt="AS"
            />
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* TABS */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="tabs" title="Tabs">
          <Tabs defaultValue="tab1" className="w-72">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3" disabled>
                Disabled
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content for Tab 1</TabsContent>
            <TabsContent value="tab2">Content for Tab 2</TabsContent>
          </Tabs>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* ACCORDION */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="accordion" title="Accordion">
          <Accordion type="single" collapsible className="w-72">
            <AccordionItem value="item-1">
              <AccordionTrigger>Section One</AccordionTrigger>
              <AccordionContent>Content for section one.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Section Two</AccordionTrigger>
              <AccordionContent>Content for section two.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* CARD */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="card" title="Card">
          <Card className="w-56">
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card body content.</p>
            </CardContent>
          </Card>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* DIALOG */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="dialog" title="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog description.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm">Dialog body content goes here.</p>
            </DialogContent>
          </Dialog>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* ALERT DIALOG */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="alert-dialog" title="Alert Dialog">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SHEET */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="sheet" title="Sheet">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet Title</SheetTitle>
                <SheetDescription>Sheet description text.</SheetDescription>
              </SheetHeader>
              <p className="mt-4 text-sm">Sheet body content.</p>
            </SheetContent>
          </Sheet>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* POPOVER */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="popover" title="Popover">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-sm">Popover content goes here.</p>
            </PopoverContent>
          </Popover>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* HOVER CARD */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="hover-card" title="Hover Card">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">Hover me</Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <p className="text-sm">Hover card content.</p>
            </HoverCardContent>
          </HoverCard>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* DROPDOWN MENU */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="dropdown-menu" title="Dropdown Menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* TOOLTIP */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="tooltip" title="Tooltip">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for tip</Button>
              </TooltipTrigger>
              <TooltipContent>This is a tooltip</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* ALERT */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="alert" title="Alert">
          <Alert className="w-72">
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default alert message.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="w-72">
            <AlertTitle>Destructive Alert</AlertTitle>
            <AlertDescription>Something went wrong.</AlertDescription>
          </Alert>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* PROGRESS */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="progress" title="Progress">
          <div className="w-64 space-y-2">
            <Progress value={33} />
            <Progress value={66} />
            <Progress value={100} />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SKELETON */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="skeleton" title="Skeleton">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* CALENDAR */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="calendar" title="Calendar">
          <Calendar
            mode="single"
            selected={calDate}
            onSelect={setCalDate}
            className="rounded-md border"
          />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* DATE PICKER */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="date-picker" title="Date Picker">
          <div className="w-56">
            <DatePicker value={dateVal} onChange={setDateVal} />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* DATE RANGE PICKER */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="date-range-picker" title="Date Range Picker">
          <div className="w-64">
            <DateRangePicker value={rangeVal} onChange={setRangeVal} />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* TIME PICKER */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="time-picker" title="Time Picker">
          <TimePicker value={timeVal} onChange={setTimeVal} />
          <p className="text-xs text-muted-foreground">Value: {timeVal}</p>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* PAGINATION */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="pagination" title="Pagination">
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
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* BREADCRUMB */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="breadcrumb" title="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* TABLE */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="table" title="Table">
          <Table className="w-96">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Alice Santos</TableCell>
                <TableCell>Engineer</TableCell>
                <TableCell>Active</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Bob Reyes</TableCell>
                <TableCell>Designer</TableCell>
                <TableCell>Onboarding</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* SCROLL AREA */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="scroll-area" title="Scroll Area">
          <ScrollArea className="h-32 w-48 rounded-md border p-3">
            {Array.from({ length: 20 }, (_, i) => (
              <p key={i} className="text-sm">
                Item {i + 1}
              </p>
            ))}
          </ScrollArea>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* COMMAND */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="command" title="Command">
          <Command className="w-72 rounded-lg border shadow-md">
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>Dashboard</CommandItem>
                <CommandItem>Employees</CommandItem>
                <CommandItem>Settings</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* CHARTS */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="charts" title="Charts">
          <div className="w-[320px]">
            <p className="mb-1 text-xs text-muted-foreground">BarChart</p>
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
          <div className="w-[320px]">
            <p className="mb-1 text-xs text-muted-foreground">LineChart</p>
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
          <div className="w-[240px]">
            <p className="mb-1 text-xs text-muted-foreground">DonutChart</p>
            <DonutChart
              data={[
                { name: "Active", value: 4 },
                { name: "Inactive", value: 2 },
                { name: "Onboarding", value: 1 },
              ]}
            />
          </div>
          <div className="w-[120px]">
            <p className="mb-1 text-xs text-muted-foreground">SparkBar</p>
            <SparkBar data={[3, 6, 2, 8, 4, 5, 7]} />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* DATA TABLE */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="data-table" title="DataTable">
          <div className="w-full">
            <p className="mb-2 text-xs text-muted-foreground">Default (data)</p>
            <DataTable
              columns={TABLE_COLUMNS}
              data={TABLE_DATA}
              emptyState={<EmptyState icon={Inbox} title="No rows" />}
              getRowId={(r) => String(r.id)}
            />
          </div>
          <div className="w-full">
            <p className="mb-2 text-xs text-muted-foreground">Loading</p>
            <DataTable
              columns={TABLE_COLUMNS}
              data={undefined}
              isLoading
              emptyState={<EmptyState icon={Inbox} title="No rows" />}
            />
          </div>
          <div className="w-full">
            <p className="mb-2 text-xs text-muted-foreground">Empty</p>
            <DataTable
              columns={TABLE_COLUMNS}
              data={[]}
              emptyState={
                <EmptyState
                  icon={Inbox}
                  title="Nothing here"
                  body="Add employees to get started."
                />
              }
            />
          </div>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* EMPTY STATE */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="empty-state" title="EmptyState">
          <EmptyState icon={Inbox} title="No results" />
          <EmptyState
            icon={Inbox}
            title="No results"
            body="Try adjusting your filters."
            action={{ label: "Clear filters", onClick: () => {} }}
          />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* STATUS BADGE */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="status-badge" title="StatusBadge">
          <StatusBadge status="ACTIVE" />
          <StatusBadge status="ONBOARDING" />
          <StatusBadge status="INACTIVE" />
          <StatusBadge status="PENDING" />
          <StatusBadge status="APPROVED" />
          <StatusBadge status="REJECTED" />
          <StatusBadge status="DRAFT" />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* FORM FIELD */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="form-field" title="FormField">
          <FormField
            label="Email"
            htmlFor="ff-email"
            hint="We'll never share your email."
          >
            <Input id="ff-email" placeholder="you@example.com" className="w-56" />
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
              className="w-56"
            />
          </FormField>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* PAGE SECTION */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="page-section" title="PageSection">
          <PageSection
            title="Team Overview"
            description="A quick summary of team health."
            action={<Button size="sm">Add member</Button>}
          >
            <p className="text-sm text-muted-foreground">
              Page section body content.
            </p>
          </PageSection>
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* STAT CARD */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="stat-card" title="StatCard">
          <StatCard label="Total Employees" value={128} />
          <StatCard label="Pending Reviews" value={7} variant="warn" />
          <StatCard label="Overdue Tasks" value={3} variant="alert" />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* CONFIRM DIALOG (ConfirmProvider) */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="confirm-dialog" title="ConfirmDialog (ConfirmProvider)">
          <_ConfirmDemo />
        </Showcase>

        {/* ------------------------------------------------------------------ */}
        {/* FILTER BAR */}
        {/* ------------------------------------------------------------------ */}
        <Showcase id="filter-bar" title="FilterBar">
          <FilterBar className="w-full">
            <Input placeholder="Search…" className="max-w-xs" />
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
        </Showcase>
      </main>
    </ConfirmProvider>
  );
}

// ---------------------------------------------------------------------------
// ConfirmDialog demo (needs useConfirm inside ConfirmProvider)
// ---------------------------------------------------------------------------

function _ConfirmDemo() {
  const [result, setResult] = React.useState<string | null>(null);
  // useConfirm must be called inside ConfirmProvider — which wraps the page.
  const confirm = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: "Confirm action",
      description: "Are you sure you want to proceed?",
      confirmLabel: "Yes, proceed",
      cancelLabel: "Cancel",
      destructive: false,
    });
    setResult(ok ? "Confirmed" : "Cancelled");
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleClick}>
        Open ConfirmDialog
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">→ {result}</span>
      )}
    </div>
  );
}
