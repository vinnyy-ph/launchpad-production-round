import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

/**
 * App toast surface (success / error). Themed to Jia tokens; mounted once in app providers.
 * Light theme only — the product UI has no dark mode.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Override the neutral base color for typed toasts so success/error get their own colors.
          success: "!bg-[#ECFDF3] !text-[#027A48] !border-[#6CE9A6]",
          error: "!bg-[#FEF3F2] !text-[#7A271A] !border-[#B42318]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
