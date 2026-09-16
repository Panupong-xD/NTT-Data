"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Sparkles, Edit2, Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { publishCarePlan } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export default function DoctorCarePlansPage() {
  const { db, setDb } = useMockStore();
  const [rewritingId, setRewritingId] = useState<string | null>(null);

  // Inline editing state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editMedication, setEditMedication] = useState("");
  const [editDiet, setEditDiet] = useState("");
  const [editExercise, setEditExercise] = useState("");

  // Create new plan state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(db.patients[0]?.id || "");
  const [newSummary, setNewSummary] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newDiet, setNewDiet] = useState("");
  const [newExercise, setNewExercise] = useState("");

  function startEdit(plan: typeof db.carePlans[0]) {
    setEditingPlanId(plan.id);
    setEditSummary(plan.summary);
    setEditMedication(plan.medication[0] || "");
    setEditDiet(plan.diet[0] || "");
    setEditExercise(plan.exercise[0] || "");
  }

  function saveEdit(planId: string) {
    if (!editSummary.trim()) {
      toast.error("กรุณาระบุรายละเอียดแผนดูแล");
      return;
    }
    setDb((current) => ({
      ...current,
      carePlans: current.carePlans.map((item) =>
        item.id === planId
          ? {
              ...item,
              summary: editSummary,
              medication: [editMedication],
              diet: [editDiet],
              exercise: [editExercise],
              status: "draft" as const
            }
          : item
      )
    }));
    toast.success("บันทึกการแก้ไขแผนการดูแลเรียบร้อยแล้ว");
    setEditingPlanId(null);
  }

  function handleCreatePlan() {
    if (!selectedPatientId || !newSummary.trim()) {
      toast.error("กรุณาเลือกผู้ป่วยและระบุรายละเอียดแผนดูแล");
      return;
    }

    const existingIndex = db.carePlans.findIndex((p) => p.patientId === selectedPatientId);
    const newPlanObject = {
      id: existingIndex >= 0 ? db.carePlans[existingIndex].id : `PLAN-${Date.now()}`,
      patientId: selectedPatientId,
      doctorId: db.doctors[0]?.id || "DOC-1",
      status: "draft" as const,
      updatedAt: new Date().toISOString(),
      summary: newSummary,
      medication: [newMedication],
      diet: [newDiet],
      exercise: [newExercise],
      measurement: ["วัดความดันเช้า-เย็น", "ตรวจระดับน้ำตาลก่อนอาหาร"],
      followUp: ["นัดพบแพทย์ทุก 3 เดือน"],
      lifestyle: ["ลดเค็ม ลดหวาน พักผ่อนให้เพียงพอ"],
      tasks: []
    };

    setDb((current) => {
      const nextPlans = [...current.carePlans];
      if (existingIndex >= 0) {
        nextPlans[existingIndex] = newPlanObject;
      } else {
        nextPlans.push(newPlanObject);
      }
      return {
        ...current,
        carePlans: nextPlans
      };
    });

    const patient = db.patients.find((p) => p.id === selectedPatientId);
    toast.success(`สร้างแผนการดูแลสำหรับ ${patient?.name || "ผู้ป่วย"} เรียบร้อยแล้ว`);
    setShowCreateForm(false);
    setNewSummary("");
    setNewMedication("");
    setNewDiet("");
    setNewExercise("");
  }

  async function handleRewrite(plan: typeof db.carePlans[0]) {
    const patient = db.patients.find((item) => item.id === plan.patientId)!;
    setRewritingId(plan.id);
    try {
      const answer = await askAI(
        [
          "ตอบเป็นภาษาไทยในรูปแบบแผนดูแลที่บ้านสำหรับแพทย์ สรุปสั้นๆ 1 ย่อหน้า ไม่เกิน 3 ประโยค",
          `ผู้ป่วย: ${patient.name}`,
          `ข้อมูลวินิจฉัยโรค: ${patient.diagnosis.join(", ")}`,
          `ยาปัจจุบัน: ${patient.medications.join(", ")}`,
          `ร่างเดิมของแผนการดูแล: ${plan.summary}`
        ].join("\n")
      );
      
      setDb((current) => ({
        ...current,
        carePlans: current.carePlans.map((item) =>
          item.id === plan.id ? { ...item, summary: answer, status: "draft" as const } : item
        )
      }));
      toast.success(`ปรับปรุงแผนดูแลของ ${patient.name} เรียบร้อยแล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เรียกใช้งาน AI ไม่สำเร็จ");
    } finally {
      setRewritingId(null);
    }
  }

  return (
    <DoctorShell title="Care Plans">
      <div className="space-y-6">
        {/* Create Plan Toggle Section */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
          <div>
            <h3 className="font-bold text-slate-800">จัดการแผนดูแลรักษาผู้ป่วยต่อเนื่อง</h3>
            <p className="text-xs text-slate-500">สร้างแผนโภชนาการ ยา และการออกกำลังกายให้ผู้ป่วยรายบุคคล</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md active:scale-[0.98] transition-all rounded-2xl flex items-center gap-2 border-none"
          >
            {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreateForm ? "ปิดฟอร์ม" : "เขียนแผนดูแลใหม่"}
          </Button>
        </div>

        {/* Create Plan Form Card */}
        {showCreateForm && (
          <Card className="border border-sky-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-sky-600" />
                กรอกรายละเอียดแผนดูแลใหม่ (New Custom Care Plan)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 pl-1">เลือกผู้ป่วย</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none"
                >
                  {db.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) · {p.diagnosis.join(", ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 pl-1">สรุปแผนการดูแลรักษา (Summary)</label>
                <Textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="เช่น ผู้ป่วยควรควบคุมปริมาณคาร์โบไฮเดรตในอาหารแต่ละมื้อ และรับประทานยาอย่างเคร่งครัด..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">การรับประทานยา (Medication)</label>
                  <Input 
                    value={newMedication} 
                    onChange={(e) => setNewMedication(e.target.value)} 
                    placeholder="เช่น ยา Metformin 500mg หลังอาหารเช้า-เย็น" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">การควบคุมอาหาร (Diet)</label>
                  <Input 
                    value={newDiet} 
                    onChange={(e) => setNewDiet(e.target.value)} 
                    placeholder="เช่น ทานคาร์โบไฮเดรตต่ำ เลี่ยงผลไม้รสหวานจัด" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">การออกกำลังกาย (Exercise)</label>
                  <Input 
                    value={newExercise} 
                    onChange={(e) => setNewExercise(e.target.value)} 
                    placeholder="เช่น เดินเร็ววันละ 30 นาที สัปดาห์ละ 5 วัน" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="rounded-2xl">
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleCreatePlan}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-750 text-white shadow-md active:scale-[0.98] border-none rounded-2xl"
                >
                  <Save className="h-4 w-4" /> สร้างและบันทึกแบบร่าง
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Care Plan Grid List */}
        <div className="grid gap-5 xl:grid-cols-2">
          {db.carePlans.slice(0, 12).map((plan) => {
            const patient = db.patients.find((item) => item.id === plan.patientId)!;
            const isRewriting = rewritingId === plan.id;
            const isEditing = editingPlanId === plan.id;

            return (
              <Card key={plan.id} className="border border-sky-50 shadow-sm flex flex-col justify-between">
                <div>
                  <CardHeader className="flex-row items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <ClipboardList className="h-5 w-5 text-sky-600" /> 
                        {patient?.name || "ผู้ป่วยนิรนาม"}
                      </CardTitle>
                      
                      {isEditing ? (
                        <div className="mt-2 space-y-1">
                          <label className="text-[11px] font-bold text-slate-400">รายละเอียดคำแนะนำ (Summary)</label>
                          <Textarea
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            className="text-sm mt-1"
                            rows={3}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                          <MarkdownRenderer content={plan.summary} />
                        </div>
                      )}
                    </div>
                    <Badge tone={plan.status === "published" ? "green" : "yellow"} className="shrink-0">
                      {plan.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Medication, Diet, Exercise Sections */}
                    {isEditing ? (
                      <div className="space-y-2 border-t pt-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">Medication</label>
                          <Input value={editMedication} onChange={(e) => setEditMedication(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">Diet</label>
                          <Input value={editDiet} onChange={(e) => setEditDiet(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500">Exercise</label>
                          <Input value={editExercise} onChange={(e) => setEditExercise(e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-sky-50/70 p-3 text-xs leading-5">
                          <b className="text-sky-800">Medication</b>
                          <br />
                          {plan.medication[0] || "ไม่มีข้อกำหนด"}
                        </div>
                        <div className="rounded-2xl bg-emerald-50/70 p-3 text-xs leading-5">
                          <b className="text-emerald-800">Diet</b>
                          <br />
                          {plan.diet[0] || "ไม่มีข้อกำหนด"}
                        </div>
                        <div className="rounded-2xl bg-orange-50/70 p-3 text-xs leading-5">
                          <b className="text-orange-850">Exercise</b>
                          <br />
                          {plan.exercise[0] || "ไม่มีข้อกำหนด"}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <CardContent className="pt-0 border-t border-slate-50 mt-4 flex gap-2 justify-between items-center py-4">
                  {isEditing ? (
                    <div className="flex gap-2 w-full justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingPlanId(null)} className="rounded-xl">
                        <X className="h-3.5 w-3.5" /> ยกเลิก
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => saveEdit(plan.id)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none rounded-xl"
                      >
                        <Save className="h-3.5 w-3.5" /> บันทึก
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        {/* Edit Button */}
                        <Button variant="outline" size="sm" onClick={() => startEdit(plan)} disabled={isRewriting} className="rounded-xl">
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        
                        {/* AI Rewrite Button */}
                        <Button variant="outline" size="sm" onClick={() => handleRewrite(plan)} disabled={isRewriting} className="rounded-xl">
                          {isRewriting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Rewriting...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Rewrite
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Publish Button */}
                      <Button 
                        size="sm" 
                        onClick={() => setDb((current) => publishCarePlan(current, plan))} 
                        disabled={isRewriting}
                        className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DoctorShell>
  );
}
