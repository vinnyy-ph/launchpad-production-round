"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/shared/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

// Searchable single-select (the shadcn combobox recipe: Popover + Command),
// Jia-themed via tokens. Selecting the current value clears it.
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            // Matches .dd-trigger: 40px, 8px radius, g-300 border, shadow-xs, 14px weight 500.
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-[.38]",
            // Open → 45° gradient border ring + soft shadow.
            "aria-[expanded=true]:border-transparent aria-[expanded=true]:shadow-[0_0_0_3px_rgba(24,29,39,0.06)] aria-[expanded=true]:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box]",
            !selected && "text-[#a4a7ae]",
            className
          )}
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  keywords={[o.label]}
                  onSelect={() => {
                    onChange?.(o.value === value ? "" : o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
