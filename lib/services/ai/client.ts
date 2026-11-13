"use client";
import type { ApprovalEntity } from "@/lib/types";
import { isAwsMode } from "@/lib/runtime";
import { cloudRequest } from "@/lib/services/cloud-auth";
import type { AssistantReply } from "@/lib/services/patient-memory";

type AIOptions = { sessionId?: string; patientId?: string; isCritical?: boolean; purpose?: "chat" | "analysis" };
export async function askAI(content: string, files?: Array<{ type: string; name: string; data: string }>, options?: AIOptions) {
  return (await askAssistant(content, files, options)).text;
}
export async function askAssistant(content: string, files?: Array<{ type: string; name: string; data: string }>, options?: AIOptions): Promise<AssistantReply> {
  if (!isAwsMode) {
    const [{ demoAssistant }, { loadMockStore }] = await Promise.all([import("./demo"), import("@/lib/services/mock-store")]);
    await new Promise(resolve => setTimeout(resolve, 400)); // lets the "thinking" state render like a real request
    return demoAssistant(loadMockStore(), content, options);
  }
  const payload = await cloudRequest<AssistantReply>("/api/ai/chat", {
    method: "POST", body: JSON.stringify({ content, files: files?.length ? files : undefined, sessionId: options?.sessionId || "main", patientId: options?.patientId, purpose: options?.purpose || "chat" })
  });
  if (typeof payload?.text !== "string" || !payload.text.trim()) {
    throw new Error("AI ส่งคำตอบในรูปแบบที่ไม่รองรับ กรุณาลองอีกครั้ง");
  }
  return payload;
}
export async function getApprovals(statusFilter = "ALL"): Promise<ApprovalEntity[]> {
  if (!isAwsMode) return [];
  return (await cloudRequest<{ approvals: ApprovalEntity[] }>(`/api/approvals?status=${encodeURIComponent(statusFilter)}`)).approvals;
}
export async function submitApprovalDecision(actionId: string, decision: "APPROVED" | "REJECTED", _doctorId?: string, note?: string, patientId?: string) {
  if (!isAwsMode) throw new Error("การอนุมัติข้อเสนอ AI ต้องเชื่อมต่อ AWS");
  return cloudRequest<{ success: boolean; local?: boolean }>("/api/approvals", { method: "POST", body: JSON.stringify({ actionId, decision, note, patientId }) });
}
export async function submitAgentAction(_actionId: string, _decision: "approved" | "rejected", _note?: string) {
  throw new Error("ข้อเสนอทางการแพทย์ต้องให้แพทย์พิจารณาในหน้าของแพทย์");
}
