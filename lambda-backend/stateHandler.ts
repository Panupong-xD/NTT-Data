import { z } from "zod";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { authorizePatient, HttpError, id, type Identity } from "./security.js";
import { docClient, getItem, queryItems } from "./db.js";

const text = z.string().max(2000);
const strings = z.array(text).max(50);
const task = z.object({ id, title: text, category: z.enum(["medication", "exercise", "diet", "measurement", "appointment"]), time: z.string().max(20), detail: text, status: z.enum(["pending", "completed", "skipped", "cannot"]), pendingConfirm: z.enum(["pending", "completed", "skipped", "cannot"]).optional() }).strict();
export const schemas = {
  patients: z.object({ id, citizenId: z.string().max(30), name: z.string().min(1).max(150), age: z.number().int().min(0).max(130), gender: z.string().max(30), diagnosis: strings, allergies: strings, medications: strings, doctorId: id, caregiverId: id, hospital: text, healthScore: z.number().min(0).max(100).nullable(), email: z.string().email(), dob: z.string().max(30).optional(), weight: z.number().min(1).max(500).optional(), height: z.number().min(20).max(250).optional(), phone: z.string().max(30).optional(), occupation: text.optional(), address: text.optional() }).strict(),
  healthRecords: z.object({ id, patientId: id, date: z.string().datetime({ offset: true }), systolic: z.number().min(0).max(300), diastolic: z.number().min(0).max(200), bloodSugar: z.number().min(0).max(1000), bloodSugarTiming: z.enum(["before-meal", "after-meal", "unknown"]).optional(), heartRate: z.number().min(0).max(300), weight: z.number().min(0).max(500), height: z.number().min(0).max(250), sleepHours: z.number().min(0).max(24), exerciseMinutes: z.number().min(0).max(1440), medicationTaken: z.boolean(), foodScore: z.number().min(0).max(100), waterGlasses: z.number().min(0).max(100), source: z.enum(["patient", "caregiver", "device"]), confirmationStatus: z.enum(["pending", "confirmed", "rejected"]), note: text.optional() }).strict(),
  carePlans: z.object({ id, patientId: id, doctorId: id, status: z.enum(["draft", "approved", "published"]), updatedAt: z.string().datetime({ offset: true }), summary: text, medication: strings, diet: strings, exercise: strings, measurement: strings, followUp: strings, lifestyle: strings, tasks: z.array(task).max(100), appointments: z.array(z.object({ id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().max(20), title: text, location: text.optional() }).strict()).max(50).optional() }).strict(),
  consents: z.object({ id, patientId: id, doctorId: id, hospital: text, reason: text, status: z.enum(["waiting", "approved", "rejected"]), date: z.string().datetime({ offset: true }) }).strict(),
  notifications: z.object({ id, patientId: id, userRole: z.enum(["patient", "caregiver", "doctor"]), title: text, message: text, type: z.enum(["medication", "appointment", "care-plan", "warning", "caregiver", "hospital", "ai"]), date: z.string().datetime({ offset: true }), read: z.boolean() }).strict(),
  caregivers: z.object({ id, name: z.string().max(150), patientId: id, relationship: text, email: z.string().email(), mcsiScore: z.number().min(0).max(26), wellbeingCheckIn: z.object({ date: z.string().max(50), energy: z.number().min(0).max(10), rest: z.number().min(0).max(10), worry: z.number().min(0).max(10) }).strict().optional() }).strict()
};
type Collection = keyof typeof schemas;
const prefix: Record<Collection, string> = { patients: "PROFILE", healthRecords: "RECORD#", carePlans: "PLAN#", consents: "CONSENT#", notifications: "NOTIFICATION#", caregivers: "CAREGIVER#" };
const clean = (value: Record<string, any>) => { const { PK: _PK, SK: _SK, version: _version, ...rest } = value; return rest; };
const stable = (v: any): string => JSON.stringify(v && typeof v === "object" ? Array.isArray(v) ? v.map(v => JSON.parse(stable(v))) : Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, JSON.parse(stable(v[k]))])) : v);
function unchangedExcept(before: any, after: any, allowed: string[]) {
  const omit = (v: any) => Object.fromEntries(Object.entries(v).filter(([key]) => !allowed.includes(key)));
  if (stable(omit(before)) !== stable(omit(after))) throw new HttpError(403, "Field change is not permitted");
}
export function validateMutation(identity: Identity, collection: Collection, before: any, after: any) {
  if (collection === "patients") {
    if (identity.role !== "patient" || !before || !after || before.id !== identity.entityId) throw new HttpError(403, "Profile update denied");
    unchangedExcept(before, after, ["name", "phone", "address", "occupation", "dob", "weight", "height"]);
  } else if (collection === "healthRecords") {
    if (identity.role === "doctor") throw new HttpError(403, "Record update denied");
    if (identity.role === "patient") {
      if (before && before.confirmationStatus !== "pending") throw new HttpError(403, "Confirmed record is immutable");
      if (after && (after.confirmationStatus !== "pending" || after.source === "caregiver")) throw new HttpError(403, "Caregiver confirmation required");
    } else if (before) {
      if (!after) throw new HttpError(403, "Record deletion denied");
      unchangedExcept(before, after, ["confirmationStatus"]);
    } else if (after?.source !== "caregiver") throw new HttpError(403, "Invalid record source");
  } else if (collection === "carePlans") {
    if (!after || after.status === "draft") throw new HttpError(403, "Only reviewed plans can be persisted");
    if (identity.role === "doctor") {
      if (after.doctorId !== identity.entityId) throw new HttpError(403, "Plan doctor mismatch");
    } else {
      if (!before) throw new HttpError(403, "Plan must be provisioned first");
      unchangedExcept(before, after, ["tasks", "updatedAt"]);
      if (before.tasks.length !== after.tasks.length) throw new HttpError(403, "Task list changes require a doctor");
      before.tasks.forEach((t: any, i: number) => unchangedExcept(t, after.tasks[i], identity.role === "patient" ? ["pendingConfirm"] : ["pendingConfirm", "status"]));
    }
  } else if (collection === "consents") {
    if (!after || identity.role === "caregiver") throw new HttpError(403, "Only patient can decide consent");
    if (identity.role === "patient") {
      if (!before) throw new HttpError(403, "Consent request required");
      unchangedExcept(before, after, ["status"]);
    } else {
      if (after.doctorId !== identity.entityId || after.status !== "waiting" || before?.status === "approved") throw new HttpError(403, "Invalid consent request");
    }
  } else if (collection === "caregivers") {
    if (!before || !after || identity.role !== "caregiver" || after.id !== identity.entityId) throw new HttpError(403, "Caregiver update denied");
    unchangedExcept(before, after, ["mcsiScore", "wellbeingCheckIn"]);
  } else if (collection === "notifications") {
    if (!after) throw new HttpError(403, "Notification deletion denied");
    if (before) {
      if (before.userRole !== identity.role) throw new HttpError(403, "Notification update denied");
      unchangedExcept(before, after, ["read"]);
    } else if (identity.role === "patient" || after.read || after.userRole === "doctor") throw new HttpError(403, "Notification creation denied");
  }
}
export async function handleGetState(identity: Identity) {
  const db = { patients: [] as any[], doctors: [] as any[], caregivers: [] as any[], healthRecords: [] as any[], carePlans: [] as any[], notifications: [] as any[], consents: [] as any[], earlyWarnings: [] as any[], chatHistory: {} };
  const doctorIds = new Set<string>();
  if (identity.role === "doctor") doctorIds.add(identity.entityId);
  for (const patientId of identity.patientIds) {
    const items = await queryItems(`PATIENT#${patientId}`, "", 300);
    const consent = items.find(i => i.SK === `CONSENT#${identity.entityId}`);
    const allowed = identity.role !== "doctor" || consent?.status === "approved";
    const patient = items.find(i => i.SK === "PROFILE");
    if (!patient) throw new HttpError(409, "Patient records have not been provisioned");
    if (patient) {
      doctorIds.add(patient.doctorId);
      db.patients.push((allowed ? clean(patient) : { id: patient.id, name: patient.name, hospital: patient.hospital, doctorId: identity.entityId, caregiverId: "", citizenId: "", age: 0, gender: "", diagnosis: [], allergies: [], medications: [], email: "", healthScore: null }) as any);
    }
    for (const collection of ["healthRecords", "carePlans", "notifications", "consents", "caregivers"] as const) {
      const rows = items.filter(i => i.SK.startsWith(prefix[collection]) && (collection !== "carePlans" || i.status === "published" || i.status === "approved"));
      const visible = collection === "consents" ? rows.filter(i => identity.role !== "doctor" || i.doctorId === identity.entityId) : allowed ? rows : [];
      (db[collection] as any[]).push(...visible.filter(i => collection !== "notifications" || i.userRole === identity.role).map(clean));
    }
  }
  for (const doctorId of doctorIds) {
    const doctor = await getItem(`DIRECTORY#${doctorId}`, "PROFILE");
    if (doctor) db.doctors.push(clean(doctor) as any);
  }
  db.healthRecords.sort((a, b) => a.date.localeCompare(b.date));
  db.carePlans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  db.notifications.sort((a, b) => b.date.localeCompare(a.date));
  return { db };
}
const operation = z.object({ collection: z.enum(["patients", "healthRecords", "carePlans", "consents", "notifications", "caregivers"]), before: z.record(z.unknown()).nullable(), after: z.record(z.unknown()).nullable() }).strict();
export const operationsSchema = z.object({ operations: z.array(operation).min(1).max(50) }).strict();
export async function handleUpdateState(identity: Identity, input: unknown) {
  const { operations } = operationsSchema.parse(input);
  const writes = [];
  const keys = new Set<string>();
  const requiredConsents = new Set<string>();
  for (const op of operations) {
    if (!op.before && !op.after) throw new HttpError(400, "Empty operation");
    const before = op.before ? schemas[op.collection].parse(op.before) : null;
    const after = op.after ? schemas[op.collection].parse(op.after) : null;
    const row = after || before!;
    const patientId = "patientId" in row ? row.patientId as string : row.id;
    if (!identity.patientIds.includes(patientId)) throw new HttpError(403, "Patient access denied");
    const consentNotification = identity.role === "doctor" && op.collection === "notifications" && !before && after && "type" in after && after.type === "hospital" && "userRole" in after && after.userRole === "patient" && operations.some(other => other.collection === "consents" && other.after?.patientId === patientId && other.after?.doctorId === identity.entityId && other.after?.status === "waiting");
    if (op.collection !== "consents" && !consentNotification) {
      await authorizePatient(identity, patientId);
      if (identity.role === "doctor") requiredConsents.add(patientId);
    }
    if (before && after && (before.id !== after.id || ("patientId" in before && before.patientId !== (after as any).patientId))) throw new HttpError(400, "Record identity is immutable");
    const PK = `PATIENT#${patientId}`;
    const SK = op.collection === "patients" ? "PROFILE" : prefix[op.collection] + (op.collection === "consents" ? (row as any).doctorId : row.id);
    if (keys.has(PK + SK)) throw new HttpError(400, "Duplicate operation");
    keys.add(PK + SK);
    const current = await getItem(PK, SK);
    if (op.collection === "patients" && current && before && after) { (before as any).healthScore = current.healthScore; (after as any).healthScore = current.healthScore; }
    if (stable(current ? clean(current) : null) !== stable(before)) throw new HttpError(409, "Data changed; reload before saving");
    validateMutation(identity, op.collection, before, after);
    const condition = current ? "version = :version" : "attribute_not_exists(PK)";
    const values = current ? { ":version": current.version || 1 } : undefined;
    if (after) writes.push({ Put: { TableName: process.env.DYNAMODB_TABLE, Item: { PK, SK, ...after, version: (current?.version || 0) + 1 }, ConditionExpression: condition, ExpressionAttributeValues: values } });
    else writes.push({ Delete: { TableName: process.env.DYNAMODB_TABLE, Key: { PK, SK }, ConditionExpression: condition, ExpressionAttributeValues: values } });
  }
  for (const patientId of requiredConsents) {
    if (keys.has(`PATIENT#${patientId}CONSENT#${identity.entityId}`)) throw new HttpError(400, "Consent and clinical updates must be separate requests");
    writes.push({ ConditionCheck: { TableName: process.env.DYNAMODB_TABLE, Key: { PK: `PATIENT#${patientId}`, SK: `CONSENT#${identity.entityId}` }, ConditionExpression: "#status = :approved", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":approved": "approved" } } } as any);
  }
  try { await docClient.send(new TransactWriteCommand({ TransactItems: writes })); }
  catch (error) { if ((error as Error).name === "TransactionCanceledException") throw new HttpError(409, "Data changed; reload before saving"); throw error; }
  return { success: true };
}
