import { createHash } from "node:crypto";
import { QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { docClient, getItem } from "./db.js";
import { authorizePatient, HttpError, id, type Identity } from "./security.js";

const DAY = 86400;
const nowSeconds = () => Math.floor(Date.now() / 1000);
export const thaiDay = (date = new Date()) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s);
const bounded = (max: number) => z.string().trim().min(1).max(max);
export const nutritionSchema = z.object({
  calories: z.number().min(0).max(10000).nullable(), protein: z.number().min(0).max(1000).nullable(),
  carbs: z.number().min(0).max(2000).nullable(), fat: z.number().min(0).max(1000).nullable(),
  sugar: z.number().min(0).max(1000).nullable(), sodium: z.number().min(0).max(50000).nullable()
}).strict();
export const mealSchema = z.object({
  id, patientId: id, eatenAt: z.string().max(40).datetime({ offset: true }),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: bounded(120), portion: bounded(100), nutrition: nutritionSchema,
  source: z.enum(["image-estimate", "self-report"])
}).strict();
export type Meal = z.infer<typeof mealSchema> & { day: string; version: number; createdAt: string; updatedAt: string; recordedBy: string; ttl: number };
const metrics = ["calories", "protein", "carbs", "fat", "sugar", "sodium"] as const;
export type DaySummary = { day: string; mealCount: number; totals: Record<string, number>; known: Record<string, number>; foods: Record<string, number>; version: number; ttl: number };
const table = () => process.env.DYNAMODB_TABLE;
const clean = (row: any) => { const { PK: _pk, SK: _sk, ...data } = row; return data; };
const alive = (row: any) => !row.ttl || row.ttl > nowSeconds();
const mealKey = (patientId: string, day: string, mealId: string) => ({ PK: `MEALS#${patientId}`, SK: `${day}#${mealId}` });
const headKey = (patientId: string) => ({ PK: `MEMORY#${patientId}`, SK: "HEAD" });
const guardVersion = (row: any) => row ? { ConditionExpression: "#v = :v", ExpressionAttributeNames: { "#v": "version" }, ExpressionAttributeValues: { ":v": row.version } } : { ConditionExpression: "attribute_not_exists(PK)" };
function doctorConsent(identity: Identity, patientId: string) {
  return identity.role === "doctor" ? [{ ConditionCheck: { TableName: table(), Key: { PK: `PATIENT#${patientId}`, SK: `CONSENT#${identity.entityId}` }, ConditionExpression: "#s = :s", ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":s": "approved" } } }] : [];
}
async function transact(items: any[]) {
  try { await docClient.send(new TransactWriteCommand({ TransactItems: items })); }
  catch (error) {
    if (["TransactionCanceledException", "ConditionalCheckFailedException"].includes((error as Error).name)) throw new HttpError(409, "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก");
    throw error;
  }
}
function touch(patientId: string) {
  return { Update: { TableName: table(), Key: headKey(patientId), UpdateExpression: "SET revision = if_not_exists(revision, :zero) + :one", ExpressionAttributeValues: { ":zero": 0, ":one": 1 } } };
}
export async function resolvePatient(identity: Identity, requested?: string) {
  const patientId = id.parse(requested || (identity.patientIds.length === 1 ? identity.patientIds[0] : undefined));
  await authorizePatient(identity, patientId);
  return patientId;
}

