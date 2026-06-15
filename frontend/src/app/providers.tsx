import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

/** App-wide context providers. Currently just routing; add query/theme providers here as they land. */
export function Providers({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
