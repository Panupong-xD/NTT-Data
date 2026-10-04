"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bell, HeartPulse, Home, ListChecks, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Protected } from "@/components/auth/protected";
import { UserRole } from "@/lib/types";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { useAuth } from "@/lib/hooks/use-auth";

const navConfig = {
  patient: [
    { href: "/patient", label: "หน้าหลัก", icon: Home },
    { href: "/patient/health", label: "สุขภาพ", icon: HeartPulse },
    { href: "/patient/care-plan", label: "แผนดูแล", icon: ListChecks },
    { href: "/patient/profile", label: "โปรไฟล์", icon: UserRound }
  ],
  caregiver: [
    { href: "/caregiver", label: "หน้าหลัก", icon: Home },
    { href: "/caregiver/patients", label: "ผู้ป่วย", icon: UsersRound },
    { href: "/caregiver/care-plan", label: "แผนดูแล", icon: ListChecks },
    { href: "/caregiver/profile", label: "โปรไฟล์", icon: UserRound }
  ]
};

export function MobileShell({
  role,
  title,
  children
}: {
  role: Extract<UserRole, "patient" | "caregiver">;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const navItems = navConfig[role];
  const { db } = useMockStore();
  const { user } = useAuth();

  // Dynamic notification & alert badges
  let hasIndicator = false;
  if (role === "patient") {
    // Check for patient notifications that are unread, or consents waiting approval
    const patientObj = db.patients.find((p) => p.email === user?.email) || db.patients[0];
    const unreadNotifications = db.notifications.some((n) => n.userRole === "patient" && n.patientId === patientObj.id && !n.read);
    const waitingConsents = db.consents.some((c) => c.patientId === patientObj.id && c.status === "waiting");
    hasIndicator = unreadNotifications || waitingConsents;
  } else if (role === "caregiver") {
    const caregiverObj = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
    const patientObj = db.patients.find((item) => item.id === caregiverObj.patientId) || db.patients[0];
    
    // Check for caregiver notifications that are unread
    const unreadNotifications = db.notifications.some((n) => n.userRole === "caregiver" && n.patientId === patientObj.id && !n.read);
    
    // Check for health records pending confirmation
    const pendingRecords = db.healthRecords.some((r) => r.patientId === patientObj.id && r.confirmationStatus === "pending");
    
    // Check for care plan tasks pending caregiver confirmation
    const pendingTasks = db.carePlans.some((p) => 
      p.patientId === patientObj.id && 
      p.tasks.some((t) => t.pendingConfirm)
    );

    hasIndicator = unreadNotifications || pendingRecords || pendingTasks;
  }

  const isHome = pathname === `/${role}` || pathname === `/${role}/`;
  const isSubPage = ["/notifications", "/alerts", "/ai", "/burnout"].some(part => pathname.includes(part));
  return (
    <Protected role={role}>
      <div className="mobile-app mx-auto min-h-dvh w-full max-w-[440px]">
        <header className="mobile-header sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-2">
            {isSubPage && <Link href={`/${role}`} aria-label="กลับหน้าหลัก" className="mobile-icon-button -ml-2"><ArrowLeft className="h-5 w-5" /></Link>}
            {isHome ? <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-sky-700"><HeartPulse className="h-6 w-6" />wellync<span className="text-sky-400">.</span></h1> : <h1 className="text-xl font-bold text-slate-900">{title}</h1>}
          </div>
          <Link href={role === "patient" ? "/patient/notifications" : "/caregiver/alerts"} className="mobile-icon-button relative bg-white" aria-label={hasIndicator ? "การแจ้งเตือน มีรายการใหม่" : "การแจ้งเตือน"}>
            <Bell className="h-5 w-5" />
            {hasIndicator && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-white" />}
          </Link>
        </header>
        <motion.main key={pathname} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="mobile-main space-y-6 px-5 pb-28 pt-3">
          {children}
        </motion.main>
        <nav aria-label="เมนูหลัก" className="mobile-nav fixed bottom-0 left-1/2 z-40 grid w-full max-w-[440px] -translate-x-1/2 grid-cols-4 gap-1 px-3 pt-2">
          {navItems.map(item => {
            const active = pathname.replace(/\/$/, "") === item.href;
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[24px] text-xs font-medium transition-colors", active ? "text-sky-700" : "text-slate-500")}>
              {active && <motion.span layoutId={reduceMotion ? undefined : "mobile-navigation"} className="absolute inset-x-2 top-0 h-10 rounded-[45%_45%_40%_40%] bg-sky-100/70" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <Icon className="relative h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.7} /><span className="relative">{item.label}</span>
            </Link>;
          })}
        </nav>
      </div>
    </Protected>
  );
}
