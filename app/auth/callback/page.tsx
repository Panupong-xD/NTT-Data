"use client";
import { useEffect, useRef, useState } from "react";
import { completeSignIn, currentCloudUser } from "@/lib/services/cloud-auth";
export default function CallbackPage() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try { await completeSignIn(); const user = await currentCloudUser(); location.replace(`/${user.role}/`); }
      catch (e) { setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ"); }
    })();
  }, []);
  return <main className="p-8 text-center"><p>{error || "กำลังตรวจสอบการเข้าสู่ระบบ…"}</p>{error && <a href="/login/" className="underline">กลับไปเข้าสู่ระบบ</a>}</main>;
}
