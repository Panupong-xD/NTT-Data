"use client";

import Link from "next/link";
import { motion, useReducedMotion, useSpring, useTransform, useVelocity } from "framer-motion";
import { useEffect } from "react";
import { Activity, Bell, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Search, Settings2, Users } from "lucide-react";
import { Protected } from "@/components/auth/protected";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { useAppNavigation } from "@/lib/hooks/use-app-navigation";

const nav = [
  { href: "/doctor", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/doctor/patients", label: "ผู้ป่วย", icon: Users },
  { href: "/doctor/care-plans", label: "แผนดูแล", icon: ClipboardList },
  { href: "/doctor/alerts", label: "การติดตาม", icon: Activity },
  { href: "/doctor/reports", label: "รายงาน", icon: FileBarChart },
  { href: "/doctor/settings", label: "ตั้งค่า", icon: Settings2 }
];

export function DoctorAppLayout({ children }: { children: React.ReactNode }) {
  const navigation = useAppNavigation(nav);
  const pathname = navigation.pathname;
  const { logout, user } = useAuth();
  const { db } = useMockStore();
  const activeIndex = Math.max(0, nav.findIndex(item => navigation.activePath === item.href));
  const reduced = useReducedMotion();
  const position = useSpring(activeIndex * 56, { stiffness: 220, damping: 29, mass: 1.1 });
  const velocity = useVelocity(position);
  const stretch = useTransform(velocity, v => 1 + Math.min(Math.abs(v) / 10000, .09));
  useEffect(() => { if (reduced) position.jump(activeIndex * 56); else position.set(activeIndex * 56); }, [activeIndex, position, reduced]);
  const urgent = db.earlyWarnings.filter(w => w.level === "red" || w.level === "orange").length;
  const doctor = db.doctors[0];
  const doctorName = doctor?.name || user?.name || "แพทย์";
  const initials = doctorName.startsWith("พญ") ? "พญ" : doctorName.startsWith("นพ") ? "นพ" : "MD";
  return <Protected role="doctor"><div className="doctor-app">
    <aside className="doctor-sidebar">
      <Link href="/doctor" className="doctor-brand" aria-label="Wellync หน้าภาพรวม"><span className="doctor-brand-mark"><Activity size={24} strokeWidth={2.5} /></span><span>Wellync<span className="doctor-brand-caption">พื้นที่ของแพทย์</span></span></Link>
      <span className="doctor-nav-caption">พื้นที่ทำงาน</span>
      <nav className="doctor-nav" aria-label="เมนูแพทย์">
        <motion.div aria-hidden="true" className="doctor-nav-indicator" style={{ y: position, scaleY: reduced ? 1 : stretch }} />
        {nav.map((item, i) => <Link key={item.href} href={item.href} prefetch={true} onClick={event => navigation.onClick(event, item.href)} onPointerEnter={() => navigation.prefetch(item.href)} onFocus={() => navigation.prefetch(item.href)} aria-current={pathname === item.href ? "page" : undefined} className={i === activeIndex ? "is-active" : ""} title={item.label}><item.icon size={20} strokeWidth={1.8} /><span>{item.label}</span>{item.href === "/doctor/alerts" && urgent > 0 && <span className="doctor-nav-count">{urgent}</span>}</Link>)}
      </nav>

      <div className="doctor-account"><span className="doctor-avatar">{initials}</span><div><b>{doctorName}</b><small>{doctor?.specialty || "แพทย์ผู้ดูแล"}</small></div><button onClick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={18} /></button></div>
    </aside>
    <div className="doctor-workspace">
      <header className="doctor-topbar"><div className="doctor-breadcrumb">พื้นที่ของแพทย์ <span>/</span> <b>{nav[activeIndex].label}</b></div><div className="doctor-topbar-actions"><Link className="doctor-search-shortcut" href="/doctor/patients"><Search size={17} /><span>ค้นหาผู้ป่วย</span></Link><Link href="/doctor/alerts" className="doctor-bell" aria-label={`การติดตาม${urgent ? ` ${urgent} รายที่ควรติดตาม` : ""}`}><Bell size={19} />{urgent > 0 && <i />}</Link><span className="doctor-topbar-avatar">{initials}</span></div></header>
      <div className="doctor-main">{navigation.pending && <span role="status" className="sr-only">กำลังเปิดหน้า…</span>}{children}</div>
    </div>
  </div></Protected>;
}

export function DoctorShell({ children, title, description, action }: { children: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.main initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38, ease: [.22, 1, .36, 1] }}>
    <div className="doctor-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>{children}
  </motion.main>;
}
