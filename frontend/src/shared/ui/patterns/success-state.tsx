import { CheckCircle2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SuccessStateProps {
  title: string;
  body?: string;
  className?: string;
}

/**
 * Green confirmation panel — confirms an outcome and names what happens next.
 * Brandbook §12 UX states → Success.
 */
export function SuccessState({ title, body, className }: SuccessStateProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-[10px] border border-[#ABEFC6] bg-[#ECFDF3] p-4",
        className,
      )}
      role="status"
    >
      <CheckCircle2 className="mt-0.5 shrink-0 text-[#079455]" size={20} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-[#047857]">{title}</p>
        {body && <p className="text-[12.5px] font-medium text-[#047857]">{body}</p>}
      </div>
    </div>
  );
}
