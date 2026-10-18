"use client";
import type { ApprovalEntity } from "@/lib/types";
import { isAwsMode } from "@/lib/runtime";
import { cloudRequest } from "@/lib/services/cloud-auth";

export async function askAI(content: string, files?: Array<{ type: string; name: string; data: string }>, options?: { sessionId?: string; patientId?: string; isCritical?: boolean }) {
  if (!isAwsMode) throw new Error("AI ใช้ได้ในโหมด AWS หลังตั้งค่า Cognito และ Bedrock เท่านั้น");
  const payload = await cloudRequest<{ text: string }>("/api/ai/chat", {
    method: "POST", body: JSON.stringify({ content, files: files?.length ? files : undefined, sessionId: options?.sessionId || "main", patientId: options?.patientId })
  });
  return payload.text;
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
