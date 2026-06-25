import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  // Brandbook .badge: 5px gap, 6px radius, 3px/8px padding, 12px weight 500, 1px border.
  "inline-flex items-center gap-[5px] rounded-sm border px-2 py-[3px] text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // New brandbook status variants
        neutral: "bg-[color:var(--gray-neutral-50)] border-[color:var(--gray-neutral-200)] text-[color:var(--text-secondary)]",
        success: "bg-[color:var(--color-success-50)] border-[color:var(--color-success-200)] text-[color:var(--color-success-700)]",
        warning: "bg-[color:var(--color-warning-50)] border-[color:var(--color-warning-200)] text-[color:var(--color-warning-700)]",
        error:   "bg-[color:var(--color-error-50)] border-[color:var(--color-error-200)] text-[color:var(--color-error-700)]",
        brand:   "bg-gradient-badge-brand border-transparent text-[color:var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(24,29,39,0.06)]",
        modern:  "bg-white border-[color:var(--gray-neutral-300)] text-[color:var(--text-secondary)]",
        // Deprecated aliases — keep so existing kit/page call-sites still compile
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline:     "text-foreground",
      },
      size: {
        // Brandbook defines a single badge size; sm and md are identical so every badge
        // is one consistent height. (text-xs carries the Jia 12/18 size+leading; the old
        // sm used an arbitrary text-[12px] with no paired leading → context-dependent height.)
        sm: "px-2 py-[3px] text-xs",
        md: "px-2 py-[3px] text-xs",
        lg: "px-2.5 py-[5px] text-sm rounded-md",
      },
      pill: {
        true: "rounded-full",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  }
);

/** Leading status dot — render inside <Badge> before text when you want the dot pattern */
function BadgeDot({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full bg-current", className)} {...props} />;
}

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Play the DS pop-in entrance (scale + fade). Use only for badges that appear as a
   *  result of an action — not static badges in tables/lists. */
  animateIn?: boolean;
}

function Badge({ className, variant, size, pill, animateIn, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size, pill }), animateIn && "badge-pop-in", className)}
      {...props}
    />
  );
}

export { Badge, BadgeDot, badgeVariants };
