"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { getApprovals, submitApprovalDecision } from "@/lib/services/ai/client";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";
import { ApprovalEntity } from "@/lib/types";
import { EmptyState, SectionHeading } from "@/components/doctor/ui";

export function ApprovalQueue({ onCount, compact = false }: { onCount?: (count: number) => void; compact?: boolean }) {
  const { db } = useMockStore();
  const [items, setItems] = useState<ApprovalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { const result = await getApprovals("ALL"); setItems(result); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const pending = items.filter(a => a.status === "PENDING");
  const reviewed = items.filter(a => a.status !== "PENDING");
  useEffect(() => { if (!loading && !failed) onCount?.(pending.length); }, [pending.length, onCount, loading, failed]);
  async function decide(item: ApprovalEntity, decision: "APPROVED" | "REJECTED") {
    setBusy(item.actionId);
    try {
      const response = await submitApprovalDecision(item.actionId, decision, db.doctors[0]?.id, undefined, item.patientId);
      setItems(current => current.map(a => a.actionId === item.actionId ? { ...a, status: decision, reviewedAt: new Date().toISOString(), reviewedBy: db.doctors[0]?.name } : a));
      toast.success(response?.local ? "บันทึกการพิจารณาในโหมดตัวอย่างแล้ว" : decision === "APPROVED" ? "อนุมัติข้อเสนอแล้ว" : "ปฏิเสธข้อเสนอแล้ว");
    } catch { toast.error("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setBusy(null); }
  }
  return <section className="doctor-panel" style={{ marginTop: compact ? 0 : 24 }}>
    <SectionHeading title="ข้อเสนอรอพิจารณา" detail="ตรวจสอบก่อนส่งต่อให้ผู้ป่วย"><button className="doc-button secondary small" disabled={loading || !!busy} onClick={load} aria-label="รีเฟรชข้อเสนอ"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></SectionHeading>
    {loading ? <div className="doctor-inline-error"><span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" />กำลังโหลดข้อเสนอ…</span></div> : failed ? <div className="doctor-inline-error"><div>ยังโหลดข้อเสนอไม่ได้<p>กรุณาลองอีกครั้ง</p></div><button className="doc-button secondary small" onClick={load}>ลองอีกครั้ง</button></div> : !pending.length ? <EmptyState title="ไม่มีข้อเสนอรอพิจารณา" detail="เมื่อมีข้อเสนอใหม่ จะแสดงไว้ที่นี่" /> : pending.map(item => <article className="doctor-approval-row" key={item.actionId}><div className="flex items-center gap-2 text-xs text-sky-600"><Sparkles size={14} /><span>{item.patientName}</span></div><h3>{item.title}</h3><p>{item.description}</p><details><summary>เหตุผลและสิ่งที่เสนอ</summary><p>{item.clinicalReason}</p><p className="mt-2">{item.suggestedAction}</p><p className="mt-3 text-xs">{item.patientId} · {formatThaiDate(item.createdAt)}</p></details><div className="doctor-approval-actions"><button className="doc-button small" disabled={!!busy} onClick={() => decide(item, "APPROVED")}>{busy === item.actionId ? <Loader2 className="animate-spin" size={14} /> : <Check size={15} />}อนุมัติ</button><button className="doc-button secondary small" disabled={!!busy} onClick={() => decide(item, "REJECTED")}><X size={14} />ปฏิเสธ</button></div></article>)}
    {reviewed.length > 0 && <details><summary>ประวัติการพิจารณา ({reviewed.length})</summary>{reviewed.map(a => <div className="doctor-approval-row" key={a.actionId}><p>{a.patientName} · {a.title}</p><div className="flex items-center justify-between mt-2 gap-3"><span className={`doctor-status status-${a.status === "APPROVED" ? "green" : "red"}`}>{a.status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}</span><small className="text-slate-400">{a.reviewedBy}{a.reviewedAt ? ` · ${formatThaiDate(a.reviewedAt)}` : ""}</small></div>{a.reviewNote && <p className="mt-2">{a.reviewNote}</p>}</div>)}</details>}
  </section>;
}
