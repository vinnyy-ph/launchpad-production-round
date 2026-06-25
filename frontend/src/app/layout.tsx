import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/shared/styles/jia-tokens.css";
import "@/shared/styles/fonts/satoshi.css";
import "@/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Manage Jia",
  description: "People and performance, in one place.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
