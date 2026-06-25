import * as React from "react"

import { cn } from "@/shared/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** When true, applies a red border + red focus glow (mirrors Input). */
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Matches the brandbook .inp field 1:1 (as Input does): 1px g-300 border, 8px radius,
          // 10/14 padding, 14px weight 500, shadow-xs; focus → gradient border + soft glow.
          "flex min-h-[60px] w-full rounded-md border border-input bg-white px-3.5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] shadow-xs transition-colors placeholder:text-[color:var(--gray-neutral-400)] focus-visible:outline-none focus-visible:border-transparent focus-visible:shadow-[0_0_0_3px_rgba(24,29,39,0.06)] focus-visible:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(45deg,#fccec0,#ebacc9_33%,#ceb6da_66%,#9fcaed)_border-box] disabled:cursor-not-allowed disabled:opacity-[.38]",
          error && "border-[color:var(--color-error-600)] focus-visible:shadow-[0_0_0_3px_rgba(217,45,32,0.15)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
