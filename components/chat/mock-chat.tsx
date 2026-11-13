"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthCharm } from "@/components/mobile/health-charm";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/lib/types";
import { askAssistant } from "@/lib/services/ai/client";
import { AssistantDraftCard } from "@/components/health/patient-memory";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { AgentEvidence } from "@/components/health/agent-evidence";
import { isAwsMode } from "@/lib/runtime";

export function MockChat({
  title,
  seedMessages,
  mode,
  patientId,
  context: _context
}: {
  title: string;
  seedMessages?: ChatMessage[] | null;
  mode: "patient" | "caregiver";
  patientId?: string;
  context?: string;
}) {
  const initialMessages = Array.isArray(seedMessages) ? seedMessages : [];
  const seedCount = initialMessages.length;
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length > seedCount || thinking) bottomRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [messages.length, seedCount, thinking]);
  useEffect(() => {
    const markStale = () => setMessages(current => current.map(m => m.contextSource ? { ...m, contextSource: { ...m.contextSource, stale: true } } : m));
    window.addEventListener("wellync-memory-updated", markStale);
    return () => window.removeEventListener("wellync-memory-updated", markStale);
  }, []);

  async function send() {
    if (thinking || !value.trim()) return;
    setError("");
    const now = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    const userQuestion = value;
    const userMsgId = `u-${Date.now()}`;
    const assistantMsgId = `a-${Date.now()}`;

    setMessages((current) => [...current, { id: userMsgId, role: "user", content: userQuestion, time: now }]);
    setValue("");
    setThinking(true);

    try {
      const answer = await askAssistant(userQuestion, undefined, { patientId });

      setMessages((current) => [
        ...current,
        { 
          id: assistantMsgId, 
          role: "assistant", 
          content: answer.text,
          actionDraft: answer.actionDraft,
          contextSource: answer.contextSource,
          trace: answer.trace,
          execution: answer.execution,
          time: now
        }
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "ผู้ช่วยยังไม่พร้อม กรุณาลองอีกครั้ง";
      setError(message.includes("AI is disabled") ? "ผู้ดูแลยังไม่ได้เปิดใช้งาน AI กรุณาติดต่อผู้ดูแลระบบ" : message);
    } finally {
      setThinking(false);

    }
  }

  const prompts = mode === "patient" ? ["วันนี้ควรดูแลตัวเองยังไง?", "ช่วยวางแผนมื้ออาหาร"] : ["ช่วยจัดตารางดูแล", "เวลาฉันเหนื่อย ควรทำยังไง?"];
  return <section>
    <header className="relative mb-5 flex min-h-[130px] items-center overflow-hidden rounded-[30px_30px_40px_24px] bg-[#e9f3ff] p-5"><div className="relative z-10"><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-xs text-slate-500">อยากรู้เรื่องไหน ถามได้เลย</p>{!isAwsMode && <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-900">โหมดสาธิต: AI จำลอง ไม่ใช่คำแนะนำทางการแพทย์</p>}</div><HealthCharm className="mobile-float absolute -right-3 -top-1 h-32 w-32 opacity-75"/></header>
    <div className="max-h-[440px] space-y-5 overflow-y-auto pb-3 pr-1 thin-scrollbar" aria-live="polite" aria-relevant="additions">
      {messages.map(message=><div key={message.id} className={message.role==="user"?"flex justify-end":"flex flex-col items-start"}>
        <div className={message.role==="user"?"max-w-[85%] rounded-[22px_22px_6px_22px] bg-sky-100 px-4 py-3 text-sm leading-7 text-sky-950":"w-full px-1 text-sm leading-7 text-slate-700"}>
          {message.role==="user"?<p className="whitespace-pre-wrap">{message.content}</p>:<MarkdownRenderer content={message.content}/>}
          <AgentEvidence reply={message} />
          {message.actionDraft && patientId && !message.contextSource?.stale && <AssistantDraftCard draft={message.actionDraft} patientId={patientId} />}
          <p className="mt-2 text-[10px] text-slate-400">{message.time}</p>
        </div>
      </div>)}
      {thinking&&<div role="status" className="flex items-center gap-2 px-1 text-sm text-sky-700"><span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:150ms]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:300ms]"/></span>กำลังคิดคำตอบ…</div>}
      <div ref={bottomRef}/>
    </div>
    {error && <p role="alert" className="my-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {messages.length===seedCount&&<div className="my-4 flex flex-wrap gap-2">{prompts.map(prompt=><button key={prompt} type="button" onClick={()=>setValue(prompt)} className="min-h-11 rounded-full bg-white px-3 text-xs text-sky-700">{prompt}</button>)}</div>}
    <form className="mt-4 flex gap-2 rounded-[22px] bg-white p-2" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor={`chat-${mode}`}>คำถามถึงผู้ช่วย</label><Input id={`chat-${mode}`} maxLength={3000} value={value} onChange={e=>setValue(e.target.value)} placeholder="อยากถามอะไรวันนี้?" disabled={thinking} className="min-w-0 flex-1 border-0 bg-transparent shadow-none"/><Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full" disabled={thinking||!value.trim()} aria-label="ส่งข้อความ">{thinking?<Loader2 className="h-5 w-5 animate-spin"/>:<Send className="h-5 w-5"/>}</Button></form>
  </section>;
}
