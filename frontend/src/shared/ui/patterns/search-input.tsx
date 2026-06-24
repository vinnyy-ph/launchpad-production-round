"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui/primitives/input";
import { cn } from "@/shared/lib/utils";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  /** Current search text (controlled). */
  value: string;
  /** Called with the new text while typing, and with "" when the clear button is pressed. */
  onValueChange: (value: string) => void;
  /** Accessible label for the clear button. */
  clearLabel?: string;
  /** Classes for the wrapper element, e.g. width constraints like `sm:max-w-[320px]`. */
  containerClassName?: string;
}

/**
 * Text search field with a leading search icon and a trailing clear button that appears once the
 * user types. Centralizes search-field styling and clear behavior across the app.
 *
 * Controlled via `value` / `onValueChange`. Clearing calls `onValueChange("")`, so any side effects
 * a caller runs on change (such as resetting pagination) also run when the field is cleared.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onValueChange,
      className,
      containerClassName,
      clearLabel = "Clear search",
      "aria-label": ariaLabel = "Search",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-label={ariaLabel}
          className={cn("pl-9", value ? "pr-9" : undefined, className)}
          {...props}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onValueChange("")}
            aria-label={clearLabel}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
