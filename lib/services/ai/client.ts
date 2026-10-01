"use client";

import { ApprovalEntity } from "@/lib/types";

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Ask Amazon Bedrock Agent via AWS API Gateway
 */
export async function askAI(
  content: string, 
  files?: Array<{ type: string; name: string; data: string }>,
  options?: { sessionId?: string; patientId?: string; isCritical?: boolean }
) {
  const API_BASE_URL = getApiBaseUrl();

  let targetModel = "amazon.nova-micro-v1:0";
  if (typeof window !== "undefined") {
    targetModel = localStorage.getItem("bedrock-model") || process.env.NEXT_PUBLIC_BEDROCK_MODEL || "amazon.nova-micro-v1:0";
  }

  // Vision fallback if images provided
  if (files && files.length > 0) {
    targetModel = "anthropic.claude-3-5-sonnet-20241022-v2:0";
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content, 
        model: targetModel,
        sessionId: options?.sessionId || "sess-default",
        patientId: options?.patientId || "P-0001",
        isCritical: options?.isCritical || false,
        files 
      })
    });

    const payload = (await response.json()) as {
      text?: string;
      error?: string;
      modelUsed?: string;
      hasRunningSummary?: boolean;
    };

    if (!response.ok) {
      throw new Error(payload.error || `AI Request Failed (${response.status})`);
    }

    return payload.text || "";
  } catch (error) {
    console.warn("[Bedrock Client Gateway Fallback]:", error);
    // Offline / Local Simulation fallback
    return `[Wellync AI Clinical Agent]\n\nได้รับข้อมูลสุขภาพแล้ว: "${content.slice(0, 90)}..."\n\nระบบประเมินค่าสัญญาณชีพอยู่ในเกณฑ์เฝ้าระวัง กรุณาปฏิบัติตามแผนการดูแลอย่างสม่ำเสมอ`;
  }
}

/**
 * Get available Amazon Bedrock Models
 */
export async function getAvailableModels() {
  const API_BASE_URL = getApiBaseUrl();
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Models fetch fallback:", error);
  }

  return {
    provider: "Amazon Bedrock",
    models: [
      { id: "amazon.nova-micro-v1:0", name: "Amazon Nova Micro (Cost-Optimized / Default)", tier: "standard" },
      { id: "anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude 3.5 Haiku (Fast & Precise)", tier: "standard" },
      { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", name: "Claude 3.5 Sonnet (Critical Case Reasoning)", tier: "critical" }
    ]
  };
}

/**
 * Fetch Human-in-the-Loop Approvals from DynamoDB via API Gateway
 */
export async function getApprovals(statusFilter?: "PENDING" | "APPROVED" | "REJECTED" | "ALL"): Promise<ApprovalEntity[]> {
  const API_BASE_URL = getApiBaseUrl();
  const query = statusFilter && statusFilter !== "ALL" ? `?status=${statusFilter}` : "";

  try {
    const res = await fetch(`${API_BASE_URL}/api/approvals${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      const data = await res.json();
      return (data.approvals || []) as ApprovalEntity[];
    }
  } catch (err) {
    console.warn("[Approvals Fetch Fallback to Mock]:", err);
  }

  // Local fallback seed items
  const localList: ApprovalEntity[] = [
    {
      actionId: "APP-001",
      patientId: "P-0001",
      patientName: "นาย สมชาย มีสุขภาพดี",
      type: "medication-change",
      title: "ปรับขนาดยาความดันโลหิต Amlodipine (10mg -> 5mg)",
      description: "AI ตรวจพบความดัน systolic ลดลงต่อเนื่อง 5 วันเฉลี่ย 108/68 mmHg แนะนำลดขนาดยาเพื่อป้องกันอาการหน้ามืด",
      clinicalReason: "ความดันโลหิตต่ำกว่าเกณฑ์ควบคุมอย่างต่อเนื่อง (Systolic < 110 mmHg)",
      suggestedAction: "ปรับลดขนาดยา Amlodipine จาก 10mg เป็น 5mg รับประทานวันละ 1 ครั้งหลังอาหารเช้า",
      confidence: 0.94,
      status: "PENDING",
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      actionId: "APP-002",
      patientId: "P-0002",
      patientName: "นาง สมศรี สดใส",
      type: "urgent-visit",
      title: "นัดหมายตรวจติดตามอาการระดับน้ำตาลพุ่งสูงฉุกเฉิน",
      description: "ตรวจพบระดับน้ำตาลหลังอดอาหารพุ่งเกิน 220 mg/dL สองวันติดต่อกัน",
      clinicalReason: "Hyperglycemia Risk Indicator",
      suggestedAction: "ออกใบนัดตรวจเลือด HbA1c ด่วนภายใน 48 ชั่วโมง",
      confidence: 0.91,
      status: "PENDING",
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  if (statusFilter && statusFilter !== "ALL") {
    return localList.filter((a) => a.status === statusFilter);
  }
  return localList;
}

/**
 * Submit Doctor Human-in-the-Loop Decision (Approve / Reject) to DynamoDB
 */
export async function submitApprovalDecision(
  actionId: string, 
  decision: "APPROVED" | "REJECTED", 
  doctorId: string = "DOC-001", 
  note?: string
) {
  const API_BASE_URL = getApiBaseUrl();

  try {
    const res = await fetch(`${API_BASE_URL}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, decision, doctorId, note })
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[Submit Approval Fallback]:", err);
  }

  return { success: true, actionId, decision, local: true };
}

/**
 * Backward compatibility alias for submitAgentAction
 */
export async function submitAgentAction(actionId: string, decision: "approved" | "rejected", note?: string) {
  return submitApprovalDecision(
    actionId, 
    decision.toUpperCase() as "APPROVED" | "REJECTED", 
    "USER-HITL", 
    note
  );
}
