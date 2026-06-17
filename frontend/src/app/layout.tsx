import type { Metadata } from "next";
import "@/shared/styles/jia-tokens.css";
import "@/shared/styles/fonts/satoshi.css";
import "@/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SwiftWork",
  description: "People and performance, in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
