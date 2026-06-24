import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  // Brandbook .btn: 8px radius, 1px border (per-variant color), weight 500, 8px gap, disabled .38.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-[.38] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] [transition:background_120ms_cubic-bezier(.2,0,0,1),transform_100ms_cubic-bezier(.2,0,0,1),box-shadow_120ms_cubic-bezier(.2,0,0,1),color_120ms_cubic-bezier(.2,0,0,1),border-color_120ms_cubic-bezier(.2,0,0,1)]",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "border-transparent bg-[color:var(--color-error-600)] text-white hover:bg-[#b91c1c]",
        outline:     "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:   "border-input bg-white text-foreground shadow-xs hover:bg-gray-50",
        ghost:       "border-transparent text-foreground hover:bg-[var(--gray-50)]",
        link:        "border-transparent text-primary underline-offset-4 hover:underline",
        "destructive-ghost": "border-transparent text-[color:var(--text-tertiary)] hover:bg-[color:var(--color-error-50)] hover:text-[color:var(--color-error-600)]",
      },
      size: {
        xs:      "h-8 px-2.5 text-xs gap-1.5",
        sm:      "h-9 px-3 text-[13px] gap-1.5", /* --btn-fs-sm: button size-scale, not the text scale */
        default: "h-10 px-3.5",
        lg:      "h-11 px-4",
        xl:      "h-12 px-[18px] text-base gap-2",
        icon:    "h-10 w-10",
        "icon-xs": "h-8 w-8",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-11 w-11",
        "icon-xl": "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
