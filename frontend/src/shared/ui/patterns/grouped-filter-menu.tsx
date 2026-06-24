"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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

export interface FilterGroupOption {
  id: string;
  name: string;
}

export interface FilterGroup {
  /** Stable key for the group, used as the React key and active-view id. */
  key: string;
  /** Category label, e.g. "Filter by teams". */
  label: string;
  options: FilterGroupOption[];
  /** Currently selected option ids. Empty means the group applies no filter. */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchPlaceholder?: string;
  emptyText?: string;
}

interface GroupedFilterMenuProps {
  groups: FilterGroup[];
  ariaLabel?: string;
  className?: string;
}

/** Small pink pill summarizing how many options are selected. */
function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--brand-pink)] px-1.5 text-xs font-semibold text-white">
      {count}
    </span>
  );
}

/**
 * A single "Filter" dropdown that groups several multi-select filters behind one trigger. The panel
 * first lists the categories; choosing one drills into its searchable checkbox list. Reuses the same
 * Popover + Command + Checkbox styling as {@link MultiSelectFilter} for visual consistency.
 */
export function GroupedFilterMenu({
  groups,
  ariaLabel = "Filter",
  className,
}: GroupedFilterMenuProps) {
  const [open, setOpen] = useState(false);
  // Which category's choices are currently shown; null = the top-level category list.
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const totalSelected = groups.reduce((sum, group) => sum + group.selected.size, 0);
  const activeGroup = groups.find((group) => group.key === activeKey) ?? null;

  function toggle(group: FilterGroup, id: string) {
    const next = new Set(group.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    group.onChange(next);
  }

  function clearAll() {
    for (const group of groups) {
      if (group.selected.size > 0) group.onChange(new Set());
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset to the category list whenever the panel closes.
        if (!next) setActiveKey(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "relative flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white pl-9 pr-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none sm:w-auto",
            className,
          )}
        >
          <Filter
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            aria-hidden="true"
          />
          <span className="truncate">Filter</span>
          {totalSelected > 0 ? <CountBadge count={totalSelected} /> : null}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0" align="start">
        {activeGroup ? (
          <Command>
            <button
              type="button"
              onClick={() => setActiveKey(null)}
              className="flex w-full items-center gap-1.5 border-b border-[color:var(--border-primary)] px-3 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{activeGroup.label}</span>
            </button>
            <CommandInput placeholder={activeGroup.searchPlaceholder ?? "Search…"} />
            <CommandList>
              <CommandEmpty>{activeGroup.emptyText ?? "No results."}</CommandEmpty>
              <CommandGroup>
                {activeGroup.options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    keywords={[option.name]}
                    onSelect={() => toggle(activeGroup, option.id)}
                    className="gap-2"
                  >
                    <Checkbox
                      checked={activeGroup.selected.has(option.id)}
                      aria-hidden="true"
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    <span className="truncate">{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {activeGroup.selected.size > 0 && (
              <div className="border-t border-[color:var(--border-primary)] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => activeGroup.onChange(new Set())}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </Command>
        ) : (
          <Command>
            <CommandList>
              <CommandGroup>
                {groups.map((group) => (
                  <CommandItem
                    key={group.key}
                    value={group.label}
                    onSelect={() => setActiveKey(group.key)}
                    className="justify-between gap-2"
                  >
                    <span className="truncate">{group.label}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {group.selected.size > 0 ? <CountBadge count={group.selected.size} /> : null}
                      <ChevronRight
                        className="h-4 w-4 text-[color:var(--text-tertiary)]"
                        aria-hidden="true"
                      />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {totalSelected > 0 && (
              <div className="border-t border-[color:var(--border-primary)] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={clearAll}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
