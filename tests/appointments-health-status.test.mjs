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
const calendar = moduleUrl("mobile-calendar");
const { syncAppointments, upcomingAppointments } = await import(moduleUrl("appointments", { '"./mobile-calendar"': JSON.stringify(calendar) }));
const { glucoseStatus, bloodPressureStatus } = await import(moduleUrl("health-status"));
const now = new Date("2026-12-31T03:00:00Z");
function database(appointments) {
  return { carePlans: [{ patientId: "P-0001", appointments }], notifications: [] };
}
const appointment = { id: "visit", date: "2027-01-02", time: "09:30", title: "ติดตามผล", location: "โรงพยาบาล" };

test("cached prototype appointment rolls across years while custom appointments stay fixed", () => {
  const custom = { ...appointment, id: "custom", date: "2027-02-10" };
  const db = database([{ ...appointment, id: "P-0001-appointment-followup", date: "2026-07-16" }, custom]);
  const next = syncAppointments(db, now);
  assert.equal(next.carePlans[0].appointments[0].date, "2027-01-02");
  assert.equal(next.carePlans[0].appointments[0].prototypeOffsetDays, 2);
  assert.strictEqual(next.carePlans[0].appointments[1], custom);
  const followingDay = syncAppointments(next, new Date("2027-01-01T03:00:00Z"));
  assert.equal(followingDay.carePlans[0].appointments[0].date, "2027-01-03");
  assert.equal(followingDay.notifications.length, 2);
});

test("reminders reach both roles without duplicate entries or resetting read state", () => {
  const next = syncAppointments(database([appointment]), now);
  assert.deepEqual(next.notifications.map(n => n.userRole).sort(), ["caregiver", "patient"]);
  next.notifications[0].read = true;
  assert.strictEqual(syncAppointments(next, now), next);
  const refreshed = syncAppointments(next, new Date("2027-01-01T03:00:00Z"));
  assert.equal(refreshed.notifications.length, 2);
  assert.equal(refreshed.notifications[0].read, true);
  assert.equal(refreshed.notifications[0].title, "มีนัดพรุ่งนี้");
  assert.equal(refreshed.notifications[0].date, next.notifications[0].date);
});

test("remind within three days; skip expired appointments including earlier today", () => {
  assert.equal(syncAppointments(database([{ ...appointment, date: "2027-01-04" }]), now).notifications.length, 0);
  assert.equal(syncAppointments(database([{ ...appointment, date: "2027-01-03" }]), now).notifications.length, 2);
  assert.equal(upcomingAppointments([{ ...appointment, date: "2026-12-31" }], now).length, 0);
  assert.equal(upcomingAppointments([{ ...appointment, date: "2026-12-31", time: "11:00" }], now).length, 1);
  const old = syncAppointments(database([appointment]), now);
  assert.equal(syncAppointments(old, new Date("2027-01-02T03:00:00Z")).notifications.length, 0);
});

test("glucose interpretation uses meal timing; 144 is high before a meal but not after", () => {
  assert.equal(glucoseStatus(144, "before-meal").label, "น้ำตาลสูง");
  assert.equal(glucoseStatus(144, "after-meal").tone, "good");
  assert.equal(glucoseStatus(144).tone, "neutral");
  assert.equal(glucoseStatus(130, "before-meal").tone, "good");
  assert.equal(glucoseStatus(131, "before-meal").tone, "attention");
  assert.equal(glucoseStatus(179, "after-meal").tone, "good");
  assert.equal(glucoseStatus(180, "after-meal").tone, "attention");
  assert.equal(glucoseStatus(69).label, "น้ำตาลต่ำ");
  assert.equal(glucoseStatus(70, "before-meal").label, "ต่ำกว่าช่วงเป้าหมาย");
  assert.equal(glucoseStatus(80, "before-meal").tone, "good");
  assert.equal(glucoseStatus(0), undefined);
  assert.equal(glucoseStatus(NaN), undefined);
  assert.equal(glucoseStatus(undefined), undefined);
});

test("BP status flags either number crossing its target and ignores missing data", () => {
  assert.equal(bloodPressureStatus({ systolic: 138, diastolic: 84 }).tone, "attention");
  assert.equal(bloodPressureStatus({ systolic: 125, diastolic: 80 }).tone, "attention");
  assert.equal(bloodPressureStatus({ systolic: 129, diastolic: 79 }).tone, "neutral");
  assert.equal(bloodPressureStatus({ systolic: 0, diastolic: 0 }), undefined);
  assert.equal(bloodPressureStatus(undefined), undefined);
});
