"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/shared/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Birthdate mode: disables future dates and shows year/month dropdowns in the calendar so users
   * can jump back many years quickly.
   */
  disableFuture?: boolean;
  /**
   * Latest selectable date (e.g. today minus minimum employment age). When set with
   * `disableFuture`, dates after this day are disabled in the calendar.
   */
  maxDate?: Date;
  /** When true, the calendar popover matches the trigger button's width. */
  matchTriggerWidth?: boolean;
  /** Disables (greys out, unselectable) all dates before this one in the calendar. */
  minDate?: Date;
  className?: string;
}

/** Earliest selectable year for birthdate fields (lower bound of the year dropdown). */
const BIRTHDATE_START = new Date(1940, 0, 1);

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  disableFuture,
  maxDate,
  matchTriggerWidth,
  minDate,
  className,
}: DatePickerProps) {
  const today = startOfToday();
  const birthdateUpperBound = maxDate ?? today;

  // Birthdate mode disables future days; otherwise an optional minDate disables earlier days.
  // The two are not combined in practice.
  const disabledDays = disableFuture
    ? { after: birthdateUpperBound }
    : minDate
      ? { before: minDate }
      : undefined;

  // Month/year are selectable via dropdowns so users can jump quickly. Birthdates span
  // 1940→today; other pickers use a wide window around today.
  const startMonth = disableFuture
    ? BIRTHDATE_START
    : (minDate ?? new Date(today.getFullYear() - 10, 0, 1));
  const endMonth = disableFuture ? birthdateUpperBound : new Date(today.getFullYear() + 10, 11, 31);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-[color:var(--gray-neutral-400)]",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          matchTriggerWidth ? "w-[var(--radix-popover-trigger-width)]" : "w-auto",
          "p-0",
        )}
        align="start"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value ?? (disableFuture ? today : minDate)}
          disabled={disabledDays}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
