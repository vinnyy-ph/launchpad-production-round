"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/shared/lib/utils";

export type { DateRange };

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range?: DateRange) => void;
  disabled?: boolean;
  /** Latest selectable day; days after this are disabled in the calendar. */
  maxDate?: Date;
  className?: string;
}

export function DateRangePicker({ value, onChange, disabled, maxDate, className }: DateRangePickerProps) {
  const label =
    value?.from && value?.to
      ? `${format(value.from, "LLL d")} - ${format(value.to, "LLL d, y")}`
      : value?.from
        ? format(value.from, "LLL d, y")
        : "Pick a range";

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Matches the DS dropdown trigger (.dd-trigger): hover gray-50, open → gradient border ring,
            caret-style icon, and crucially no press-scale / size change. */}
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-white px-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-[.38]",
            "data-[state=open]:border-transparent data-[state=open]:shadow-[0_0_0_3px_rgba(24,29,39,0.06)] data-[state=open]:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box]",
            !value?.from && "text-[#a4a7ae]",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
          {label}
        </button>
      </PopoverTrigger>
      {/* Popup is the trigger's width, so it lines up with the field (wide modal triggers fit two
          months side by side). It only grows past that when a narrow trigger can't hold both
          months — never clips. Below md the two months stack. */}
      <PopoverContent
        className="w-max min-w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        {/* No adjacent-month days — avoids the "two end dates" confusion. */}
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          showOutsideDays={false}
          {...(maxDate ? { disabled: { after: maxDate } } : {})}
          className="!w-full"
        />
      </PopoverContent>
    </Popover>
  );
}
