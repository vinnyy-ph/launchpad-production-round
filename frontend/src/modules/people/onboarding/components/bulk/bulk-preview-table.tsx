"use client";

import { useMemo } from "react";
import {
  Combobox,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { Trash2 } from "lucide-react";
import { StatusBadge } from "@/shared/ui/patterns";
import type { Department } from "@/modules/people/departments/types/departments.types";
import { toEmployeeOption } from "@/modules/people/employees/employee-options";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";
import type {
  BulkOnboardingPreviewResult,
  BulkOnboardingRowError,
  BulkOnboardingRowInput,
} from "../../types/onboarding.types";

interface BulkPreviewTableProps {
  rows: BulkOnboardingRowInput[];
  preview: BulkOnboardingPreviewResult | null;
  departments: Department[];
  employees: EmployeeListItem[];
  departmentsLoading?: boolean;
  disabled?: boolean;
  onUpdateRow: (rowNumber: number, patch: Partial<BulkOnboardingRowInput>) => void;
  onRemoveRow: (rowNumber: number) => void;
}

function fieldErrorsForRow(
  errors: BulkOnboardingRowError[],
  rowNumber: number,
  field: string,
): BulkOnboardingRowError[] {
  return errors.filter((error) => error.rowNumber === rowNumber && error.field === field);
}

function rowErrorCount(preview: BulkOnboardingPreviewResult | null, rowNumber: number): number {
  return preview?.errors.filter((error) => error.rowNumber === rowNumber).length ?? 0;
}

function resolveSupervisorId(row: BulkOnboardingRowInput, employees: EmployeeListItem[]): string {
  if (row.supervisorId) return row.supervisorId;
  if (!row.supervisorEmail) return "";
  const email = row.supervisorEmail.toLowerCase();
  return employees.find((employee) => employee.companyEmail.toLowerCase() === email)?.id ?? "";
}

function departmentOptionsForRow(departments: Department[], currentDepartment: string | undefined) {
  const names = new Set(departments.map((department) => department.name));
  if (currentDepartment && !names.has(currentDepartment)) {
    return [{ id: "current", name: currentDepartment }, ...departments];
  }
  return departments;
}

function supervisorOptionsForRow(
  employees: EmployeeListItem[],
  department: string | undefined,
) {
  const normalizedDepartment = department ?? "";
  return employees
    .filter(
      (employee) =>
        employee.status === "active" &&
        ((employee.department ?? "") === normalizedDepartment || employee.supervisor === null),
    )
    .map(toEmployeeOption);
}

function CellInput({
  value,
  onChange,
  onBlur,
  disabled,
  hasError,
  errorMessage,
  placeholder,
  type = "text",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  placeholder?: string;
  type?: string;
  "aria-label"?: string;
}) {
  return (
    <div>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        error={hasError}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        className="h-8 min-w-[110px] px-2 py-1 text-xs"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {errorMessage ? (
        <p className="mt-1 text-xs text-[color:var(--color-error-700)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export function BulkPreviewTable({
  rows,
  preview,
  departments,
  employees,
  departmentsLoading = false,
  disabled = false,
  onUpdateRow,
  onRemoveRow,
}: BulkPreviewTableProps) {
  const errors = preview?.errors ?? [];
  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  return (
    <div className="flex flex-col rounded-lg border border-[color:var(--border-primary)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[color:var(--bg-secondary)] text-xs text-[color:var(--text-tertiary)]">
            <tr>
              <th className="px-3 py-2 font-semibold">First name</th>
              <th className="px-3 py-2 font-semibold">Last name</th>
              <th className="px-3 py-2 font-semibold">Work email</th>
              <th className="px-3 py-2 font-semibold">Job title</th>
              <th className="px-3 py-2 font-semibold">Department</th>
              <th className="w-[180px] px-3 py-2 font-semibold">Supervisor</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="w-[44px] px-3 py-2 font-semibold" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border-primary)] bg-white">
            {rows.map((row) => {
              const errorCount = rowErrorCount(preview, row.rowNumber);
              const firstNameErrors = fieldErrorsForRow(errors, row.rowNumber, "firstName");
              const lastNameErrors = fieldErrorsForRow(errors, row.rowNumber, "lastName");
              const emailErrors = fieldErrorsForRow(errors, row.rowNumber, "companyEmail");
              const jobTitleErrors = fieldErrorsForRow(errors, row.rowNumber, "jobTitle");
              const departmentErrors = fieldErrorsForRow(errors, row.rowNumber, "department");
              const supervisorErrors = fieldErrorsForRow(errors, row.rowNumber, "supervisorEmail").concat(
                fieldErrorsForRow(errors, row.rowNumber, "supervisorId"),
              );
              const departmentValue = row.department ?? "";
              const supervisorId = resolveSupervisorId(row, employees);
              const rowDepartmentOptions = departmentOptionsForRow(departments, departmentValue);
              const rowSupervisorOptions = supervisorOptionsForRow(employees, departmentValue);

              return (
                <tr key={row.rowNumber}>
                  <td className="px-3 py-2 align-top">
                    <CellInput
                      value={row.firstName ?? ""}
                      disabled={disabled}
                      hasError={firstNameErrors.length > 0}
                      errorMessage={firstNameErrors[0]?.message}
                      placeholder="First name"
                      aria-label={`Row ${row.rowNumber} first name`}
                      onChange={(value) => onUpdateRow(row.rowNumber, { firstName: value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <CellInput
                      value={row.lastName ?? ""}
                      disabled={disabled}
                      hasError={lastNameErrors.length > 0}
                      errorMessage={lastNameErrors[0]?.message}
                      placeholder="Last name"
                      aria-label={`Row ${row.rowNumber} last name`}
                      onChange={(value) => onUpdateRow(row.rowNumber, { lastName: value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <CellInput
                      type="email"
                      value={row.companyEmail ?? ""}
                      disabled={disabled}
                      hasError={emailErrors.length > 0}
                      errorMessage={emailErrors[0]?.message}
                      placeholder="Work email"
                      aria-label={`Row ${row.rowNumber} work email`}
                      onChange={(value) => onUpdateRow(row.rowNumber, { companyEmail: value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <CellInput
                      value={row.jobTitle ?? ""}
                      disabled={disabled}
                      hasError={jobTitleErrors.length > 0}
                      errorMessage={jobTitleErrors[0]?.message}
                      placeholder="Job title"
                      aria-label={`Row ${row.rowNumber} job title`}
                      onChange={(value) => onUpdateRow(row.rowNumber, { jobTitle: value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Select
                      value={departmentValue}
                      disabled={disabled}
                      onValueChange={(value) => {
                        onUpdateRow(row.rowNumber, {
                          department: value,
                          supervisorId: undefined,
                          supervisorEmail: undefined,
                        });
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Row ${row.rowNumber} department`}
                        className={`h-8 min-w-[130px] px-2 py-1 text-xs ${
                          departmentErrors.length > 0
                            ? "border-[color:var(--color-error-600)]"
                            : ""
                        }`}
                      >
                        <SelectValue
                          placeholder={
                            departmentsLoading ? "Loading…" : "Select department"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {rowDepartmentOptions.map((department) => (
                          <SelectItem key={department.id} value={department.name}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {departmentErrors[0]?.message ? (
                      <p className="mt-1 text-xs text-[color:var(--color-error-700)]">
                        {departmentErrors[0].message}
                      </p>
                    ) : null}
                  </td>
                  <td className="w-[180px] max-w-[180px] px-3 py-2 align-top">
                    <Combobox
                      options={rowSupervisorOptions}
                      value={supervisorId}
                      disabled={disabled || !departmentValue}
                      className="h-8 min-w-0 max-w-[156px] text-xs"
                      placeholder={
                        departmentValue ? "Select supervisor…" : "Select department first"
                      }
                      searchPlaceholder="Search employees…"
                      emptyText={
                        departmentValue
                          ? `No active employees in ${departmentValue}.`
                          : "No employees found."
                      }
                      onChange={(value) => {
                        const supervisor = value ? employeesById.get(value) : undefined;
                        onUpdateRow(row.rowNumber, {
                          supervisorId: value || undefined,
                          supervisorEmail: supervisor?.companyEmail,
                        });
                      }}
                    />
                    {supervisorErrors.length > 0 ? (
                      <p className="mt-1 text-xs text-[color:var(--color-error-700)]">
                        {supervisorErrors[0]?.message ?? "Select a valid supervisor."}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <StatusBadge
                      status={
                        errorCount > 0
                          ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
                          : "Valid"
                      }
                      tone={errorCount > 0 ? "error" : "success"}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Button
                      type="button"
                      variant="destructive-ghost"
                      size="icon-xs"
                      disabled={disabled}
                      aria-label={`Remove row ${row.rowNumber}`}
                      className="text-[color:var(--color-error-600)] hover:text-[color:var(--color-error-700)]"
                      onClick={() => onRemoveRow(row.rowNumber)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="shrink-0 border-t border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
        {rows.length} row{rows.length === 1 ? "" : "s"}. Edit cells, then click Check rows to
        validate changes.
      </p>
    </div>
  );
}