// Each query reads a bounded date range or page. Meals never enter /api/state.
async function dateRows(PK: string, start: string, end: string, limit: number, cursor?: Record<string, any>) {
  return docClient.send(new QueryCommand({ TableName: table(), KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end", ExpressionAttributeValues: { ":pk": PK, ":start": start, ":end": `${end}\uffff` }, ScanIndexForward: false, ConsistentRead: true, Limit: limit, ExclusiveStartKey: cursor }));
}
export async function listMeals(identity: Identity, query: Record<string, string | undefined> = {}) {
  const patientId = await resolvePatient(identity, query.patientId);
  const days = z.coerce.number().int().min(1).max(90).default(7).parse(query.days);
  const day = query.day ? dateKey.parse(query.day) : undefined;
  if (day && (day > thaiDay() || day < thaiDay(new Date(Date.now() - 89 * DAY * 1000)))) throw new HttpError(400, "เลือกวันใน 90 วันที่ผ่านมา");
  const end = day || thaiDay();
  const start = day || thaiDay(new Date(Date.now() - (days - 1) * DAY * 1000));
  let cursor;
  if (query.cursor) {
    if (query.cursor.length > 1000) throw new HttpError(400, "Invalid cursor");
    try { cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString()); } catch { throw new HttpError(400, "Invalid cursor"); }
    if (cursor.PK !== `MEALS#${patientId}` || typeof cursor.SK !== "string" || cursor.SK < start || cursor.SK > `${end}\uffff` || Object.keys(cursor).length !== 2) throw new HttpError(400, "Invalid cursor");
  }
  const result = await dateRows(`MEALS#${patientId}`, start, end, 30, cursor);
  await authorizePatient(identity, patientId);
  return { meals: (result.Items || []).filter(alive).map(clean).sort((a, b) => b.eatenAt.localeCompare(a.eatenAt)), nextCursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url") : null };
}
export function updateDay(before: DaySummary | undefined, day: string, removed?: Meal, added?: Meal): DaySummary {
  const result: DaySummary = before ? structuredClone(before) : { day, mealCount: 0, totals: Object.fromEntries(metrics.map(k => [k, 0])), known: Object.fromEntries(metrics.map(k => [k, 0])), foods: {}, version: 0, ttl: Math.floor(Date.parse(`${day}T17:00:00Z`) / 1000) + 365 * DAY };
  result.foods ||= {};
  for (const [meal, sign] of [[removed, -1], [added, 1]] as const) {
    if (!meal) continue;
    result.mealCount += sign;
    const foodName = meal.name.normalize("NFC").trim().toLowerCase();
    const oldCount = Object.hasOwn(result.foods, foodName) ? result.foods[foodName] : 0;
    const nextCount = Math.max(0, oldCount + sign);
    if (nextCount) Object.defineProperty(result.foods, foodName, { value: nextCount, enumerable: true, writable: true, configurable: true });
    else delete result.foods[foodName];
    for (const key of metrics) if (meal.nutrition[key] !== null) { result.totals[key] = Math.max(0, (result.totals[key] || 0) + sign * meal.nutrition[key]!); result.known[key] = Math.max(0, (result.known[key] || 0) + sign); }
  }
  if (result.mealCount < 0 || result.mealCount > 20) throw new HttpError(409, "บันทึกได้สูงสุด 20 มื้อต่อวัน หรือข้อมูลสรุปเปลี่ยนแล้ว");
  result.version++;
  return result;
}
const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), meal: mealSchema, expectedVersion: z.number().int().min(0) }).strict(),
  z.object({ action: z.literal("delete"), patientId: id, day: dateKey, id, expectedVersion: z.number().int().min(1) }).strict()
]);
export async function mutateMeal(identity: Identity, input: unknown) {
  if (identity.role !== "patient") throw new HttpError(403, "ผู้ป่วยเป็นผู้ยืนยันหรือแก้ไขมื้ออาหารของตนเอง");
  const body = mutationSchema.parse(input);
  const patientId = await resolvePatient(identity, body.action === "save" ? body.meal.patientId : body.patientId);
  const day = body.action === "save" ? thaiDay(new Date(body.meal.eatenAt)) : body.day;
  const mealId = body.action === "save" ? body.meal.id : body.id;
  const key = mealKey(patientId, day, mealId);
  const current = await getItem(key.PK, key.SK) as Meal | undefined;
  const age = Date.now() - Date.parse(`${day}T00:00:00+07:00`);
  if (age < -DAY * 1000 || age >= 90 * DAY * 1000 || current && !alive(current)) throw new HttpError(400, "แก้ไขได้เฉพาะมื้ออาหารใน 90 วันที่ผ่านมา");
  if ((current?.version || 0) !== body.expectedVersion) {
    // A retried initial confirmation returns the original record, never counts it twice.
    if (body.action === "save" && body.expectedVersion === 0 && current && JSON.stringify(mealSchema.strip().parse(current)) === JSON.stringify(body.meal)) return { meal: clean(current), duplicate: true };
    throw new HttpError(409, "มื้อนี้เปลี่ยนแล้ว กรุณาโหลดใหม่");
  }
  if (body.action === "delete" && !current) throw new HttpError(404, "ไม่พบมื้ออาหาร");
  if (body.action === "save" && Date.parse(body.meal.eatenAt) > Date.now() + 5 * 60000) throw new HttpError(400, "ยังบันทึกมื้อในอนาคตไม่ได้");
  const stamp = new Date().toISOString();
  const meal: Meal | undefined = body.action === "save" ? { ...body.meal, day, version: (current?.version || 0) + 1, recordedBy: identity.entityId, createdAt: current?.createdAt || stamp, updatedAt: stamp, ttl: Math.floor(Date.parse(`${day}T17:00:00Z`) / 1000) + 90 * DAY } : undefined;
  const daily = await getItem(`MEMORY#${patientId}`, `DAY#${day}`) as DaySummary | undefined;
  const summary = updateDay(daily, day, current, meal);
  await transact([
    meal ? { Put: { TableName: table(), Item: { ...key, ...meal }, ...guardVersion(current) } } : { Delete: { TableName: table(), Key: key, ...guardVersion(current) } },
    { Put: { TableName: table(), Item: { PK: `MEMORY#${patientId}`, SK: `DAY#${day}`, ...summary }, ...guardVersion(daily) } },
    touch(patientId)
  ]);
  return { meal: meal ? clean(meal) : null };
}

