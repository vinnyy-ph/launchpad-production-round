import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/lib/utils";

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[10px] border border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)] p-4",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-bold text-[color:var(--color-error-700)]">Something went wrong</p>
      <p className="text-[12px] font-medium text-[color:var(--color-error-700)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2 self-start" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <ErrorState
            message="Something went wrong rendering this page."
            onRetry={() => this.setState({ error: null })}
          />
        )
      );
    }
    return this.props.children;
  }
}
