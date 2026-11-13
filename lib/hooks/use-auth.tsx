"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAwsMode } from "@/lib/runtime";
import { beginSignIn, currentCloudUser, cloudSignOut, accessToken } from "@/lib/services/cloud-auth";
import { AppUser, UserRole } from "@/lib/types";
import { getRoleFromEmail, loginWithEmail, logoutUser, readMockUser, resetPassword } from "@/lib/services/auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { seedFromTemplate } from "@/lib/services/mock-store";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  register: (email: string, password: string, name?: string, extra?: any) => Promise<AppUser>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => isAwsMode ? null : readMockUser());
  const router = useRouter();
  const [loading, setLoading] = useState(isAwsMode);
  useEffect(() => {
    if (!isAwsMode) return;
    let active = true;
    if (accessToken()) currentCloudUser().then(u => { if (active) setUser(u); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    const expired = () => { setUser(null); router.replace("/login/"); };
    window.addEventListener("wellync-auth-expired", expired);
    const timer = window.setInterval(() => { if (!accessToken()) setUser(null); }, 30000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("wellync-auth-expired", expired); };
  }, [router]);
  const { setDb } = useMockStore();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, _password) => {
        if (isAwsMode) { await beginSignIn(); throw new Error("กำลังไปหน้าเข้าสู่ระบบ"); }
        const { loadMockStore } = await import("@/lib/services/mock-store");
        const db = loadMockStore();
        const role = getRoleFromEmail(email);
        
        let nextUser: AppUser;
        if (role === "patient") {
          const patient = db.patients.find(p => p.email.toLowerCase() === email.toLowerCase());
          if (patient) {
            nextUser = {
              uid: patient.id,
              email,
              name: patient.name,
              role: "patient"
            };
          } else {
            nextUser = loginWithEmail(email);
          }
        } else if (role === "caregiver") {
          const caregiver = db.caregivers.find(c => c.email?.toLowerCase() === email.toLowerCase());
          if (caregiver) {
            nextUser = {
              uid: caregiver.id,
              email,
              name: caregiver.name,
              role: "caregiver"
            };
          } else {
            nextUser = loginWithEmail(email);
          }
        } else {
          const doctor = db.doctors.find(d => d.email?.toLowerCase() === email.toLowerCase());
          if (doctor) {
            nextUser = {
              uid: doctor.id,
              email,
              name: doctor.name,
              role: "doctor"
            };
          } else {
            nextUser = loginWithEmail(email);
          }
        }
        
        setUser(nextUser);
        localStorage.setItem("mock-auth-user", JSON.stringify(nextUser));
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("appt_popup_shown");
        }
        toast.success("เข้าสู่ระบบสำเร็จ");
        router.push(`/${nextUser.role}`);
        return nextUser;
      },
      register: async (email, password, name, extra) => {
        if (isAwsMode) throw new Error("กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างบัญชีและกำหนดสิทธิ์");
        const patientId = `HN-${Math.floor(100000 + Math.random() * 900000)}`;
        const role = extra?.role || "patient";
        
        const nextUser: AppUser = {
          uid: role === "patient" ? patientId : `USR-${Date.now()}`,
          email,
          name: name || "ผู้ใช้ใหม่",
          role
        };
        
        setUser(nextUser);
        localStorage.setItem("mock-auth-user", JSON.stringify(nextUser));
        
        if (role === "patient") {
          const newPatient = {
            id: patientId,
            citizenId: extra?.citizenId || "",
            name: name || "ผู้ใช้ใหม่",
            age: Number(extra?.age || 30),
            gender: extra?.gender || "ชาย",
            diagnosis: ["เบาหวานชนิดที่ 2", "ความดันโลหิตสูง"],
            allergies: [],
            medications: ["Metformin 500mg", "Amlodipine 5mg"],
            doctorId: "demo-doctor",
            caregiverId: "demo-caregiver",
            hospital: "โรงพยาบาลนวัตกรรมสุขภาพ",
            healthScore: null,
            email,
            dob: extra?.dob || "",
            weight: Number(extra?.weight || 70),
            height: Number(extra?.height || 170),
            phone: extra?.phone || "",
            occupation: extra?.occupation || "",
            address: extra?.address || "",
            pin: extra?.pin || ""
          };

          setDb((currentDb) => {
            const nextDb = seedFromTemplate({ ...currentDb, patients: [...currentDb.patients, newPatient] }, patientId, newPatient);
            return { ...nextDb, chatHistory: { ...nextDb.chatHistory, [patientId]: [{
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: `สวัสดีครับคุณ ${name} ยินดีต้อนรับสู่ระบบ WELLYNC ครับ ผมเป็น AI ประเมินประวัติสุขภาพส่วนตัวของคุณครับ มีเรื่องอะไรปรึกษาด้านสุขภาพเบาหวานและความดันวันนี้ไหมครับ?`,
              time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
            }] } };
          });
        }
        
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("appt_popup_shown");
        }
        toast.success("สร้างบัญชีสำเร็จ");
        router.push(`/${nextUser.role}`);
        return nextUser;
      },
      forgotPassword: async (email) => {
        if (isAwsMode) { await beginSignIn(); return; }
        resetPassword(email);
        toast.success("ส่งคำแนะนำรีเซ็ตรหัสผ่านแล้ว");
      },
      logout: async () => {
        if (isAwsMode) { cloudSignOut(); return; }
        logoutUser();
        setUser(null);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("appt_popup_shown");
        }
        // A fresh page clears the authenticated route and avoids overlapping guard redirects.
        window.location.assign("/login/");
      }
    }),
    [loading, router, user, setDb]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function useRoleGuard(role: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
    if (user && user.role !== role) router.push("/unauthorized");
  }, [loading, role, router, user]);

  return { user, loading, allowed: Boolean(user && user.role === role) };
}
