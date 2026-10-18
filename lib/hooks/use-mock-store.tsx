"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { isAwsMode } from "@/lib/runtime";
import { accessToken, cloudRequest } from "@/lib/services/cloud-auth";
import { emptyDatabase, stateOperations } from "@/lib/services/cloud-store";
import { MockDatabase } from "@/lib/types";
import { loadMockStore, persistMockStore } from "@/lib/services/mock-store";
import { syncAppointments } from "@/lib/appointments";
import { syncHealthSummaries } from "@/lib/health-summary";

interface MockStoreContextValue {
  db: MockDatabase;
  setDb: (updater: MockDatabase | ((db: MockDatabase) => MockDatabase)) => void;
  resetDb: () => void;
}

const MockStoreContext = createContext<MockStoreContextValue | null>(null);

function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [db, setDbState] = useState<MockDatabase>(() => loadMockStore());
  const setDb = useCallback((updater: MockDatabase | ((db: MockDatabase) => MockDatabase)) => {
    setDbState(current => syncHealthSummaries(syncAppointments(typeof updater === "function" ? updater(current) : updater)));
  }, []);

  useEffect(() => {
    const refresh = () => setDbState(current => syncAppointments(current));
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  useEffect(() => {
    persistMockStore(db);
  }, [db]);

  const value = useMemo<MockStoreContextValue>(
    () => ({
      db,
      setDb,
      resetDb: () => {
        localStorage.removeItem("wellync-mock-db");
        localStorage.removeItem("true-innovation-mock-db");
        setDbState(loadMockStore());
      }
    }),
    [db, setDb]
  );

  if (!mounted) return <main className="p-8 text-center">กำลังโหลดข้อมูลตัวอย่าง…</main>;
  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) throw new Error("useMockStore must be used within MockStoreProvider");
  return context;
}

function CloudStoreProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [db, setState] = useState<MockDatabase>(emptyDatabase);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const canonical = useRef<MockDatabase>(emptyDatabase());
  const drafts = useRef(new Map<string, MockDatabase["carePlans"][number]>());
  const publicRoute = ["/login", "/register", "/forgot-password", "/auth/callback", "/unauthorized", "/"].some(route => path.replace(/\/$/, "") === route.replace(/\/$/, ""));
  const reload = useCallback(async () => {
    const result = await cloudRequest<{ db: MockDatabase }>("/api/state");
    canonical.current = syncHealthSummaries(result.db);
    const merged = { ...canonical.current, carePlans: canonical.current.carePlans.map(p => drafts.current.get(p.id) || p) };
    for (const plan of drafts.current.values()) if (!merged.carePlans.some(p => p.id === plan.id)) merged.carePlans.push(plan);
    setState(merged); setLoaded(true); setError("");
  }, []);
  useEffect(() => {
    if (publicRoute) return;
    if (!accessToken()) { location.replace("/login/"); return; }
    void reload().catch(e => setError(e.message));
  }, [publicRoute, reload]);
  useEffect(() => {
    if (publicRoute || !loaded) return;
    const timer = window.setInterval(() => { if (!busy.current && document.visibilityState === "visible") void reload().catch(e => setError(e.message)); }, 30000);
    return () => clearInterval(timer);
  }, [loaded, publicRoute, reload]);
  const setDb = useCallback((updater: MockDatabase | ((db: MockDatabase) => MockDatabase)) => {
    if (busy.current) { toast.error("กรุณารอให้บันทึกครั้งก่อนเสร็จ"); return; }
    const next = typeof updater === "function" ? updater(structuredClone(db)) : updater;
    for (const plan of next.carePlans) if (plan.status === "draft") drafts.current.set(plan.id, plan);
    const operations = stateOperations(canonical.current, next).filter(op => !(op.collection === "carePlans" && (op.after as any)?.status === "draft"));
    const published = operations.filter(op => op.collection === "carePlans").map(op => (op.after as any)?.id);
    if (!operations.length) { setState(next); return; }
    busy.current = true; setSaving(true);
    void cloudRequest("/api/state", { method: "PUT", body: JSON.stringify({ operations }) })
      .then(async () => { for (const key of published) drafts.current.delete(key); await reload(); toast.success("บันทึกบน AWS แล้ว"); })
      .catch(async e => { toast.error(e.message); try { await reload(); } catch { setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง"); } })
      .finally(() => { busy.current = false; setSaving(false); });
  }, [db, reload]);
  const value = useMemo(() => ({ db, setDb, resetDb: () => { toast.error("โหมด AWS ไม่อนุญาตให้รีเซ็ตข้อมูลจากเบราว์เซอร์"); } }), [db, setDb]);
  if (isAwsMode && ["/register", "/forgot-password"].includes(path.replace(/\/$/, ""))) return <main className="p-8 text-center"><p>สร้างบัญชี: ติดต่อผู้ดูแลระบบ · รีเซ็ตรหัสผ่าน: ใช้หน้าเข้าสู่ระบบ Cognito</p><a className="underline" href="/login/">กลับไปเข้าสู่ระบบ</a></main>;
  if (!publicRoute && (!loaded || error)) return <main className="p-8 text-center"><p role="status">{error || "กำลังโหลดข้อมูลจาก AWS…"}</p>{error && <button className="m-4 underline" onClick={() => { void reload().catch(e => setError(e.message)); }}>ลองอีกครั้ง</button>}<a href="/login/" className="m-4 underline">เข้าสู่ระบบ</a></main>;
  return <MockStoreContext.Provider value={value}>{children}{saving && <div role="status" className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 text-sky-800">กำลังบันทึกบน AWS…</div>}</MockStoreContext.Provider>;
}
export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  return isAwsMode ? <CloudStoreProvider>{children}</CloudStoreProvider> : <DemoStoreProvider>{children}</DemoStoreProvider>;
}
