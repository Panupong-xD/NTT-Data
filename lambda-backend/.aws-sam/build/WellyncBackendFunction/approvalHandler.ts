import { 
  getApprovals, 
  updateApprovalStatus, 
  createApproval, 
  ApprovalEntity 
} from "./db.js";

/**
 * Handle GET /api/approvals
 */
export async function handleGetApprovals(queryParams?: Record<string, string>) {
  const status = (queryParams?.status || "ALL").toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" | "ALL";
  const items = await getApprovals(status);
  return {
    count: items.length,
    statusFilter: status,
    approvals: items
  };
}

/**
 * Handle POST /api/approvals/:id or POST /api/approvals
 */
export async function handleApprovalDecision(body: {
  actionId: string;
  decision: "APPROVED" | "REJECTED";
  doctorId?: string;
  note?: string;
}) {
  if (!body.actionId) {
    throw new Error("actionId is required");
  }

  if (body.decision !== "APPROVED" && body.decision !== "REJECTED") {
    throw new Error("decision must be either APPROVED or REJECTED");
  }

  const result = await updateApprovalStatus(
    body.actionId,
    body.decision,
    body.doctorId || "DOC-001",
    body.note
  );

  return {
    success: true,
    actionId: body.actionId,
    decision: body.decision,
    reviewedAt: result?.reviewedAt,
    reviewedBy: result?.reviewedBy,
    updatedRecord: result
  };
}

/**
 * Handle POST /api/approvals/create (Manual trigger / Simulation)
 */
export async function handleCreateApproval(body: Partial<ApprovalEntity>) {
  const newApproval: ApprovalEntity = {
    actionId: body.actionId || `APP-${Date.now().toString().slice(-6)}`,
    patientId: body.patientId || "P-0001",
    patientName: body.patientName || "สมชาย มีสุขภาพดี",
    type: body.type || "medication-change",
    title: body.title || "ขออนุมัติปรับแผนการรักษา",
    description: body.description || "AI ตรวจพบความจำเป็นในการปรับแผนการดูแล",
    clinicalReason: body.clinicalReason || "Clinical Guideline Compliance",
    suggestedAction: body.suggestedAction || "ปรับขนาดยาตามคำแนะนำ",
    confidence: body.confidence || 0.95,
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  await createApproval(newApproval);
  return {
    success: true,
    approval: newApproval
  };
}
