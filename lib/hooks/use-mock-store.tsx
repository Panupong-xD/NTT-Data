"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MockDatabase } from "@/lib/types";
import { loadMockStore, persistMockStore } from "@/lib/services/mock-store";

interface MockStoreContextValue {
  db: MockDatabase;
  setDb: (updater: MockDatabase | ((db: MockDatabase) => MockDatabase)) => void;
  resetDb: () => void;
}

const MockStoreContext = createContext<MockStoreContextValue | null>(null);

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDbState] = useState<MockDatabase>(() => loadMockStore());

  useEffect(() => {
    persistMockStore(db);
  }, [db]);

  const value = useMemo<MockStoreContextValue>(
    () => ({
      db,
      setDb: (updater) => {
        setDbState((current) => (typeof updater === "function" ? updater(current) : updater));
      },
      resetDb: () => {
        localStorage.removeItem("true-innovation-mock-db");
        setDbState(loadMockStore());
      }
    }),
    [db]
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) throw new Error("useMockStore must be used within MockStoreProvider");
  return context;
}
