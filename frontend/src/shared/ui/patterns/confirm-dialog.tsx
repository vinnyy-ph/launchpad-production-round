import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { buttonVariants } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/lib/utils";
import { Spinner } from "./loading-spinner";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When provided, runs before closing; modal stays open with loading until it resolves. */
  onConfirm?: () => void | Promise<unknown>;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    setConfirming(false);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    setConfirming(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!opts?.onConfirm) {
      settle(true);
      return;
    }

    setConfirming(true);
    try {
      await opts.onConfirm();
      settle(true);
    } catch {
      setConfirming(false);
    }
  }, [opts, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !confirming) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
            {opts?.description && (
              <AlertDialogDescription>{opts.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming} onClick={() => settle(false)}>
              {opts?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(opts?.destructive && buttonVariants({ variant: "destructive" }))}
              disabled={confirming}
              onClick={(event) => {
                if (opts?.onConfirm) event.preventDefault();
                void handleConfirm();
              }}
            >
              {confirming ? (
                <>
                  <Spinner size={16} />
                  {opts?.confirmLoadingLabel ?? "Loading…"}
                </>
              ) : (
                opts?.confirmLabel ?? "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
