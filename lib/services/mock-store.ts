"use client";

import { isAwsMode } from "@/lib/runtime";
import { toast } from "sonner";
import { createMockDatabase, mockDb } from "@/lib/data/mock-db";
import { syncAppointments } from "@/lib/appointments";
import { syncHealthSummaries } from "@/lib/health-summary";
import {
  CarePlan,
  CareTaskStatus,
  ConsentStatus,
  HealthRecord,
  MockDatabase,
  NotificationItem,
  ConsentRequest
} from "@/lib/types";

const STORAGE_KEY = "wellync-mock-db";
const LEGACY_STORAGE_KEY = "true-innovation-mock-db";

export function loadMockStore(): MockDatabase {
  if (typeof window === "undefined") return syncHealthSummaries(syncAppointments(mockDb));
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      raw = legacy;
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
      return syncHealthSummaries(syncAppointments(mockDb));
    }
  }
  try {
    const parsed = JSON.parse(raw) as MockDatabase;
    // Auto-migrate: reset if cached DB has patients without emails or old duplicate notifications
    const needsReset = 
      parsed.patients.some(p => !p.email) || 
      parsed.notifications.some(n => n.id === "N-4" && n.title === "Early Warning") ||
      parsed.notifications.some(n => n.id === "N-2");
    if (needsReset) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
      return syncHealthSummaries(syncAppointments(mockDb));
    }
    return syncHealthSummaries(syncAppointments({
      ...parsed,
      carePlans: parsed.carePlans.map(plan => ({
        ...plan,
        followUp: plan.followUp.map(item => item === "พบแพทย์ตามนัดใน 14 วัน" ? "พบแพทย์ตามวันนัดในปฏิทิน" : item),
        appointments: plan.appointments ?? mockDb.carePlans.find(seed => seed.id === plan.id)?.appointments
      }))
    }));
  } catch {
    const fresh = createMockDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return syncHealthSummaries(syncAppointments(fresh));
  }
}

export function persistMockStore(db: MockDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Demo only: a newly registered patient starts with a copy of the first synthetic patient's history and plan.
// Returns the same object when nothing needs seeding, so callers can skip a state update.
export function seedFromTemplate(db: MockDatabase, patientId: string, body: { weight?: number; height?: number }): MockDatabase {
  const templateId = db.patients[0]?.id;
  const records = db.healthRecords.filter(r => r.patientId === templateId);
  if (!templateId || templateId === patientId || !records.length || db.healthRecords.some(r => r.patientId === patientId)) return db;
  const stamp = Date.now();
  const plan = db.carePlans.find(p => p.patientId === templateId);
  const warning = db.earlyWarnings.find(w => w.patientId === templateId);
  return {
    ...db,
    healthRecords: [...db.healthRecords, ...records.map((r, i) => ({ ...r, id: `${patientId}-R-${i}-${stamp}`, patientId, weight: body.weight || 70, height: body.height || 170 }))],
    carePlans: plan ? [...db.carePlans.filter(p => p.patientId !== patientId), { ...plan, id: `plan-${patientId}`, patientId, tasks: plan.tasks.map((t, i) => ({ ...t, id: `task-${patientId}-${i}`, status: "pending" as const, pendingConfirm: undefined })) }] : db.carePlans,
    earlyWarnings: warning ? [...db.earlyWarnings.filter(w => w.patientId !== patientId), { ...warning, id: `ew-${patientId}`, patientId }] : db.earlyWarnings
  };
}

export function addHealthRecord(db: MockDatabase, record: Omit<HealthRecord, "id">): MockDatabase {
  const newRecord: HealthRecord = {
    ...record,
    id: `${record.patientId}-R-${Date.now()}`
  };
  const records = [...db.healthRecords, newRecord].sort((a, b) => a.date.localeCompare(b.date));
  if (!isAwsMode) toast.success("บันทึกข้อมูลสุขภาพแล้ว");
  return syncHealthSummaries({ ...db, healthRecords: records });
}

export function updateRecordStatus(db: MockDatabase, recordId: string, status: HealthRecord["confirmationStatus"]) {
  if (!isAwsMode) toast.success(status === "confirmed" ? "ยืนยันข้อมูลแล้ว" : "อัปเดตสถานะแล้ว");
  return {
    ...db,
    healthRecords: db.healthRecords.map((record) =>
      record.id === recordId ? { ...record, confirmationStatus: status } : record
    )
  };
}

export function deleteHealthRecord(db: MockDatabase, recordId: string) {
  if (!isAwsMode) toast.success("ลบข้อมูลแล้ว");
  return {
    ...db,
    healthRecords: db.healthRecords.filter((record) => record.id !== recordId)
  };
}

export function proposeTaskStatus(db: MockDatabase, planId: string, taskId: string, proposedStatus: CareTaskStatus) {
  if (!isAwsMode) toast.success("บันทึกกิจกรรมแล้ว (ส่งรอยืนยันจากผู้ดูแล)");
  return {
    ...db,
    carePlans: db.carePlans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, pendingConfirm: proposedStatus } : task))
          }
        : plan
    )
  };
}

