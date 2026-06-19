import * as React from "react";
import { Label } from "../primitives/label";
import { cn } from "@/shared/lib/utils";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Shows a muted "optional" tag after the label. */
  optional?: boolean;
  /** Render the hint between the label and the field (default is below the field). */
  hintAbove?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, hint, required, optional, hintAbove, className, children }: FormFieldProps) {
  const hintEl = hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[color:var(--text-primary)]">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {optional && <span className="ml-1.5 font-normal text-muted-foreground">optional</span>}
      </Label>
      {hintAbove && hintEl}
      {children}
      {!hintAbove && hintEl}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
