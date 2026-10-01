"use client";

import { useState } from "react";
import { 
  Bot, 
  Loader2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Workflow, 
  ShieldCheck, 
  Clock, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, AgentAction } from "@/lib/types";
import { askAI, submitAgentAction } from "@/lib/services/ai/client";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { toast } from "sonner";

export function MockChat({
  title,
  seedMessages,
  mode,
  context
}: {
  title: string;
  seedMessages: ChatMessage[];
  mode: "patient" | "caregiver";
  context?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [value, setValue] = useState("");
  const [thinking, setThinking] = useState(false);
  const [agentPlanningStep, setAgentPlanningStep] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  function toggleStep(id: string) {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleActionDecision(messageId: string, action: AgentAction, decision: "approved" | "rejected") {
    const reviewedAt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    
    // Update local message state
    setMessages((current) =>
      current.map((msg) => {
        if (msg.id === messageId && msg.agentAction) {
          return {
            ...msg,
            agentAction: {
              ...msg.agentAction,
              status: decision,
              reviewedAt
            }
          };
        }
        return msg;
      })
    );

    // Call API / Lambda backend for HITL Audit Log
    await submitAgentAction(action.id, decision);

    if (decision === "approved") {
      toast.success(`อนุมัติคำสั่ง "${action.title}" เรียบร้อยแล้ว`, {
        description: "ระบบได้นำแผนปฏิบัติการของ AI ไปปรับใช้ในตารางการดูแลแล้ว"
      });
    } else {
      toast.info(`ปฏิเสธคำสั่ง "${action.title}"`, {
        description: "ระบบยกเลิกคำสั่งตามการตัดสินใจของผู้ใช้งาน (Human-in-the-Loop)"
      });
    }
  }

  async function send() {
    if (!value.trim()) return;
    const now = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    const userQuestion = value;
    const userMsgId = `u-${Date.now()}`;
    const assistantMsgId = `a-${Date.now()}`;

    setMessages((current) => [...current, { id: userMsgId, role: "user", content: userQuestion, time: now }]);
    setValue("");
    setThinking(true);

    // Simulate Agentic Planning lifecycle
    setAgentPlanningStep("1. ตรวจสอบบริบทผู้ป่วยและสัญญาณชีพ (Perceiving Vitals)...");
    await new Promise((r) => setTimeout(r, 450));
    setAgentPlanningStep("2. วิเคราะห์แนวทางเวชปฏิบัติและวางแผนงาน (Planning Strategy)...");
    await new Promise((r) => setTimeout(r, 450));
    setAgentPlanningStep("3. ประมวลผลคำตอบพร้อมตรวจสอบความปลอดภัยทางคลินิก (Synthesizing)...");

    try {
      const answer = await askAI(
        [
          "=== System Instructions ===",
          "คุณคือผู้ช่วย AI ส่วนตัวด้านสุขภาพ (Agentic Healthcare Assistant)",
          "ตอบคำถามของผู้ใช้โดยตรงอย่างสุภาพ ชัดเจน และเข้าอกเข้าใจ",
          "หากผู้ใช้ส่งข้อความทักทายทั่วไป ให้ตอบทักทายกลับสั้นๆ อย่างเป็นมิตรและถามว่ามีอะไรให้ช่วยเหลือในวันนี้",
          "รูปแบบการตอบ: กระชับ มีการขึ้นบรรทัดใหม่ แบ่งย่อหน้าสั้นๆ หรือใช้หัวข้อย่อย (Bullet points)",
          mode === "patient"
            ? "บทบาท: ผู้ช่วยดูแลสุขภาพผู้ป่วย (อ้างอิง diagnosis, medication, care plan, blood pressure, blood sugar, exercise, diet, appointments)"
            : "บทบาท: ผู้ช่วยส่วนตัวของผู้ดูแลคนไข้ (อ้างอิง diagnosis, care plan, medication, measurements, doctor notes, burnout support)",
          "",
          "=== User Profile & Vitals Context ===",
          context || "ไม่มีข้อมูลบริบทเพิ่มเติม",
          "",
          "=== User Message ===",
          userQuestion
        ]
          .filter(Boolean)
          .join("\n")
      );

      // Check if action proposal should be synthesized for Human-in-the-Loop criteria
      const isActionOriented = 
        userQuestion.includes("ยา") || 
        userQuestion.includes("อาหาร") || 
        userQuestion.includes("ความดัน") || 
        userQuestion.includes("น้ำตาล") || 
        userQuestion.includes("แผน") ||
        userQuestion.includes("ออกกำลัง");

      const generatedAction: AgentAction | undefined = isActionOriented
        ? {
            id: `act-${Date.now()}`,
            type: "care-plan-update",
            title: mode === "patient" ? "เพิ่มกิจกรรมดูแลสุขภาพลงใน Checklist ประจำวัน" : "ส่งการแจ้งเตือนและปรับเกณฑ์เฝ้าระวังผู้ป่วย",
            description: `AI ขอเสนอแนะให้เพิ่มมาตรการ: บันทึกค่าวัดและติดตามผลตามคำแนะนำข้างต้น เพื่อให้แพทย์ประเมินผลได้แม่นยำ`,
            proposedBy: "Amazon Bedrock / GPT-5.6 Agent",
            confidence: 0.94,
            status: "pending",
            timestamp: now
          }
        : undefined;

      const steps = [
        "รับข้อมูลและระบุหมวดหมู่คำถามจากผู้ใช้",
        "เปรียบเทียบค่าความดัน/น้ำตาลกับเกณฑ์มาตรฐานสากล (AHA/ADA)",
        "สร้างคำแนะนำเฉพาะบุคคลและร่างข้อเสนอแนะที่ต้องการคำอนุมัติ (HITL)"
      ];

      setMessages((current) => [
        ...current,
        { 
          id: assistantMsgId, 
          role: "assistant", 
          content: answer, 
          time: now,
          planningSteps: steps,
          agentAction: generatedAction
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: assistantMsgId,
          role: "assistant",
          content:
            error instanceof Error
              ? `เรียกใช้งาน AI ไม่สำเร็จ: ${error.message}`
              : "เรียกใช้งาน AI ไม่สำเร็จ",
          time: now
        }
      ]);
    } finally {
      setThinking(false);
      setAgentPlanningStep(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-card backdrop-blur-sm">
      <header className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Agentic Core · Human-in-the-Loop Protected</p>
          </div>
        </div>
        <Badge tone="green" className="text-[10px] px-2 py-0.5">
          <ShieldCheck className="h-3 w-3 mr-1" />
          HITL Enabled
        </Badge>
      </header>

      <div className="max-h-96 space-y-3.5 overflow-y-auto pr-1 thin-scrollbar">
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[82%] rounded-2xl bg-sky-600 px-4 py-3 text-sm leading-6 text-white"
                  : "max-w-[90%] rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm leading-6 text-slate-700 space-y-2.5"
              }
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
              
              {/* Agent Planning Steps Accordion */}
              {message.planningSteps && message.planningSteps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/70 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleStep(message.id)}
                    className="flex items-center gap-1.5 text-sky-700 font-semibold hover:underline cursor-pointer"
                  >
                    <Workflow className="h-3.5 w-3.5" />
                    <span>ขั้นตอนการคิดของ Agent ({message.planningSteps.length} ขั้นตอน)</span>
                    {expandedSteps[message.id] ? (
                      <ChevronUp className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    )}
                  </button>
                  {expandedSteps[message.id] && (
                    <ul className="mt-2 space-y-1 pl-5 list-disc text-slate-600 text-[11px] bg-white/70 p-2 rounded-lg border border-slate-100">
                      {message.planningSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Human-in-the-Loop Action Proposal Card */}
              {message.agentAction && (
                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-bold text-sky-900">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      ข้อเสนอแนะที่รอการอนุมัติ (Human-in-the-Loop)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ความมั่นใจ {(message.agentAction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800">{message.agentAction.title}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{message.agentAction.description}</p>

                  <div className="pt-2 flex items-center gap-2">
                    {message.agentAction.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          className="h-7 text-xs font-bold px-3 gap-1 shadow-sm"
                          onClick={() => handleActionDecision(message.id, message.agentAction!, "approved")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          อนุมัติ (Approve)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-bold px-3 gap-1 text-slate-600 border-slate-300 hover:bg-slate-100"
                          onClick={() => handleActionDecision(message.id, message.agentAction!, "rejected")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          ปฏิเสธ (Reject)
                        </Button>
                      </>
                    ) : message.agentAction.status === "approved" ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-100/70 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        อนุมัติแล้วเมื่อ {message.agentAction.reviewedAt}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs bg-rose-100/70 px-2.5 py-1 rounded-md">
                        <XCircle className="h-3.5 w-3.5" />
                        ปฏิเสธแล้วเมื่อ {message.agentAction.reviewedAt}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-1 text-[10px] text-slate-400">{message.time}</p>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex flex-col items-start gap-1">
            <div className="flex max-w-[88%] items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800 border border-sky-100 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              <span>{agentPlanningStep || "AI กำลังคิดคำตอบ..."}</span>
            </div>
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="พิมพ์คำถาม หรือสั่งให้ AI วางแผนการดูแล..."
          disabled={thinking}
        />
        <Button type="submit" size="icon" disabled={thinking || !value.trim()} aria-label="ส่งข้อความ">
          {thinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </section>
  );
}
