"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { LiquidIndicator } from "@/components/mobile/liquid-indicator";

const healthTabs = [
  { value: "records", label: "บันทึก" },
  { value: "charts", label: "แนวโน้ม" },
  { value: "food", label: "มื้ออาหาร" },
  { value: "ai", label: "ผู้ช่วย" }
];

export function HealthLiquidTabs({ value }: { value: string }) {
  return <TabsPrimitive.List aria-label="ข้อมูลสุขภาพ" className="mobile-liquid-tabs relative isolate grid w-full grid-cols-4">
    <div className="pointer-events-none absolute inset-1" aria-hidden="true">
      <LiquidIndicator index={healthTabs.findIndex(tab => tab.value === value)} count={healthTabs.length} />
    </div>
    {healthTabs.map(tab => <TabsPrimitive.Trigger key={tab.value} value={tab.value}
      className="mobile-liquid-tab relative z-10 whitespace-nowrap font-medium text-slate-500 data-[state=active]:text-sky-800">
      {tab.label}
    </TabsPrimitive.Trigger>)}
  </TabsPrimitive.List>;
}
