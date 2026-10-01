"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto" />
        <p className="text-xs font-semibold text-slate-500">กำลังเข้าสู่ระบบ Wellync...</p>
      </div>
    </div>
  );
}
