"use client";
import dynamic from "next/dynamic";

function ChartLoading() {
  return <div role="status" aria-label="กำลังเปิดกราฟ" className="flex h-[300px] items-center justify-center rounded-[24px] bg-sky-50/60 text-xs text-slate-500">กำลังเปิดกราฟ…</div>;
}

// The page and its navigation paint without waiting for the chart library.
export const MobileHealthChart = dynamic(() => import("@/components/mobile/health-chart").then(module => module.MobileHealthChart), { ssr: false, loading: ChartLoading });
export const DoctorHealthChart = dynamic(() => import("@/components/doctor/health-chart").then(module => module.DoctorHealthChart), { ssr: false, loading: ChartLoading });