export function confirmTaskStatus(db: MockDatabase, planId: string, taskId: string, confirm: boolean) {
  if (!isAwsMode) toast.success(confirm ? "ยืนยันการปฏิบัติกิจกรรมแล้ว" : "ปฏิเสธกิจกรรมแล้ว");
  return {
    ...db,
    carePlans: db.carePlans.map((plan) => {
      return {
        ...plan,
        tasks: plan.tasks.map((task) => {
          if (task.id === taskId) {
            const nextStatus = confirm ? (task.pendingConfirm || "completed") : "pending";
            return { ...task, status: nextStatus, pendingConfirm: undefined };
          }
          return task;
        })
      };
    })
  };
}

export function updateConsentStatus(db: MockDatabase, consentId: string, status: ConsentStatus) {
  if (!isAwsMode) toast.success(status === "approved" ? "อนุมัติคำขอแล้ว" : "ปฏิเสธคำขอแล้ว");
  return {
    ...db,
    consents: db.consents.map((consent) => (consent.id === consentId ? { ...consent, status } : consent))
  };
}

export function createDoctorRequest(db: MockDatabase, patientId: string, doctorId: string) {
  const patient = db.patients.find((item) => item.id === patientId);
  const doctor = db.doctors.find((item) => item.id === doctorId) ?? db.doctors[0];
  const notification: NotificationItem = {
    id: `N-${Date.now()}`,
    userRole: "patient",
    patientId,
    title: "แพทย์ขอเข้าถึงข้อมูล",
    message: `${doctor.name} ขอเข้าถึงประวัติสุขภาพเพื่อดูแลต่อเนื่อง`,
    type: "hospital",
    date: new Date().toISOString(),
    read: false
  };
  if (!isAwsMode) toast.success("ส่งคำขอไปยังผู้ป่วยแล้ว");
  const consent: ConsentRequest = {
    id: `CONSENT-${Date.now()}`,
    patientId,
    doctorId,
    hospital: patient?.hospital ?? doctor.hospital,
    reason: "ขอดูข้อมูล EMR, Observation และ CarePlan เพื่อวางแผนรักษา",
    status: "waiting",
    date: new Date().toISOString()
  };
  return {
    ...db,
    consents: [consent, ...db.consents],
    notifications: [notification, ...db.notifications]
  };
}

export function publishCarePlan(db: MockDatabase, plan: CarePlan) {
  const nextPlan = { ...plan, status: "published" as const, updatedAt: new Date().toISOString() };
  const patientNotification: NotificationItem = {
    id: `N-${Date.now()}-p`,
    userRole: "patient",
    patientId: plan.patientId,
    title: "แพทย์อัปเดตแผนดูแล",
    message: "มีแผนดูแลใหม่ที่ได้รับอนุมัติแล้ว",
    type: "care-plan",
    date: new Date().toISOString(),
    read: false
  };
  const caregiverNotification: NotificationItem = {
    id: `N-${Date.now()}-c`,
    userRole: "caregiver",
    patientId: plan.patientId,
    title: "แผนดูแลใหม่",
    message: "โปรดช่วยผู้ป่วยทำตามแผนที่แพทย์เผยแพร่",
    type: "care-plan",
    date: new Date().toISOString(),
    read: false
  };
  if (!isAwsMode) toast.success("เผยแพร่แผนดูแลแล้ว");
  return {
    ...db,
    carePlans: db.carePlans.map((item) => (item.id === plan.id ? nextPlan : item)),
    notifications: [patientNotification, caregiverNotification, ...db.notifications]
  };
}
