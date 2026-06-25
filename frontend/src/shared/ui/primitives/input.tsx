import * as React from "react"

import { cn } from "@/shared/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  /** When true, applies a red border + red focus glow */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Brandbook .inp: 1px g-300 border, 8px radius, 10/14 padding, 14px weight 500,
          // shadow-xs; focus → #111322 border + soft glow.
          "flex h-10 w-full rounded-md border border-input bg-white px-3.5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[color:var(--gray-neutral-400)] focus-visible:outline-none focus-visible:border-transparent focus-visible:shadow-[0_0_0_3px_rgba(24,29,39,0.06)] focus-visible:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box] disabled:cursor-not-allowed disabled:opacity-[.38]",
          error && "border-[color:var(--color-error-600)] focus-visible:shadow-[0_0_0_3px_rgba(217,45,32,0.15)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
