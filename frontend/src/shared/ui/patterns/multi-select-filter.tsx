"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import {
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

export interface MultiSelectFilterOption {
  id: string;
  name: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectFilterOption[];
  /** Currently selected option ids. Empty means "all" (no filter). */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Trigger label when nothing is selected, e.g. "All supervisors". */
  allLabel: string;
  /** Plural noun for the count label, e.g. "supervisors" → "3 supervisors". */
  countNoun: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Searchable multi-select dropdown used as a list filter. Options are selected via checkboxes,
 * so one or more values can be active at once; an empty selection means no filter is applied.
 */
export function MultiSelectFilter({
  options,
  selected,
  onChange,
  allLabel,
  countNoun,
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  ariaLabel,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const count = selected.size;
  const label =
    count === 0
      ? allLabel
      : count === 1
        ? (options.find((option) => selected.has(option.id))?.name ?? `1 ${countNoun}`)
        : `${count} ${countNoun}`;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none sm:w-[220px]",
            count === 0 && "text-[#a4a7ae]",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown
            className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  keywords={[option.name]}
                  onSelect={() => toggle(option.id)}
                  className="gap-2"
                >
                  <Checkbox
                    checked={selected.has(option.id)}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="truncate">{option.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {count > 0 && (
            <div className="border-t border-[color:var(--border-primary)] p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={() => onChange(new Set())}
              >
                Clear filter
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
