"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { MockStoreProvider } from "@/lib/hooks/use-mock-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockStoreProvider>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </MockStoreProvider>
  );
}
