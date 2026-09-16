"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, ClipboardList, FileBarChart, LayoutDashboard, Settings, Siren, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Protected } from "@/components/auth/protected";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMockStore } from "@/lib/hooks/use-mock-store";

const nav = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/care-plans", label: "Care Plans", icon: ClipboardList },
  { href: "/doctor/reports", label: "Reports", icon: FileBarChart },
  { href: "/doctor/settings", label: "Settings", icon: Settings }
];

export function DoctorShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { db } = useMockStore();
  const hasIndicator = db.earlyWarnings.some((w) => w.level !== "green");
  
  return (
    <Protected role="doctor">
      <div className="flex min-h-screen bg-sky-50/70">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sky-100 bg-white/95 p-5 shadow-card backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-sky-600">WELLYNC</p>
                <h1 className="text-lg font-bold">Doctor Dashboard</h1>
              </div>
            </div>
            <nav className="space-y-2">
              {nav.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-sky-50",
                      active && "bg-sky-100 text-sky-700"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="border-t border-sky-50 pt-4 mt-auto">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-bold shadow-md shadow-sky-500/20 text-sm">
                นพ
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.name || "นพ. ภูมิภัทร รักษาดี"}</p>
                <p className="text-[11px] text-slate-500 truncate">แพทย์ผู้เชี่ยวชาญ</p>
              </div>
            </div>
            <Button
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg hover:shadow-red-500/25 active:scale-[0.98] transition-all duration-300 font-semibold border-none py-2.5 h-11"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </Button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-sky-100 bg-white/88 px-5 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-600">ระบบดูแลผู้ป่วยต่อเนื่อง</p>
                <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/doctor/alerts"
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {hasIndicator && (
                    <span className="absolute top-[9px] right-[9px] h-[11px] w-[11px] rounded-full bg-red-500" />
                  )}
                </Link>
                <button 
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 lg:hidden border-none"
                  onClick={logout}
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 shrink-0",
                      active && "bg-sky-100 text-sky-700"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <motion.main
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.08 }}
            className="space-y-6 p-5 lg:p-8"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </Protected>
  );
}
