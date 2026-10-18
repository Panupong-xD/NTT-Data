import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { z } from "zod";
import { getItem } from "./db.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const roles = z.enum(["patient", "caregiver", "doctor"]);
export const identitySchema = z.object({
  entityId: id, role: roles, patientIds: z.array(id).min(1).max(50), name: z.string().max(150), email: z.string().email()
});
export type Identity = z.infer<typeof identitySchema> & { sub: string };
export type Event = APIGatewayProxyEventV2WithJWTAuthorizer;

export async function authenticate(event: Event): Promise<Identity> {
  // Claims are injected by API Gateway's JWT authorizer, never decoded from client input.
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims?.sub || claims.token_use !== "access") throw new HttpError(401, "Authentication required");
  const profile = await getItem(`USER#${claims.sub}`, "PROFILE");
  const parsed = identitySchema.safeParse(profile);
  if (!parsed.success) throw new HttpError(403, "Account has not been provisioned");
  if (parsed.data.role === "patient" && (parsed.data.patientIds.length !== 1 || parsed.data.patientIds[0] !== parsed.data.entityId)) throw new HttpError(403, "Invalid patient assignment");
  if (parsed.data.role === "caregiver" && parsed.data.patientIds.length !== 1) throw new HttpError(403, "Invalid caregiver assignment");
  return { ...parsed.data, sub: String(claims.sub) };
}

export async function authorizePatient(identity: Identity, patientId: string) {
  if (!identity.patientIds.includes(patientId)) throw new HttpError(403, "Patient access denied");
  if (identity.role === "doctor") {
    const consent = await getItem(`PATIENT#${patientId}`, `CONSENT#${identity.entityId}`);
    if (consent?.status !== "approved") throw new HttpError(403, "Patient consent required");
  }
}

export function parseBody(event: Event): unknown {
  const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "{}";
  if (Buffer.byteLength(body) > 1_500_000) throw new HttpError(413, "Request too large");
  try { return JSON.parse(body); } catch { throw new HttpError(400, "Invalid JSON"); }
}
