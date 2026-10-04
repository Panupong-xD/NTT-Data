"use client";
import { Check, Minus, Bell, X, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { CareTask, UserRole } from "@/lib/types";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { proposeTaskStatus, confirmTaskStatus } from "@/lib/services/mock-store";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "./mobile-sheet";

export function TaskActionSheet({ task, onClose, planId, patientId, role }: { task: CareTask | null; onClose: () => void; planId: string; patientId: string; role: Extract<UserRole,"patient"|"caregiver"> }) {
  const { db, setDb } = useMockStore();
  const proposal = task?.pendingConfirm === "completed" ? "ทำกิจกรรมแล้ว" : task?.pendingConfirm === "skipped" ? "ข้ามกิจกรรม" : "ทำไม่ได้";
  return <MobileSheet open={!!task} onOpenChange={open => !open && onClose()} title={task?.title || "กิจกรรม"} description={task ? `${task.time} น. · ${task.detail}` : undefined}>
    {task && <div className="space-y-3">
      {role === "patient" ? <>
        <Button className="h-12 w-full rounded-full" onClick={() => { setDb(proposeTaskStatus(db, planId, task.id, "completed")); onClose(); }}><Check className="h-5 w-5" />ทำแล้ว</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12 rounded-full" onClick={() => { setDb(proposeTaskStatus(db, planId, task.id, "skipped")); onClose(); }}><Minus className="h-4 w-4" />ข้ามวันนี้</Button>
          <Button variant="outline" className="h-12 rounded-full" onClick={() => { setDb(proposeTaskStatus(db, planId, task.id, "cannot")); onClose(); }}><CircleAlert className="h-4 w-4" />ทำไม่ได้</Button>
        </div>
        <p className="pt-1 text-center text-xs text-slate-500">ผู้ดูแลจะช่วยยืนยันบันทึกนี้</p>
      </> : task.pendingConfirm ? <>
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">ผู้ป่วยบันทึกว่า “{proposal}”</p>
        <Button className="h-12 w-full rounded-full" onClick={() => { setDb(confirmTaskStatus(db, planId, task.id, true)); onClose(); }}><Check className="h-4 w-4" />ยืนยันบันทึก</Button>
        <Button variant="outline" className="h-12 w-full rounded-full" onClick={() => { setDb(confirmTaskStatus(db, planId, task.id, false)); onClose(); }}><X className="h-4 w-4" />ให้ผู้ป่วยตรวจสอบอีกครั้ง</Button>
      </> : <Button className="h-12 w-full rounded-full" onClick={() => {
        setDb(db => ({ ...db, notifications: [{ id: `reminder-${Date.now()}`, patientId, userRole: "patient", title: `อย่าลืม${task.title}`, message: `${task.time} น. · ${task.detail}`, type: "caregiver", date: new Date().toISOString(), read: false }, ...db.notifications] }));
        toast.success("เพิ่มการเตือนให้ผู้ป่วยแล้ว"); onClose();
      }}><Bell className="h-4 w-4" />ส่งการเตือน</Button>}
    </div>}
  </MobileSheet>;
}
