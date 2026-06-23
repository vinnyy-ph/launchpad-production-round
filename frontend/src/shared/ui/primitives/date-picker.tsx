"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/shared/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, uses a typeable date field with year/month pickers (birthdates). */
  disableFuture?: boolean;
  /** When true, the calendar popover matches the trigger button's width. */
  matchTriggerWidth?: boolean;
  className?: string;
}

const BIRTHDATE_START = new Date(1940, 0, 1);

function toDateInputValue(date?: Date): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function todayInputMax(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function parseDateInputValue(raw: string): Date | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  if (parsed > today) return undefined;

  return parsed;
}

/** Birthdate field: type mm/dd/yyyy or use the browser date picker (year/month dropdowns). */
function BirthdatePicker({
  value,
  onChange,
  disabled,
  className,
}: Pick<DatePickerProps, "value" | "onChange" | "disabled" | "className">) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [draft, setDraft] = React.useState(() => toDateInputValue(value));

  React.useEffect(() => {
    setDraft(toDateInputValue(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="date"
        disabled={disabled}
        min={toDateInputValue(BIRTHDATE_START)}
        max={todayInputMax()}
        value={draft}
        // Hide the browser's built-in indicator; the button below is the single calendar trigger.
        className="min-w-0 pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const next = parseDateInputValue(raw);
          if (next) onChange?.(next);
          else if (!raw.trim()) onChange?.(undefined);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Open calendar"
        onClick={() => inputRef.current?.showPicker?.()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-secondary)] focus-visible:outline-none focus-visible:text-[color:var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-[.38]"
      >
        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  disableFuture,
  matchTriggerWidth,
  className,
}: DatePickerProps) {
  if (disableFuture) {
    return (
      <BirthdatePicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
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
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
