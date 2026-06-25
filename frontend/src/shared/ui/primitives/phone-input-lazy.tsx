"use client";

import dynamic from "next/dynamic";
import { Input } from "./input";

/** Client-only phone input — avoids Next.js SSR bundling issues with libphonenumber-js. */
export const PhoneInput = dynamic(() => import("./phone-input"), {
  ssr: false,
  loading: () => <Input disabled placeholder="Loading phone input…" aria-busy="true" />,
});
