"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/shared/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown after the label, in a lighter/thinner gray (e.g. a job title). */
  sublabel?: string;
  /**
   * Leading avatar (e.g. employee pickers). When `avatarFallback` is set, a small avatar is
   * rendered before the label — `avatarUrl` shows the photo and `avatarFallback` the initials.
   */
  avatarUrl?: string | null;
  avatarFallback?: string;
}

const AVATAR_FALLBACK_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
};

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
            "flex h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-white px-3.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-[.38]",
            // Open → 45° gradient border ring + soft shadow.
            "aria-[expanded=true]:border-transparent aria-[expanded=true]:shadow-[0_0_0_3px_rgba(24,29,39,0.06)] aria-[expanded=true]:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box]",
            !selected && "text-[color:var(--gray-neutral-400)]",
            className
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              {selected.avatarFallback !== undefined && (
                <UserAvatar
                  src={selected.avatarUrl ?? null}
                  fallback={selected.avatarFallback}
                  className="h-6 w-6 shrink-0"
                  fallbackClassName="text-[10px] font-semibold text-[color:var(--text-primary)]"
                  fallbackStyle={AVATAR_FALLBACK_STYLE}
                />
              )}
              <span className="truncate">{selected.label}</span>
              {/* Avatar options (employees) keep the trigger compact: just avatar + name.
                  Other comboboxes still show their sublabel inline. */}
              {selected.avatarFallback === undefined && selected.sublabel && (
                <span className="truncate font-normal text-[color:var(--text-tertiary)]">
                  {selected.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="min-w-0 truncate">{placeholder}</span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          {/*
           * Stop wheel/touch from bubbling to the dialog's scroll lock (react-remove-scroll),
           * which otherwise swallows these events on the portaled popover and blocks scrolling
           * the list without dragging the scrollbar.
           */}
          <CommandList
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) =>
                o.avatarFallback !== undefined ? (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    keywords={[o.label, o.sublabel ?? ""]}
                    onSelect={() => {
                      onChange?.(o.value === value ? "" : o.value);
                      setOpen(false);
                    }}
                  >
                    <UserAvatar
                      src={o.avatarUrl ?? null}
                      fallback={o.avatarFallback}
                      className="mr-2 h-7 w-7 shrink-0"
                      fallbackClassName="text-[11px] font-semibold text-[color:var(--text-primary)]"
                      fallbackStyle={AVATAR_FALLBACK_STYLE}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[color:var(--text-primary)]">{o.label}</span>
                      {o.sublabel && (
                        <span className="truncate text-xs font-normal text-[color:var(--text-tertiary)]">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                    <Check className={cn("ml-2 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  </CommandItem>
                ) : (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    keywords={[o.label]}
                    onSelect={() => {
                      onChange?.(o.value === value ? "" : o.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                      <span className="truncate">{o.label}</span>
                      {o.sublabel && (
                        <span className="truncate font-normal text-[color:var(--text-tertiary)]">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ),
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
