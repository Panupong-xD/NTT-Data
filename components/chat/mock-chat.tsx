"use client";

import { useState, useEffect } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/lib/types";
import { askAI } from "@/lib/services/ai/client";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

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
  const [messages, setMessages] = useState(seedMessages);
  const [value, setValue] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send() {
    if (!value.trim()) return;
    const now = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    const userQuestion = value;
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: "user", content: userQuestion, time: now }]);
    setValue("");
    setThinking(true);

    try {
      const answer = await askAI(
        [
          "=== System Instructions ===",
          "คุณคือผู้ช่วย AI ส่วนตัวด้านสุขภาพ ตอบคำถามของผู้ใช้โดยตรงอย่างสุภาพและเข้าอกเข้าใจ",
          "หากผู้ใช้ส่งข้อความทักทายทั่วไป (เช่น สวัสดี, หวัดดี, ทักทาย, hello, hi) ให้ตอบทักทายกลับสั้นๆ อย่างเป็นมิตรและถามว่ามีอะไรให้ช่วยเหลือในวันนี้ โดยยังไม่ต้องแสดงการประเมินวิเคราะห์ค่าสุขภาพทั้งหมด ยกเว้นว่าผู้ใช้จะถามหาหรือเจาะจงเรื่องเหล่านั้นโดยตรง",
          "รูปแบบการตอบ: กระชับ มีการขึ้นบรรทัดใหม่ (Newlines) แบ่งย่อหน้าสั้นๆ หรือใช้หัวข้อย่อย (Bullet points) เพื่อให้อ่านง่าย สบายตา ห้ามเขียนเป็นเรียงความยาวเรียบๆ เด็ดขาด",
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
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", content: answer, time: now }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
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
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sky-100 bg-white/92 p-5 shadow-card backdrop-blur-sm">
      <header className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-sky-600" />
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
      </header>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1 thin-scrollbar">
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[82%] rounded-2xl bg-sky-600 px-4 py-3 text-sm leading-6 text-white"
                  : "max-w-[86%] rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700"
              }
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
              <p className="mt-1 text-[11px] opacity-70">{message.time}</p>
            </div>
          </div>
        ))}
        {thinking ? (
          <div className="flex justify-start">
            <div className="flex max-w-[86%] items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI กำลังคิดคำตอบ...
            </div>
          </div>
        ) : null}
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
          placeholder="พิมพ์คำถาม..."
        />
        <Button type="submit" size="icon" disabled={thinking} aria-label="ส่งข้อความ">
          {thinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </section>
  );
}
