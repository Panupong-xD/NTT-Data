import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function moduleUrl(name, replacements = {}) {
  let source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const status = moduleUrl("health-status");
const { evaluateEarlyWarning, syncHealthSummaries } = await import(moduleUrl("health-summary", { '"./health-status"': JSON.stringify(status) }));
const record = (overrides = {}) => ({
  id: "record-1", patientId: "P-0001", date: "2026-10-06T08:00:00+07:00",
  systolic: 120, diastolic: 75, bloodSugar: 110, bloodSugarTiming: "before-meal",
  weight: 60, height: 165, heartRate: 67, medicationTaken: true, sleepHours: 7, exerciseMinutes: 30,
  ...overrides
});
const database = (records) => ({
  patients: [{ id: "P-0001", name: "Patient", healthScore: 91 }, { id: "P-0002", healthScore: 92 }],
  healthRecords: records,
  earlyWarnings: [{ id: "old", patientId: "P-0001", score: 22 }, { id: "empty", patientId: "P-0002", score: 10 }],
  carePlans: [{ id: "plan", tasks: [{ id: "task", status: "completed" }] }],
  notifications: [{ id: "notification", read: true }], consents: [{ id: "consent", status: "approved" }]
});

test("elevated readings lower health below 90 and both summaries agree", () => {
  const normal = syncHealthSummaries(database([record()]));
  const bp = syncHealthSummaries(database([record({ systolic: 138, diastolic: 84 })]));
  const sugar = syncHealthSummaries(database([record({ bloodSugar: 144 })]));
  const both = syncHealthSummaries(database([record({ systolic: 138, diastolic: 84, bloodSugar: 144 })]));
  assert.equal(normal.patients[0].healthScore, 90);
  for (const db of [bp, sugar, both]) {
    assert.ok(db.patients[0].healthScore < 90);
    assert.equal(db.patients[0].healthScore + db.earlyWarnings[0].score, 100);
  }
  assert.ok(both.patients[0].healthScore < bp.patients[0].healthScore);
  assert.ok(both.patients[0].healthScore < sugar.patients[0].healthScore);
});

test("glucose meal timing affects scores; unknown timing does not invent a high status", () => {
  const after = evaluateEarlyWarning([record({ bloodSugar: 144, bloodSugarTiming: "after-meal" })], "P-0001");
  const before = evaluateEarlyWarning([record({ bloodSugar: 144 })], "P-0001");
  const unknown = evaluateEarlyWarning([record({ bloodSugar: 144, bloodSugarTiming: undefined })], "P-0001");
  assert.ok(before.score > after.score);
  assert.equal(after.score, unknown.score);
  assert.ok(!unknown.contributors.some(reason => reason.includes("น้ำตาลสูง")));
  const low = evaluateEarlyWarning([record({ bloodSugar: 65, bloodSugarTiming: undefined })], "P-0001");
  assert.ok(low.score > unknown.score);
});

test("sort by record date, use the latest timestamp, and do not fabricate single-record trends", () => {
  const earlier = record({ id: "earlier", date: "2026-10-04T08:00:00+07:00", systolic: 140 });
  const latest = record({ id: "latest", date: "2026-10-06T08:00:00+07:00" });
  assert.deepEqual(evaluateEarlyWarning([latest, earlier], "P-0001"), evaluateEarlyWarning([earlier, latest], "P-0001"));
  assert.equal(evaluateEarlyWarning([latest, earlier], "P-0001").createdAt, latest.date);
  const single = evaluateEarlyWarning([latest], "P-0001");
  assert.deepEqual(single.contributors, []);
  assert.ok(!single.reason.includes("แนวโน้ม"));
});

test("cached scores refresh without mutating vitals, consent, tasks or notifications", () => {
  const db = database([record({ systolic: 138, diastolic: 84, bloodSugar: 144, bloodSugarTiming: "after-meal" })]);
  const original = structuredClone(db);
  const next = syncHealthSummaries(db);
  assert.equal(next.patients[0].healthScore, 76);
  assert.deepEqual(db, original);
  for (const key of ["healthRecords", "carePlans", "notifications", "consents"]) assert.strictEqual(next[key], db[key]);
  assert.strictEqual(syncHealthSummaries(next), next);
});

test("new and deleted records immediately refresh both scores and empty history has no invented score", () => {
  const normal = record();
  const old = syncHealthSummaries(database([normal]));
  const elevated = record({ id: "new", date: "2026-10-07T08:00:00+07:00", systolic: 160, diastolic: 95, bloodSugar: 210 });
  const added = syncHealthSummaries({ ...old, healthRecords: [...old.healthRecords, elevated] });
  assert.ok(added.patients[0].healthScore < old.patients[0].healthScore);
  const removed = syncHealthSummaries({ ...added, healthRecords: [normal] });
  assert.equal(removed.patients[0].healthScore, old.patients[0].healthScore);
  const empty = syncHealthSummaries({ ...removed, healthRecords: [] });
  assert.ok(empty.patients.every(patient => patient.healthScore === null));
  assert.deepEqual(empty.earlyWarnings, []);
});

test("multiple contributing factors stay bounded and worsening BP does not improve score", () => {
  const records = Array.from({ length: 7 }, (_, i) => record({
    id: `record-${i}`, date: `2026-10-0${i + 1}T08:00:00+07:00`, systolic: 150 + i * 3,
    bloodSugar: 220, weight: 60 + i * 0.3, medicationTaken: false, sleepHours: 5, exerciseMinutes: 0
  }));
  const warning = evaluateEarlyWarning(records, "P-0001");
  assert.ok(warning.score >= 0 && warning.score <= 100);
  assert.equal(warning.level, "red");
  assert.ok(warning.contributors.length >= 5);
  const mild = evaluateEarlyWarning([record({ systolic: 138, diastolic: 84 })], "P-0001");
  const worse = evaluateEarlyWarning([record({ systolic: 160, diastolic: 95 })], "P-0001");
  assert.ok(worse.score >= mild.score);
});
