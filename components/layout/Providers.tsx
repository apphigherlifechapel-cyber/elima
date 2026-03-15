"use client";
import { SessionProvider } from "next-auth/react";
import { PwaRegistration } from "@/components/layout/PwaRegistration";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaRegistration />
      {children}
    </SessionProvider>
  );
}
