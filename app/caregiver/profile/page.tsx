"use client";
import Link from "next/link";
import { ArrowUpRight, LogOut, HeartPulse, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileIdentity } from "@/components/health/health-passport";
import { HealthCharm } from "@/components/mobile/health-charm";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
export default function CaregiverProfilePage(){
 const {logout,user}=useAuth();const {db}=useMockStore();const caregiver=db.caregivers.find(c=>c.email===user?.email)||db.caregivers[0];const patient=db.patients.find(p=>p.id===caregiver.patientId)||db.patients[0];
 const items=[{icon:HeartPulse,title:"คนที่คุณดูแล",detail:patient.name,href:"/caregiver/patients"},{icon:Sparkles,title:"ผู้ช่วยสุขภาพ",detail:"มีคำถาม คุยกันได้",href:"/caregiver/ai"}];
 return <MobileShell role="caregiver" title="โปรไฟล์"><ProfileIdentity name={caregiver.name} detail={`${caregiver.relationship} ของ ${patient.name}`} label="ผู้ดูแล"/>
  <Link href="/caregiver/burnout" className="relative flex min-h-[154px] items-center overflow-hidden rounded-[30px_30px_40px_24px] bg-[#e3f2ea] p-5"><div className="relative z-10 max-w-[65%]"><p className="text-xl font-bold leading-8 text-emerald-900">ดูแลเขาแล้ว<br/>อย่าลืมดูแลใจเรา</p><p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">พักใจสักนิด<ArrowUpRight className="h-3.5 w-3.5"/></p></div><HealthCharm mood="rest" className="mobile-float absolute -right-3 bottom-0 h-32 w-32"/></Link>
  <ul className="divide-y divide-slate-200/60">{items.map(({icon:Icon,title,detail,href})=><li key={href}><Link href={href} className="flex items-center gap-3 py-5"><Icon className="h-5 w-5 shrink-0 text-sky-600"/><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400"/></Link></li>)}</ul>
  <Button variant="ghost" className="min-h-12 w-full gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={logout}><LogOut className="h-4 w-4"/>ออกจากระบบ</Button>
 </MobileShell>;
}