export const preferenceSchema = z.object({ patientId: id, notes: z.string().trim().max(500), expectedVersion: z.number().int().min(0) }).strict();
export async function savePreferences(identity: Identity, input: unknown) {
  const body = preferenceSchema.parse(input);
  const patientId = await resolvePatient(identity, body.patientId);
  if (identity.role !== "patient") throw new HttpError(403, "เฉพาะผู้ป่วยแก้ความชอบของตนเองได้");
  const key = { PK: `MEMORY#${patientId}`, SK: "PREFERENCES" };
  const current = await getItem(key.PK, key.SK);
  if ((current?.version || 0) !== body.expectedVersion) throw new HttpError(409, "ความจำเปลี่ยนแล้ว กรุณาโหลดใหม่");
  const preferences = { notes: body.notes, version: body.expectedVersion + 1, updatedAt: new Date().toISOString(), source: "patient-confirmed" };
  await transact([{ Put: { TableName: table(), Item: { ...key, ...preferences }, ...guardVersion(current) } }, touch(patientId)]);
  return { preferences };
}

async function prefixRows(PK: string, prefix: string, limit: number) {
  const result = await docClient.send(new QueryCommand({ TableName: table(), KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)", ExpressionAttributeValues: { ":pk": PK, ":prefix": prefix }, ScanIndexForward: false, ConsistentRead: true, Limit: limit }));
  // A partial list must never masquerade as a complete clinical record.
  if (result.LastEvaluatedKey) throw new HttpError(413, "มีข้อมูลมากเกินขอบเขต กรุณาติดต่อผู้ดูแลเพื่อแบ่งหน้าข้อมูล");
  return (result.Items || []).filter(alive);
}
export async function listCases(identity: Identity, requested?: string, activeOnly = false) {
  const patientId = await resolvePatient(identity, requested);
  const head = await getItem(`MEMORY#${patientId}`, "HEAD");
  const activeIds = head?.activeIds instanceof Set ? [...head.activeIds] : [];
  const active = await Promise.all(activeIds.slice(0, 20).map(caseId => getItem(`FOLLOWUP#${patientId}`, String(caseId))));
  const result = activeOnly ? { Items: [], LastEvaluatedKey: undefined } : await docClient.send(new QueryCommand({ TableName: table(), KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `FOLLOWUP#${patientId}` }, ScanIndexForward: false, ConsistentRead: true, Limit: 60 }));
  const rows = new Map([...active.filter(Boolean), ...(result.Items || [])].filter(row => row && alive(row)).map(row => [row!.id, clean(row)]));
  await authorizePatient(identity, patientId);
  return { cases: [...rows.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), truncated: Boolean(result.LastEvaluatedKey) };
}
export function summarizeFood(rows: DaySummary[], days: number, end = thaiDay()) {
  const since = thaiDay(new Date(Date.parse(`${end}T12:00:00+07:00`) - (days - 1) * DAY * 1000));
  const selected = rows.filter(row => row.day >= since && row.day <= end && alive(row));
  const foods = new Map<string, number>();
  for (const row of selected) for (const [name, count] of Object.entries(row.foods || {})) foods.set(name, (foods.get(name) || 0) + count);
  return { days, fromDate: since, toDate: end, recordedDays: selected.filter(d => d.mealCount > 0).length, recordedMeals: selected.reduce((n, d) => n + d.mealCount, 0),
    estimatedTotals: Object.fromEntries(metrics.map(k => [k, selected.some(d => (d.known[k] || 0) > 0) ? selected.reduce((n, d) => n + (d.totals[k] || 0), 0) : null])),
    mealsWithEstimate: Object.fromEntries(metrics.map(k => [k, selected.reduce((n, d) => n + (d.known[k] || 0), 0)])),
    topFoods: [...foods].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([name, count]) => ({ name, count })) };
}
export async function readFoodSummary(identity: Identity, patientId: string, days: number) {
  await resolvePatient(identity, patientId);
  const period = z.number().int().min(1).max(365).parse(days);
  const end = thaiDay();
  const start = thaiDay(new Date(Date.now() - (period - 1) * DAY * 1000));
  const rows: DaySummary[] = [];
  let cursor;
  for (let page = 0; page < 4; page++) {
    const result = await dateRows(`MEMORY#${patientId}`, `DAY#${start}`, `DAY#${end}`, 100, cursor);
    rows.push(...(result.Items || []) as DaySummary[]);
    cursor = result.LastEvaluatedKey;
    if (!cursor) { await authorizePatient(identity, patientId); return summarizeFood(rows, period, end); }
  }
  throw new HttpError(413, "ข้อมูลสรุปเกินขอบเขต กรุณาเลือกช่วงที่สั้นลง");
}
export async function patientContext(identity: Identity, requested?: string) {
  const patientId = await resolvePatient(identity, requested);
  const end = thaiDay();
  const start = thaiDay(new Date(Date.now() - 29 * DAY * 1000));
  const [patient, preferences, head, daily, plans, records, followups] = await Promise.all([
    getItem(`PATIENT#${patientId}`, "PROFILE"), getItem(`MEMORY#${patientId}`, "PREFERENCES"), getItem(`MEMORY#${patientId}`, "HEAD"),
    dateRows(`MEMORY#${patientId}`, `DAY#${start}`, `DAY#${end}`, 31),
    prefixRows(`PATIENT#${patientId}`, "PLAN#", 100), prefixRows(`PATIENT#${patientId}`, "RECORD#", 300), listCases(identity, patientId, true)
  ]);
  if (!patient) throw new HttpError(404, "Patient not found");
  const rows = (daily.Items || []).filter(row => alive(row) && row.day >= start && row.day <= end) as DaySummary[];
  const plan = plans.filter(p => p.status === "published" || p.status === "approved").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const recent = records.filter(r => r.confirmationStatus !== "rejected").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const activeCases = followups.cases.filter(c => c.status !== "resolved").slice(0, 5);
  const revision = createHash("sha256").update(JSON.stringify([end, head?.revision || 0, patient.version, preferences?.version, plan?.id, plan?.version, plan?.updatedAt, recent.map(r => [r.id, r.version])])).digest("hex").slice(0, 20);
  await authorizePatient(identity, patientId);
  return { patientId, revision, asOf: new Date().toISOString(),
    profile: { age: patient.age, diagnosis: patient.diagnosis, medications: patient.medications, allergies: patient.allergies },
    preferences: preferences ? { notes: preferences.notes, version: preferences.version, updatedAt: preferences.updatedAt } : { notes: "", version: 0 },
    plan: plan ? { id: plan.id, updatedAt: plan.updatedAt, summary: plan.summary, diet: plan.diet, medication: plan.medication, exercise: plan.exercise, measurement: plan.measurement, tasks: plan.tasks } : null,
    recentRecords: recent.map(r => ({ id: r.id, date: r.date, systolic: r.systolic, diastolic: r.diastolic, bloodSugar: r.bloodSugar, bloodSugarTiming: r.bloodSugarTiming, confirmationStatus: r.confirmationStatus, sleepHours: r.sleepHours, exerciseMinutes: r.exerciseMinutes, weight: r.weight, height: r.height, medicationTaken: r.medicationTaken, waterGlasses: r.waterGlasses })),
    food: { today: summarizeFood(rows, 1, end), week: summarizeFood(rows, 7, end), month: summarizeFood(rows, 30, end) },
    cases: activeCases.map(c => ({ id: c.id, title: c.title, status: c.status, updatedAt: c.updatedAt })),
    retention: { mealDays: 90, summaryDays: 365, chatDays: 30, storesImages: false }
  };
}

