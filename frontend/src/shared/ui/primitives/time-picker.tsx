"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "@/shared/lib/utils";

export interface TimePickerProps {
  value?: string; // "HH:mm" (24h). Minutes snap to 5-min steps; normalize arbitrary times before passing.
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [hh = "", mm = ""] = (value ?? "").split(":");

  const set = (nextH: string, nextM: string) => {
    if (nextH && nextM) onChange?.(`${nextH}:${nextM}`);
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={hh} onValueChange={(h) => set(h, mm || "00")} disabled={disabled}>
        <SelectTrigger className="w-[72px]" aria-label="Hour"><SelectValue placeholder="HH" /></SelectTrigger>
        <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={mm} onValueChange={(m) => set(hh || "00", m)} disabled={disabled}>
        <SelectTrigger className="w-[72px]" aria-label="Minute"><SelectValue placeholder="mm" /></SelectTrigger>
        <SelectContent>{MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
