import { ZodError } from "zod";
import { authenticate, parseBody, HttpError, type Event } from "./security.js";
import { handleChat } from "./chatHandler.js";
import { handleGetApprovals, handleApprovalDecision } from "./approvalHandler.js";
import { handleGetState, handleUpdateState } from "./stateHandler.js";

export async function handler(event: Event) {
  const response = (statusCode: number, data: unknown) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, body: JSON.stringify(data) });
  const path = event.rawPath;
  const method = event.requestContext.http.method;
  try {
    if (path === "/api/health" && method === "GET") return response(200, { status: "ok" });
    const identity = await authenticate(event);
    if (path === "/api/me" && method === "GET") return response(200, { user: { uid: identity.entityId, name: identity.name, email: identity.email, role: identity.role } });
    if (path === "/api/state" && method === "GET") return response(200, await handleGetState(identity));
    if (path === "/api/state" && method === "PUT") return response(200, await handleUpdateState(identity, parseBody(event)));
    if (path === "/api/ai/chat" && method === "POST") return response(200, await handleChat(identity, parseBody(event)));
    if (path === "/api/approvals" && method === "GET") return response(200, await handleGetApprovals(identity, event.queryStringParameters?.status));
    if (path === "/api/approvals" && method === "POST") return response(200, await handleApprovalDecision(identity, parseBody(event)));
    return response(404, { error: "Not found" });
  } catch (error) {
    if (error instanceof ZodError) return response(400, { error: "Invalid request", fields: error.issues.map(i => i.path.join(".")) });
    if (error instanceof HttpError) return response(error.status, { error: error.message });
    // Never log raw SDK errors, prompts, authorization headers, or patient data.
    console.error(JSON.stringify({ event: "request_failed", requestId: event.requestContext.requestId, errorType: error instanceof Error ? error.name : "UnknownError" }));
    return response(503, { error: "ระบบโหลดข้อมูลจาก AWS ไม่สำเร็จ กรุณาลองอีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแล", requestId: event.requestContext.requestId });
  }
}
