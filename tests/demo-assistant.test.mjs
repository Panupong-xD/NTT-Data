import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/services/ai/demo.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { demoAssistant, DEMO_NOTICE } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const { parseFoodAnalysis } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(readFileSync(new URL("../lib/food-analysis.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);

const record = (day, systolic, bloodSugar, status = "confirmed") => ({ id: `r-${day}`, patientId: "P-1", date: `2026-10-${String(day).padStart(2, "0")}T08:00:00+07:00`, systolic, diastolic: 80, bloodSugar, sleepHours: 7, exerciseMinutes: 20, confirmationStatus: status });
const db = {
  patients: [{ id: "P-1", diagnosis: ["เบาหวานชนิดที่ 2"], medications: ["Metformin 500mg"] }],
  healthRecords: [...Array.from({ length: 7 }, (_, i) => record(i + 1, 120, 110)), ...Array.from({ length: 7 }, (_, i) => record(i + 8, 140, 150)), record(20, 300, 600, "rejected")],
  carePlans: [{ id: "plan", patientId: "P-1", status: "published", updatedAt: "2026-10-10T00:00:00Z", diet: ["ลดเค็ม"], exercise: [], measurement: ["วัดความดันทุกเช้า"], tasks: [{ id: "t", title: "กินยา", time: "08:00", status: "pending" }] }]
};

test("emergency text gets the safety message before anything else", () => {
  const reply = demoAssistant(db, "แน่นหน้าอกมาก", { patientId: "P-1" });
  assert.match(reply.text, /ห้องฉุกเฉิน/);
  assert.equal(reply.contextSource, undefined);
});

test("blood pressure answer uses the latest 7 records, ignores rejected ones and labels the demo", () => {
  const reply = demoAssistant(db, "ความดันช่วงนี้เป็นยังไง", { patientId: "P-1" });
  assert.match(reply.text, /140\/80 mmHg \(สูงขึ้นจากช่วงก่อน\)/);
  assert.doesNotMatch(reply.text, /300/);
  assert.equal(reply.contextSource.sources[0].detail, DEMO_NOTICE);
  assert.equal(reply.execution.modelCalls, 0);
});

test("unknown questions fall back to today's pending tasks", () => {
  assert.match(demoAssistant(db, "สวัสดี", { patientId: "P-1" }).text, /08:00 กินยา/);
});

test("doctor care-plan request returns a reviewable draft that never adjusts medication", () => {
  const reply = demoAssistant(db, "ช่วยร่างแผนดูแลที่บ้านสำหรับแพทย์", { patientId: "P-1" });
  assert.equal(reply.actionDraft.type, "care-plan");
  assert.match(reply.actionDraft.summary, /ไม่เสนอปรับยา/);
});

test("food analysis output is accepted by the real parser", () => {
  const parsed = parseFoodAnalysis(demoAssistant(db, 'เมนูอาหาร: "ข้าวกะเพราไข่ดาว"', { purpose: "analysis" }).text);
  assert.equal(parsed.name, "ข้าวผัดกะเพราหมูสับไข่ดาว");
  assert.equal(parsed.sodium, "900 mg");
  assert.match(parsed.recommendation, /AI จำลอง/);
});

test("vitals analysis returns parseable JSON for the scan form", () => {
  const result = JSON.parse(demoAssistant(db, '"systolic": "number or null"', { purpose: "analysis" }).text);
  assert.equal(result.type, "blood_pressure");
  assert.ok(result.systolic > result.diastolic);
});
