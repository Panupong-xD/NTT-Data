import { z } from "zod";
import { authorizePatient, HttpError, id, type Identity } from "./security.js";
import { decideApproval, queryItems } from "./db.js";

export const decisionSchema = z.object({ actionId: id, patientId: id, decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(1000).optional() }).strict();
export async function handleGetApprovals(identity: Identity, status = "ALL") {
  if (identity.role !== "doctor") throw new HttpError(403, "Doctor role required");
  if (!["ALL", "PENDING", "APPROVED", "REJECTED"].includes(status)) throw new HttpError(400, "Invalid status");
  const approvals = [];
  for (const patientId of identity.patientIds) {
    try { await authorizePatient(identity, patientId); }
    catch (error) { if (error instanceof HttpError && error.status === 403) continue; throw error; }
    const items = await queryItems(`PATIENT#${patientId}`, "APPROVAL#");
    approvals.push(...items.filter(item => (!item.ttl || item.ttl > Date.now() / 1000) && (status === "ALL" || item.status === status)).map(({ PK: _PK, SK: _SK, ...item }) => item));
  }
  return { approvals, count: approvals.length };
}
export async function handleApprovalDecision(identity: Identity, input: unknown) {
  if (identity.role !== "doctor") throw new HttpError(403, "Doctor role required");
  const body = decisionSchema.parse(input);
  await authorizePatient(identity, body.patientId);
  const updatedRecord = await decideApproval(body.patientId, body.actionId, body.decision, identity.entityId, body.note);
  // This is a recorded review only. It never executes medication or treatment changes.
  return { success: true, updatedRecord };
}
