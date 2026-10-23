"use client";
import { cloudRequest } from "./cloud-auth";
import type { FoodAnalysis } from "@/lib/food-analysis";

export type Nutrition = Record<"calories" | "protein" | "carbs" | "fat" | "sugar" | "sodium", number | null>;
export interface SavedMeal {
  id: string; patientId: string; eatenAt: string; day: string; name: string; portion: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  nutrition: Nutrition; source: "image-estimate" | "self-report"; version: number;
}
export interface FollowUp {
  id: string; patientId: string; title: string; status: "caregiver" | "doctor" | "following" | "resolved";
  version: number; createdAt: string; updatedAt: string;
  notes: { text: string; role: "patient" | "caregiver" | "doctor"; date: string }[];
}
export interface PatientContext {
  patientId: string; revision: string; asOf: string;
  preferences: { notes: string; version: number; updatedAt?: string };
  plan: { id: string; updatedAt: string; summary: string } | null;
  food: Record<"today" | "week" | "month", { days: number; recordedDays: number; recordedMeals: number; estimatedTotals: Record<string, number | null>; mealsWithEstimate: Record<string, number>; topFoods: { name: string; count: number }[] }>;
}
export type AssistantDraft = { type: "follow-up"; title: string; note: string } | { type: "preference"; notes: string; expectedVersion: number } | { type: "care-plan"; summary: string };
export interface ContextSource { asOf: string; revision: string; recordedMeals?: number; recordedDays?: number; planUpdatedAt?: string; hasPreferences?: boolean; stale?: boolean; sources?: { label: string; detail: string }[] }
export interface AgentExecution { modelCalls: number; toolCalls: number; durationMs: number; requiresConfirmation: boolean }
export interface AssistantReply { text: string; actionDraft?: AssistantDraft; contextSource?: ContextSource; trace?: { tool: string; status: string }[]; execution?: AgentExecution }
export function memoryChanged() { window.dispatchEvent(new Event("wellync-memory-updated")); }
export const getPatientContext = (patientId: string) => cloudRequest<PatientContext>(`/api/patient-context?patientId=${encodeURIComponent(patientId)}`);
export const getMeals = (patientId: string, cursor?: string) => cloudRequest<{ meals: SavedMeal[]; nextCursor: string | null }>(`/api/meals?patientId=${encodeURIComponent(patientId)}&days=90${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
export const getFollowUps = (patientId: string, activeOnly = false) => cloudRequest<{ cases: FollowUp[]; truncated: boolean }>(`/api/follow-ups?patientId=${encodeURIComponent(patientId)}${activeOnly ? "&activeOnly=true" : ""}`);
async function post<T>(path: string, body: unknown) {
  const result = await cloudRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
  memoryChanged(); return result;
}
export const saveMeal = (meal: Omit<SavedMeal, "day" | "version">, expectedVersion = 0) => post<{ meal: SavedMeal }>("/api/meals", { action: "save", meal, expectedVersion });
export const removeMeal = (meal: SavedMeal) => post("/api/meals", { action: "delete", patientId: meal.patientId, day: meal.day, id: meal.id, expectedVersion: meal.version });
export const savePatientPreferences = (patientId: string, notes: string, expectedVersion: number) => post("/api/preferences", { patientId, notes, expectedVersion });
export const createFollowUp = (patientId: string, title: string, note: string, requestId: string) => post("/api/follow-ups", { action: "create", patientId, id: requestId, title, note });
export const updateFollowUp = (item: FollowUp, status: FollowUp["status"], note: string) => post("/api/follow-ups", { action: "update", patientId: item.patientId, id: item.id, expectedVersion: item.version, status, note });
export function nutritionFromAnalysis(analysis: FoodAnalysis, factor: number | null): Nutrition {
  const output = {} as Nutrition;
  for (const key of ["calories", "protein", "carbs", "fat", "sugar", "sodium"] as const) {
    // Ranges, prose and unknown quantities must not silently become exact values.
    const match = analysis[key].match(/^\s*(\d+(?:\.\d+)?)\s*(kcal|g|mg)?\s*$/i);
    const unit = match?.[2]?.toLowerCase();
    if (!match || factor === null || key === "calories" && unit && unit !== "kcal" || key !== "calories" && unit === "kcal") { output[key] = null; continue; }
    const conversion = key === "sodium" && unit === "g" ? 1000 : key !== "sodium" && unit === "mg" ? 0.001 : 1;
    const value = Number(match[1]) * conversion * factor;
    const limits = { calories: 10000, protein: 1000, carbs: 2000, fat: 1000, sugar: 1000, sodium: 50000 };
    output[key] = Number.isFinite(value) && value <= limits[key] ? Math.round(value * 100) / 100 : null;
  }
  return output;
}
