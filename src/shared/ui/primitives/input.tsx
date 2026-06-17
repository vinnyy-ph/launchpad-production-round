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
          "flex h-10 w-full rounded-md border border-input bg-white px-3.5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#a4a7ae] focus-visible:outline-none focus-visible:border-[#111322] focus-visible:shadow-[0_0_0_3px_rgba(17,19,34,0.08)] disabled:cursor-not-allowed disabled:opacity-[.38]",
          error && "border-[#D92D20] focus-visible:shadow-[0_0_0_3px_rgba(217,45,32,0.15)]",
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
