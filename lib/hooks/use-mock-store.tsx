"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
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

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) throw new Error("useMockStore must be used within MockStoreProvider");
  return context;
}
