"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

import { cn } from "@/shared/lib/utils"

// Jia-branded checkbox — visuals ported verbatim from the brandbook `.jia-cb`
// (see `.jia-cb-root` in src/index.css). Radix drives [data-state]; the check /
// indeterminate marks are drawn with ::after, identical geometry to the book.
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn("jia-cb-root peer", className)}
    {...props}
  />
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