const createCaseSchema = z.object({ action: z.literal("create"), patientId: id, id, title: bounded(120), note: bounded(700) }).strict();
const updateCaseSchema = z.object({ action: z.literal("update"), patientId: id, id, expectedVersion: z.number().int().min(1), status: z.enum(["caregiver", "doctor", "following", "resolved"]), note: bounded(700) }).strict();
export const caseSchema = z.discriminatedUnion("action", [createCaseSchema, updateCaseSchema]);
export async function mutateCase(identity: Identity, input: unknown) {
  const body = caseSchema.parse(input);
  const patientId = await resolvePatient(identity, body.patientId);
  const key = { PK: `FOLLOWUP#${patientId}`, SK: body.id };
  const current = await getItem(key.PK, key.SK);
  const stamp = new Date().toISOString();
  if (body.action === "create") {
    if (identity.role === "doctor") throw new HttpError(403, "แพทย์พิจารณาเคสที่ส่งมา หรือเผยแพร่แผนในหน้าแผนดูแล");
    if (current) {
      if (current.createdBy === identity.entityId && current.title === body.title && current.notes?.[0]?.text === body.note) return { case: clean(current) };
      throw new HttpError(409, "Case already exists");
    }
  } else {
    if (!current || !alive(current)) throw new HttpError(404, "ไม่พบเคส");
    if (current.version !== body.expectedVersion || current.status === "resolved") throw new HttpError(409, "เคสเปลี่ยนหรือปิดแล้ว กรุณาโหลดใหม่");
    const allowed = identity.role === "patient" ? body.status === current.status || current.status === "following" && body.status === "resolved"
      : identity.role === "caregiver" ? ["caregiver", "following"].includes(current.status) && [current.status, "doctor", "resolved"].includes(body.status)
      : current.status === "doctor" && ["caregiver", "following"].includes(body.status);
    if (!allowed) throw new HttpError(403, "ไม่สามารถเปลี่ยนสถานะเคสในบทบาทนี้");
    if ((current.notes || []).length >= 20 && body.status !== "resolved" && !(identity.role === "doctor" && body.status === "following")) throw new HttpError(409, "เคสมีบันทึกครบขอบเขตแล้ว กรุณาสรุปในแผนดูแลและปิดเรื่องเมื่อเหมาะสม");
  }
  const status = body.action === "create" ? "caregiver" : body.status;
  let assignedDoctorId = current?.assignedDoctorId;
  if (status === "doctor") {
    const profile = await getItem(`PATIENT#${patientId}`, "PROFILE");
    assignedDoctorId = profile?.doctorId;
    if (!assignedDoctorId || (await getItem(`PATIENT#${patientId}`, `CONSENT#${assignedDoctorId}`))?.status !== "approved") throw new HttpError(409, "ผู้ป่วยต้องอนุญาตให้แพทย์เข้าถึงข้อมูลก่อนส่งเรื่อง");
  }
  if (identity.role === "doctor" && assignedDoctorId !== identity.entityId) throw new HttpError(403, "เคสนี้ส่งให้แพทย์อีกบัญชีพิจารณา");
  const row = { ...(current ? clean(current) : { id: body.id, patientId, title: (body as z.infer<typeof createCaseSchema>).title, createdBy: identity.entityId, createdAt: stamp }),
    status, assignedDoctorId, updatedAt: stamp, version: (current?.version || 0) + 1,
    notes: [...(current?.notes || []), { text: body.note, role: identity.role, recordedBy: identity.entityId, date: stamp }],
    ...(status === "resolved" ? { ttl: nowSeconds() + 30 * DAY } : {}) };
  const revision = touch(patientId);
  if (body.action === "create") {
    Object.assign(revision.Update, { UpdateExpression: "SET revision = if_not_exists(revision, :zero) + :one, activeCases = if_not_exists(activeCases, :zero) + :one ADD activeIds :ids", ConditionExpression: "attribute_not_exists(activeCases) OR activeCases < :max", ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":max": 20, ":ids": new Set([body.id]) } });
  } else if (status === "resolved") {
    Object.assign(revision.Update, { UpdateExpression: "SET revision = if_not_exists(revision, :zero) + :one, activeCases = activeCases - :one DELETE activeIds :ids", ConditionExpression: "activeCases >= :one", ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":ids": new Set([body.id]) } });
  }
  const routeConsent = status === "doctor" && identity.role !== "doctor" ? [{ ConditionCheck: { TableName: table(), Key: { PK: `PATIENT#${patientId}`, SK: `CONSENT#${assignedDoctorId}` }, ConditionExpression: "#s = :s", ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":s": "approved" } } }] : [];
  await transact([{ Put: { TableName: table(), Item: { ...key, ...row }, ...guardVersion(current) } }, revision, ...doctorConsent(identity, patientId), ...routeConsent]);
  return { case: row };
}
