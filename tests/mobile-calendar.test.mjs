import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/mobile-calendar.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
});
const { addCalendarDays, bangkokDate, calendarMonthCells, shiftCalendarMonth } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("Thai today changes at Bangkok midnight, regardless of the device zone", () => {
  assert.equal(bangkokDate(new Date("2026-10-04T16:59:59Z")), "2026-10-04");
  assert.equal(bangkokDate(new Date("2026-10-04T17:00:00Z")), "2026-10-05");
});

test("week navigation crosses months and years without losing days", () => {
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCalendarDays("2026-01-01", -2), "2025-12-30");
});

test("month navigation crosses the year boundary", () => {
  assert.equal(shiftCalendarMonth("2026-12", 1), "2027-01");
  assert.equal(shiftCalendarMonth("2026-01", -1), "2025-12");
});

test("calendar includes leap day and aligns it with the correct weekday", () => {
  const cells = calendarMonthCells("2024-02");
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(cells[4], "2024-02-01");
  assert.equal(cells[32], "2024-02-29");
  assert.equal(calendarMonthCells("2100-02").filter(Boolean).length, 28);
});

test("month height supports four, five, and six rows", () => {
  assert.equal(calendarMonthCells("2026-02").length, 28);
  assert.equal(calendarMonthCells("2026-10").length, 35);
  assert.equal(calendarMonthCells("2026-08").length, 42);
});
