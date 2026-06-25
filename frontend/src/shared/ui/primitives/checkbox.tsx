"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

import { cn } from "@/shared/lib/utils"

// Jia-branded checkbox. The check / indeterminate marks use the design system's
// rounded-cap SVG icons (Untitled UI / Lucide style — strokeLinecap/Linejoin round),
// drawn verbatim from the DS Checkbox component, sized 12px for the 16px box.
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn("jia-cb-root peer", className)} {...props}>
    <CheckboxPrimitive.Indicator className="jia-cb-indicator">
      <svg className="jia-cb-check" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M11.667 3.5 5.25 9.917 2.333 7"
          stroke="currentColor"
          strokeWidth={1.6667}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="jia-cb-dash" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M2.917 7h8.166"
          stroke="currentColor"
          strokeWidth={1.6667}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
