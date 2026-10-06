"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthCharm } from "@/components/mobile/health-charm";
import { Input } from "@/components/ui/input";
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
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length > seedMessages.length || thinking) bottomRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [messages.length, seedMessages.length, thinking]);

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
      toast.success("รับข้อเสนอแนะแล้ว");
    } else {
      toast.info("ข้ามข้อเสนอแนะแล้ว");
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

    try {
      const answer = await askAI(`${context ? `บริบทสุขภาพ: ${context}\n` : ""}คำถาม: ${userQuestion}`);

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
            title: "บันทึกและติดตามตามคำแนะนำ",
            description: "เก็บบันทึกสุขภาพอย่างต่อเนื่อง เพื่อให้แพทย์เห็นแนวโน้ม",
            proposedBy: "Amazon Bedrock / GPT-5.6 Agent",
            confidence: 0.94,
            status: "pending",
            timestamp: now
          }
        : undefined;

      setMessages((current) => [
        ...current,
        { 
          id: assistantMsgId, 
          role: "assistant", 
          content: answer, 
          time: now,
          agentAction: generatedAction
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: assistantMsgId,
          role: "assistant",
          content:
            "ผู้ช่วยยังไม่พร้อม ลองถามใหม่อีกครั้งนะ",
          time: now
        }
      ]);
    } finally {
      setThinking(false);

    }
  }

  const prompts = mode === "patient" ? ["วันนี้ควรดูแลตัวเองยังไง?", "ช่วยวางแผนมื้ออาหาร"] : ["ช่วยจัดตารางดูแล", "เวลาฉันเหนื่อย ควรทำยังไง?"];
  return <section>
    <header className="relative mb-5 flex min-h-[130px] items-center overflow-hidden rounded-[30px_30px_40px_24px] bg-[#e9f3ff] p-5"><div className="relative z-10"><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-xs text-slate-500">อยากรู้เรื่องไหน ถามได้เลย</p></div><HealthCharm className="mobile-float absolute -right-3 -top-1 h-32 w-32 opacity-75"/></header>
    <div className="max-h-[440px] space-y-5 overflow-y-auto pb-3 pr-1 thin-scrollbar" aria-live="polite" aria-relevant="additions">
      {messages.map(message=><div key={message.id} className={message.role==="user"?"flex justify-end":"flex flex-col items-start"}>
        <div className={message.role==="user"?"max-w-[85%] rounded-[22px_22px_6px_22px] bg-sky-100 px-4 py-3 text-sm leading-7 text-sky-950":"w-full px-1 text-sm leading-7 text-slate-700"}>
          {message.role==="user"?<p className="whitespace-pre-wrap">{message.content}</p>:<MarkdownRenderer content={message.content}/>}
          {message.agentAction&&<details className="group mt-4 border-t border-slate-200/60 pt-1"><summary className="flex min-h-11 items-center justify-between text-xs font-semibold text-sky-700">ข้อเสนอแนะเพิ่มเติม<ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary><div className="pb-3"><p className="text-sm font-semibold">{message.agentAction.title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{message.agentAction.description}</p>{message.agentAction.status==="pending"?<div className="mt-3 flex gap-2"><Button size="sm" className="min-h-11 rounded-full" onClick={()=>handleActionDecision(message.id,message.agentAction!,"approved")}><CheckCircle2 className="h-4 w-4"/>รับข้อเสนอ</Button><Button size="sm" variant="ghost" className="min-h-11 rounded-full" onClick={()=>handleActionDecision(message.id,message.agentAction!,"rejected")}>ข้าม</Button></div>:<p className="mt-2 text-xs text-slate-500">{message.agentAction.status==="approved"?"รับข้อเสนอแล้ว":"ข้ามแล้ว"} · {message.agentAction.reviewedAt}</p>}</div></details>}
          <p className="mt-2 text-[10px] text-slate-400">{message.time}</p>
        </div>
      </div>)}
      {thinking&&<div role="status" className="flex items-center gap-2 px-1 text-sm text-sky-700"><span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:150ms]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:300ms]"/></span>กำลังคิดคำตอบ…</div>}
      <div ref={bottomRef}/>
    </div>
    {messages.length===seedMessages.length&&<div className="my-4 flex flex-wrap gap-2">{prompts.map(prompt=><button key={prompt} type="button" onClick={()=>setValue(prompt)} className="min-h-11 rounded-full bg-white px-3 text-xs text-sky-700">{prompt}</button>)}</div>}
    <form className="mt-4 flex gap-2 rounded-[22px] bg-white p-2" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor={`chat-${mode}`}>คำถามถึงผู้ช่วย</label><Input id={`chat-${mode}`} value={value} onChange={e=>setValue(e.target.value)} placeholder="อยากถามอะไรวันนี้?" disabled={thinking} className="min-w-0 flex-1 border-0 bg-transparent shadow-none"/><Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full" disabled={thinking||!value.trim()} aria-label="ส่งข้อความ">{thinking?<Loader2 className="h-5 w-5 animate-spin"/>:<Send className="h-5 w-5"/>}</Button></form>
  </section>;
}
