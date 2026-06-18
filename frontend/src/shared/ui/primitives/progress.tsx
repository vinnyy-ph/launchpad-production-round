import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/shared/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      // Brandbook .progress-bar: 6px tall, 10px radius, #DCDFEA track.
      "relative h-[6px] w-full overflow-hidden rounded-[10px] bg-[color:var(--gray-200)]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      // .progress-fill: 45° brand gradient.
      className="h-full w-full flex-1 rounded-[10px] bg-gradient-jia-45 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
