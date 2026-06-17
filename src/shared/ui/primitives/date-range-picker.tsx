"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/shared/lib/utils";

export type { DateRange };

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range?: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const label =
    value?.from && value?.to
      ? `${format(value.from, "LLL d")} – ${format(value.to, "LLL d, y")}`
      : value?.from
        ? format(value.from, "LLL d, y")
        : "Pick a range";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value?.from && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}
