"use client";

import { Loader2 } from "lucide-react";
import { UserRole } from "@/lib/types";
import { useRoleGuard } from "@/lib/hooks/use-auth";

export function Protected({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { loading, allowed } = useRoleGuard(role);
  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sky-700 shadow-card">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-semibold">กำลังโหลดข้อมูลสุขภาพ...</span>
        </div>
      </div>
    );
  }
  return children;
}
