"use client";

import { AppUser, UserRole } from "@/lib/types";

const demoUsers: Record<UserRole, AppUser> = {
  patient: { uid: "demo-patient", email: "patient@gmail.com", name: "สมชาย สุขใจ", role: "patient" },
  caregiver: { uid: "demo-caregiver", email: "caregiver@gmail.com", name: "วารี สุขใจ", role: "caregiver" },
  doctor: { uid: "demo-doctor", email: "doctor@gmail.com", name: "พญ. นฤมล ชีวะ", role: "doctor" }
};

export function getRoleFromEmail(email: string): UserRole {
  const normalized = email.toLowerCase();
  if (normalized === "doctor@gmail.com" || normalized.endsWith("@hospital.test")) return "doctor";
  if (normalized === "caregiver@gmail.com" || normalized.includes("caregiver")) return "caregiver";
  return "patient";
}

export function readMockUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("mock-auth-user");
  return raw ? (JSON.parse(raw) as AppUser) : null;
}

export function loginWithEmail(email: string): AppUser {
  const role = getRoleFromEmail(email);
  const user = { ...demoUsers[role], email };
  localStorage.setItem("mock-auth-user", JSON.stringify(user));
  return user;
}

export function registerWithEmail(email: string): AppUser {
  return loginWithEmail(email);
}

export function resetPassword(email: string) {
  localStorage.setItem("mock-reset-email", email);
}

export function logoutUser() {
  localStorage.removeItem("mock-auth-user");
}
