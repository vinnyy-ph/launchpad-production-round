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

export interface LeaderOption {
  id: string;
  name: string;
}

interface TeamLeaderFilterProps {
  leaders: LeaderOption[];
  /** Currently selected leader ids. Empty means "all". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Searchable multi-select dropdown for filtering teams by one or more team leaders.
 * Empty selection means no filter (all leaders).
 */
export function TeamLeaderFilter({ leaders, selected, onChange }: TeamLeaderFilterProps) {
  const [open, setOpen] = useState(false);

  const count = selected.size;
  const label =
    count === 0
      ? "All team leaders"
      : count === 1
        ? (leaders.find((leader) => selected.has(leader.id))?.name ?? "1 leader")
        : `${count} leaders`;

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
          aria-label="Filter by team leader"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none sm:w-[220px]",
            count === 0 && "text-[#a4a7ae]",
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
          <CommandInput placeholder="Search leaders…" />
          <CommandList>
            <CommandEmpty>No leaders found.</CommandEmpty>
            <CommandGroup>
              {leaders.map((leader) => (
                <CommandItem
                  key={leader.id}
                  value={leader.name}
                  keywords={[leader.name]}
                  onSelect={() => toggle(leader.id)}
                  className="gap-2"
                >
                  <Checkbox
                    checked={selected.has(leader.id)}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="truncate">{leader.name}</span>
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
