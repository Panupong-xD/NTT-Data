"use client";

import { toast } from "sonner";
import { createMockDatabase, evaluateEarlyWarning, mockDb } from "@/lib/data/mock-db";
import {
  CarePlan,
  CareTaskStatus,
  ConsentStatus,
  HealthRecord,
  MockDatabase,
  NotificationItem,
  ConsentRequest
} from "@/lib/types";

const STORAGE_KEY = "true-innovation-mock-db";

export function loadMockStore(): MockDatabase {
  if (typeof window === "undefined") return mockDb;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
    return mockDb;
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
      return mockDb;
    }
    return parsed;
  } catch {
    const fresh = createMockDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function persistMockStore(db: MockDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function addHealthRecord(db: MockDatabase, record: Omit<HealthRecord, "id">): MockDatabase {
  const newRecord: HealthRecord = {
    ...record,
    id: `${record.patientId}-R-${Date.now()}`
  };
  const records = [...db.healthRecords, newRecord].sort((a, b) => a.date.localeCompare(b.date));
  const patientRecords = records.filter((item) => item.patientId === record.patientId);
  const warning = evaluateEarlyWarning(patientRecords, record.patientId);
  toast.success("บันทึกข้อมูลสุขภาพแล้ว");
  return {
    ...db,
    healthRecords: records,
    earlyWarnings: db.earlyWarnings.map((item) => (item.patientId === record.patientId ? warning : item))
  };
}

export function updateRecordStatus(db: MockDatabase, recordId: string, status: HealthRecord["confirmationStatus"]) {
  toast.success(status === "confirmed" ? "ยืนยันข้อมูลแล้ว" : "อัปเดตสถานะแล้ว");
  return {
    ...db,
    healthRecords: db.healthRecords.map((record) =>
      record.id === recordId ? { ...record, confirmationStatus: status } : record
    )
  };
}

export function deleteHealthRecord(db: MockDatabase, recordId: string) {
  toast.success("ลบข้อมูลแล้ว");
  return {
    ...db,
    healthRecords: db.healthRecords.filter((record) => record.id !== recordId)
  };
}

export function updateTaskStatus(db: MockDatabase, planId: string, taskId: string, status: CareTaskStatus) {
  return {
    ...db,
    carePlans: db.carePlans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
          }
        : plan
    )
  };
}

export function proposeTaskStatus(db: MockDatabase, planId: string, taskId: string, proposedStatus: CareTaskStatus) {
  toast.success("บันทึกกิจกรรมแล้ว (ส่งรอยืนยันจากผู้ดูแล)");
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
  toast.success(confirm ? "ยืนยันการปฏิบัติกิจกรรมแล้ว" : "ปฏิเสธกิจกรรมแล้ว");
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
  toast.success(status === "approved" ? "อนุมัติคำขอแล้ว" : "ปฏิเสธคำขอแล้ว");
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
  toast.success("ส่งคำขอไปยังผู้ป่วยแล้ว");
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
  toast.success("เผยแพร่แผนดูแลแล้ว");
  return {
    ...db,
    carePlans: db.carePlans.map((item) => (item.id === plan.id ? nextPlan : item)),
    notifications: [patientNotification, caregiverNotification, ...db.notifications]
  };
}
