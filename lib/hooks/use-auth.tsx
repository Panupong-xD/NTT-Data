"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppUser, UserRole } from "@/lib/types";
import { getRoleFromEmail, loginWithEmail, logoutUser, readMockUser, registerWithEmail, resetPassword } from "@/lib/services/auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";

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
  const [user, setUser] = useState<AppUser | null>(() => readMockUser());
  const [loading] = useState(false);
  const router = useRouter();
  const { setDb } = useMockStore();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
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
            healthScore: 85,
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
            const templateId = currentDb.patients[0]?.id || "P-0001";
            
            // Clone health records
            const somchaiRecords = currentDb.healthRecords.filter(r => r.patientId === templateId);
            const clonedRecords = somchaiRecords.map((r, idx) => ({
              ...r,
              id: `${patientId}-R-${idx}-${Date.now()}`,
              patientId: patientId,
              weight: Number(extra?.weight || 70),
              height: Number(extra?.height || 170)
            }));

            // Clone care plan
            const somchaiCarePlan = currentDb.carePlans.find(cp => cp.patientId === templateId);
            const clonedCarePlan = somchaiCarePlan ? {
              ...somchaiCarePlan,
              id: `plan-${patientId}`,
              patientId: patientId,
              tasks: somchaiCarePlan.tasks.map((t, idx) => ({
                ...t,
                id: `task-${patientId}-${idx}`,
                status: "pending" as const,
                pendingConfirm: undefined
              }))
            } : {
              id: `plan-${patientId}`,
              patientId: patientId,
              doctorId: "demo-doctor",
              status: "approved",
              updatedAt: new Date().toISOString(),
              summary: "ควบคุมอาหารเค็มและน้ำตาลอย่างสม่ำเสมอ ออกกำลังกายเบาๆ",
              medication: ["Metformin 500mg (เช้า-เย็น หลังอาหาร)", "Amlodipine 5mg (เช้า หลังอาหาร)"],
              diet: ["ลดคาร์โบไฮเดรตเชิงเดี่ยว ชา กาแฟหวาน", "เน้นโปรตีนไขมันต่ำ ผักต้ม"],
              exercise: ["เดินเร็ว 30 นาทีต่อวัน", "สัปดาห์ละ 3-5 วัน"],
              measurement: ["วัดความดันทุกเช้าก่อนทานอาหาร", "เจาะระดับน้ำตาลสัปดาห์ละ 2 ครั้ง"],
              followUp: ["พบแพทย์เพื่อประเมินผลในอีก 2 เดือน"],
              lifestyle: ["นอนหลับพักผ่อนให้เพียงพอ 7-8 ชั่วโมง", "ดื่มน้ำสะอาดวันละ 8 แก้ว"],
              tasks: [
                {
                  id: `task-${patientId}-1`,
                  title: "ทานยา Metformin 500mg",
                  category: "medication" as const,
                  time: "08:00",
                  detail: "เช้า หลังอาหารทันที",
                  status: "pending" as const
                },
                {
                  id: `task-${patientId}-2`,
                  title: "วัดระดับความดันและชีพจร",
                  category: "measurement" as const,
                  time: "07:30",
                  detail: "วัดด้วยเครื่องวัดอัตโนมัติก่อนทานอาหาร",
                  status: "pending" as const
                }
              ]
            };

            // Clone early warning
            const somchaiWarning = currentDb.earlyWarnings.find(ew => ew.patientId === templateId);
            const clonedWarning = somchaiWarning ? {
              ...somchaiWarning,
              patientId: patientId
            } : {
              patientId: patientId,
              level: "normal" as const,
              message: "สัญญาณชีพอยู่ในเกณฑ์ปกติ",
              updatedAt: new Date().toISOString()
            };

            console.log("DEBUG REGISTRATION STATE:", {
              templateId,
              somchaiRecordsCount: somchaiRecords.length,
              clonedRecordsCount: clonedRecords.length,
              somchaiCarePlan: !!somchaiCarePlan,
              somchaiWarning: !!somchaiWarning
            });

            const nextDb = {
              ...currentDb,
              patients: [...currentDb.patients, newPatient],
              healthRecords: [...currentDb.healthRecords, ...clonedRecords],
              earlyWarnings: [...currentDb.earlyWarnings, clonedWarning],
              carePlans: [...currentDb.carePlans, clonedCarePlan]
            };

            nextDb.chatHistory[patientId] = [
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: `สวัสดีครับคุณ ${name} ยินดีต้อนรับสู่ระบบ WELLYNC ครับ ผมเป็น AI ประเมินประวัติสุขภาพส่วนตัวของคุณครับ มีเรื่องอะไรปรึกษาด้านสุขภาพเบาหวานและความดันวันนี้ไหมครับ?`,
                time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
              }
            ];

            return nextDb;
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
        resetPassword(email);
        toast.success("ส่งคำแนะนำรีเซ็ตรหัสผ่านแล้ว");
      },
      logout: async () => {
        logoutUser();
        setUser(null);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("appt_popup_shown");
        }
        router.push("/login");
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
