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
        neutral: "bg-[#FAFAFA] border-[#E9EAEB] text-[color:var(--text-secondary)]",
        success: "bg-[#ECFDF3] border-[#ABEFC6] text-[#067647]",
        warning: "bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]",
        error:   "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]",
        brand:   "bg-[#EEF4FF] border-[#C7D7FE] text-[#3538CD]",
        modern:  "bg-white border-[#D5D7DA] text-[color:var(--text-secondary)]",
        // Deprecated aliases — keep so existing kit/page call-sites still compile
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline:     "text-foreground",
      },
      size: {
        sm: "px-2 py-[2px] text-[11px]",                 // ~22px / 6r
        md: "px-2 py-[3px] text-xs",                      // 24px / 6r (= base)
        lg: "px-2.5 py-[5px] text-[13px] rounded-md",     // 28px / 8r
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
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, pill, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, pill }), className)} {...props} />
  );
}

export { Badge, BadgeDot, badgeVariants };
