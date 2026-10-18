import type { MockDatabase } from "@/lib/types";
export const emptyDatabase = (): MockDatabase => ({ patients: [], doctors: [], caregivers: [], healthRecords: [], carePlans: [], notifications: [], consents: [], earlyWarnings: [], chatHistory: {} });
const collections = ["patients", "healthRecords", "carePlans", "consents", "notifications", "caregivers"] as const;
export function stateOperations(before: MockDatabase, after: MockDatabase) {
  const operations = [];
  const normalize = (value: any, collection: string) => {
    if (!value) return null;
    const copy = JSON.parse(JSON.stringify(value));
    if (collection === "patients") delete copy.healthScore; // computed locally, not a persisted clinical input
    return copy;
  };
  for (const collection of collections) {
    const oldRows = new Map(before[collection].map(v => [v.id, v]));
    const newRows = new Map(after[collection].map(v => [v.id, v]));
    for (const key of new Set([...oldRows.keys(), ...newRows.keys()])) {
      const previous = oldRows.get(key) || null;
      const next = newRows.get(key) || null;
      if (JSON.stringify(normalize(previous, collection)) !== JSON.stringify(normalize(next, collection))) {
        // Keep the server's profile score stable; the browser calculates a display score.
        operations.push({ collection, before: previous, after: collection === "patients" && next ? { ...next, healthScore: (previous as any)?.healthScore ?? null } : next });
      }
    }
  }
  return operations;
}
