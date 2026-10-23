// Summarize manually timed, paired synthetic tasks; never fabricate study results.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function measure(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Record at least one timed task');
  const ids = new Set();
  for (const row of rows) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(row.taskId || '') || ids.has(row.taskId) || !['patient', 'caregiver', 'doctor'].includes(row.role) ||
      !Number.isFinite(row.baselineSeconds) || row.baselineSeconds <= 0 || !Number.isFinite(row.assistedSeconds) || row.assistedSeconds < 0 ||
      typeof row.completed !== 'boolean' || !['accepted', 'edited', 'rejected', 'not-applicable'].includes(row.review)) throw new Error('Invalid or duplicate paired task; use anonymous IDs and actual stopwatch times');
    ids.add(row.taskId);
  }
  const completed = rows.filter(row => row.completed);
  const baseline = completed.reduce((n, row) => n + row.baselineSeconds, 0), assisted = completed.reduce((n, row) => n + row.assistedSeconds, 0);
  return { recordedTasks: rows.length, completedTasks: completed.length, completionRate: completed.length / rows.length,
    completedTaskSeconds: { baseline, assisted, saved: baseline - assisted, reductionPercent: baseline ? (baseline - assisted) / baseline * 100 : null },
    review: Object.fromEntries(['accepted', 'edited', 'rejected', 'not-applicable'].map(value => [value, rows.filter(row => row.review === value).length])),
    scope: 'Manually timed paired synthetic tasks, including human review/confirmation. Not a clinical study; report sample size and failures alongside time savings.' };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { console.log(JSON.stringify(measure(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
