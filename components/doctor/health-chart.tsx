"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HealthRecord } from "@/lib/types";
import { EmptyState } from "@/components/doctor/ui";

const metrics = {
  pressure: { label: "ความดันโลหิต", unit: "mmHg", keys: ["systolic", "diastolic"], names: ["ตัวบน", "ตัวล่าง"], colors: ["#55aadd", "#9ecbbd"] },
  sugar: { label: "น้ำตาลในเลือด", unit: "mg/dL", keys: ["bloodSugar"], names: ["น้ำตาล"], colors: ["#8da4d5"] },
  pulse: { label: "ชีพจร", unit: "ครั้ง/นาที", keys: ["heartRate"], names: ["ชีพจร"], colors: ["#d1a08a"] },
  weight: { label: "น้ำหนัก", unit: "กก.", keys: ["weight"], names: ["น้ำหนัก"], colors: ["#65aebe"] },
  sleep: { label: "การนอน", unit: "ชั่วโมง", keys: ["sleepHours"], names: ["การนอน"], colors: ["#aba0d0"] },
  exercise: { label: "การออกกำลังกาย", unit: "นาที", keys: ["exerciseMinutes"], names: ["ออกกำลังกาย"], colors: ["#88bba4"] },
  water: { label: "ดื่มน้ำ", unit: "แก้ว", keys: ["waterGlasses"], names: ["ดื่มน้ำ"], colors: ["#78bdd7"] },
  food: { label: "คะแนนอาหาร", unit: "คะแนน", keys: ["foodScore"], names: ["อาหาร"], colors: ["#c3b482"] },
};
export function DoctorHealthChart({ records }: { records: HealthRecord[] }) {
  const [metric, setMetric] = useState<keyof typeof metrics>("pressure");
  const [range, setRange] = useState("14");
  const id = useId().replace(/:/g, "");
  const config = metrics[metric];
  const data = [...records].sort((a,b) => a.date.localeCompare(b.date)).slice(-Number(range)).map(r => ({ ...r, day: new Date(r.date).toLocaleDateString("th-TH", { timeZone:"Asia/Bangkok", day:"numeric", month:"short" }) }));
  if (!records.length) return <EmptyState title="ยังไม่มีบันทึกสำหรับกราฟ" detail="ข้อมูลจะแสดงเมื่อผู้ป่วยเริ่มบันทึกสุขภาพ" />;
  return <div><div className="doctor-chart-controls"><select value={metric} onChange={e => setMetric(e.target.value as keyof typeof metrics)} aria-label="เลือกค่าที่แสดงในกราฟ">{Object.entries(metrics).map(([key,m]) => <option key={key} value={key}>{m.label} ({m.unit})</option>)}</select><div className="doctor-chart-legend">{config.names.map((name,i) => <span key={name}><i style={{ background:config.colors[i] }} />{name}</span>)}</div><select aria-label="จำนวนบันทึกในกราฟ" value={range} onChange={e => setRange(e.target.value)}><option value="7">7 บันทึกล่าสุด</option><option value="14">14 บันทึกล่าสุด</option><option value="30">30 บันทึกล่าสุด</option></select></div>
    <div style={{ width:"100%", height:285 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top:10, right:12, left:-24, bottom:0 }}><defs>{config.colors.map((color,i) => <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.16} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid stroke="#eef3f7" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill:"#9aafbd", fontSize:11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill:"#9aafbd", fontSize:11 }} domain={["auto", "auto"]} /><Tooltip contentStyle={{ borderRadius:15, border:"1px solid #e8f0f5", boxShadow:"0 8px 25px #486d8114", fontSize:12, color:"#55748a" }} formatter={(value: number, name: string) => [`${value} ${config.unit}`, name]} />{config.keys.map((key,i) => <Area key={key} type="monotone" dataKey={key} name={config.names[i]} stroke={config.colors[i]} fill={`url(#${id}-${i})`} strokeWidth={2.5} activeDot={{ r:5, stroke:"white", strokeWidth:3 }} isAnimationActive={false} />)}</AreaChart></ResponsiveContainer></div><p className="text-[11px] text-slate-400 mt-4">แสดงค่าที่บันทึกจริง · {data.length} บันทึกล่าสุด</p></div>;
}
